import { AdminKicker } from "@/components/admin/AdminKicker";
import { AffiliateForm } from "@/components/affiliates/AffiliateForm";
import { BLOCKS } from "@/lib/affiliates/dashboard";
import { DEFAULT_RULE } from "@/lib/affiliates/input";
import { requireAdminPage } from "@/lib/admin/guard";

export const dynamic = "force-dynamic";

export default async function NewAffiliatePage() {
  const { readOnly } = await requireAdminPage();
  return (
    <main className="page">
      <AdminKicker kicker="Affiliates" readOnly={readOnly} />
      <h1>Add affiliate</h1>
      <AffiliateForm
        mode="create"
        readOnly={readOnly}
        blocks={[...BLOCKS]}
        initial={{
          name: "",
          email: "",
          phone: "",
          city: "",
          instagramUrl: "",
          tiktokUrl: "",
          followers: "",
          niche: "",
          handles: "",
          code: "",
          commissionType: DEFAULT_RULE.commissionType,
          rate: String(DEFAULT_RULE.rate),
          status: "active",
          payoutNotes: "",
          notes: "",
          hiddenBlocks: [],
        }}
      />
    </main>
  );
}
