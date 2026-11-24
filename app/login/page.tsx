import { LoginForm } from "@/components/LoginForm";
import { LogoHeader } from "@/components/SiteChrome";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <>
      <LogoHeader />
      <LoginForm />
    </>
  );
}
