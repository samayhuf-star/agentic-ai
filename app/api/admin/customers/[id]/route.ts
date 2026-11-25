import { Prisma } from "@prisma/client";
import { json, readJson } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin/api";
import { audit } from "@/lib/admin/audit";
import * as v from "@/lib/admin/validate";
import { isAdminEmail, isStaffEmail } from "@/lib/config";
import { displayPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function privileged(email: string | null) {
  return Boolean(email && (isAdminEmail(email) || isStaffEmail(email)));
}

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const actor = gate.session.email;
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return json({ message: "That customer was not found." }, 404);
  const body = await readJson(request);
  const action = typeof body.action === "string" ? body.action : "update";
  try {
    if (action === "suspend") {
      if (privileged(user.email)) throw new v.InputError("Admin and staff accounts cannot be suspended here.");
      await prisma.$transaction([
        prisma.user.update({ where: { id }, data: { suspendedAt: new Date() } }),
        prisma.session.deleteMany({ where: { userId: id } }),
      ]);
      await audit(actor, "customer.suspend", "customer", id, `Suspended ${user.email || id}`);
      return json({ ok: true, message: "Suspended. They are signed out and cannot sign in." });
    }
    if (action === "activate") {
      await prisma.user.update({ where: { id }, data: { suspendedAt: null } });
      await audit(actor, "customer.activate", "customer", id, `Reactivated ${user.email || id}`);
      return json({ ok: true, message: "Active again." });
    }
    if (action === "signout") {
      const { count } = await prisma.session.deleteMany({ where: { userId: id } });
      await audit(actor, "customer.signout", "customer", id, `Signed out ${user.email || id} (${count} sessions)`);
      return json({ ok: true, message: `Signed out of ${count} session${count === 1 ? "" : "s"}.` });
    }
    if (action !== "update") throw new v.InputError("Unknown action.");

    const data: Prisma.UserUpdateInput = {};
    if ("email" in body) data.email = v.email(body.email, false);
    if ("phone" in body) {
      const raw = typeof body.phone === "string" ? body.phone.trim() : "";
      if (!(user.phone && raw === displayPhone(user.phone))) data.phone = v.phone(raw);
    }
    if ("name" in body) data.name = v.text(body.name, "Name", 80);
    if ("businessName" in body) data.businessName = v.text(body.businessName, "Business name", 120);
    if ("city" in body) data.city = v.text(body.city, "City", 60);
    if ("notes" in body) data.adminNotes = v.text(body.notes, "Notes", 2000);
    if ("compAccess" in body) data.compAccess = v.bool(body.compAccess);
    if ("marketingOptOut" in body) data.marketingOptOut = v.bool(body.marketingOptOut);
    if ("paused" in body) data.paused = v.bool(body.paused);
    if (typeof data.email === "string" && data.email !== user.email) {
      const taken = await prisma.user.findUnique({ where: { email: data.email } });
      if (taken && taken.id !== id) throw new v.InputError("That email is already used by another customer.");
    }
    if (typeof data.phone === "string" && data.phone !== user.phone) {
      const taken = await prisma.user.findUnique({ where: { phone: data.phone } });
      if (taken && taken.id !== id) throw new v.InputError("That mobile is already used by another customer.");
    }
    const emailChanged = "email" in data && data.email !== user.email;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      if (emailChanged) await tx.session.deleteMany({ where: { userId: id } });
    });
    const changed = Object.keys(data);
    await audit(actor, "customer.update", "customer", id, `Edited ${user.email || id}: ${changed.join(", ") || "nothing"}`, {
      before: Object.fromEntries(changed.map((key) => [key, (user as Record<string, unknown>)[key]])),
      after: data,
    });
    return json({ ok: true, message: emailChanged ? "Saved. The email changed, so old sign-ins were ended." : "Saved." });
  } catch (error) {
    if (error instanceof v.InputError) return json({ message: error.message }, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return json({ message: "That email or mobile is already used." }, 409);
    }
    console.error(error);
    return json({ message: "Could not save." }, 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const gate = await requireSuperAdmin(request);
  if (!gate.ok) return gate.response;
  const actor = gate.session.email;
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { payments: true, messages: true, approvals: true } } },
  });
  if (!user) return json({ message: "That customer was not found." }, 404);
  const body = await readJson(request);
  const expected = (user.email || user.id).toLowerCase();
  if (String(body.confirm || "").trim().toLowerCase() !== expected) {
    return json({ message: `Type ${user.email ? "the customer's email" : "the customer ID"} to confirm.` }, 400);
  }
  if (privileged(user.email)) return json({ message: "Admin and staff accounts cannot be deleted here." }, 400);
  if (user.id === gate.session.userId) return json({ message: "You cannot delete your own account." }, 400);
  await prisma.$transaction([
    prisma.lead.updateMany({ where: { userId: id }, data: { userId: null } }),
    prisma.user.delete({ where: { id } }),
  ]);
  await audit(actor, "customer.delete", "customer", id, `Deleted customer ${user.email || id}`, {
    email: user.email,
    phone: user.phone,
    name: user.name,
    businessName: user.businessName,
    counts: user._count,
    note: "Payments were kept and unlinked.",
  });
  return json({ ok: true, message: "Deleted. Their payment records were kept." });
}
