import { AdminNav } from "@/components/admin/console/AdminNav";
import { requireAdminPage } from "@/lib/admin/guard";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function SupAdminLayout({ children }: { children: React.ReactNode }) {
  const { session, role } = await requireAdminPage();
  return (
    <div className="adm">
      <AdminNav email={session.email} role={role === "admin" ? "Admin" : "Staff (view only)"} />
      {children}
    </div>
  );
}
