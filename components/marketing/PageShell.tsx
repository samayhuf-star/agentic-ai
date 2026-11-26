import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { JsonLd } from "@/components/marketing/JsonLd";
import { breadcrumbJsonLd } from "@/lib/site";

export function PageShell({
  children,
  offer = false,
  crumbs,
}: {
  children: React.ReactNode;
  offer?: boolean;
  crumbs?: { name: string; path: string }[];
}) {
  return (
    <>
      {crumbs && crumbs.length > 0 ? <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, ...crumbs])} /> : null}
      <SiteHeader offer={offer} />
      <main className="mk-page">
        <div className="wrap">
          {crumbs && crumbs.length > 0 ? (
            <nav className="mk-crumbs" aria-label="Breadcrumb">
              <Link href="/">Home</Link>
              {crumbs.map((crumb, index) => (
                <span key={crumb.path}>
                  <span aria-hidden="true"> / </span>
                  {index === crumbs.length - 1 ? <span>{crumb.name}</span> : <Link href={crumb.path}>{crumb.name}</Link>}
                </span>
              ))}
            </nav>
          ) : null}
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
