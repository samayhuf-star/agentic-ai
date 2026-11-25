import { AdminShell } from "@/components/admin/console/AdminShell";
import { requireAdminPage } from "@/lib/admin/guard";
import "./admin.css";
import "../affiliates.css";

export const dynamic = "force-dynamic";

export default async function SupAdminLayout({ children }: { children: React.ReactNode }) {
  const { session, role } = await requireAdminPage();
  return (
    <div className="adm">
      <AdminShell email={session.email} role={role === "admin" ? "Admin" : "Staff (view only)"}>
        {children}
      </AdminShell>
    </div>
  );
}
