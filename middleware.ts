import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const asked = request.nextUrl.searchParams.get("layout");
  const chosen = asked === "a" || asked === "b" || asked === "c" ? asked : request.cookies.get("atm_layout")?.value || "";
  const layout = chosen === "a" || chosen === "b" || chosen === "c" ? chosen : "";
  const requestHeaders = new Headers(request.headers);
  if (layout) requestHeaders.set("x-atm-layout", layout);
  else requestHeaders.delete("x-atm-layout");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (asked === "off") response.cookies.set("atm_layout", "", { path: "/", maxAge: 0 });
  else if (asked === "a" || asked === "b" || asked === "c") {
    response.cookies.set("atm_layout", asked, { path: "/", sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding"],
};
