import type { Metadata } from "next";
import { BUSINESS } from "@/lib/business";

export const SITE = {
  name: "AI Time Machine",
  tagline: "Your AI team drafts. You decide.",
  url: "https://www.theaitimemachine.com",
  supportEmail: BUSINESS.supportEmail,
  legalName: BUSINESS.legalName,
  address: BUSINESS.address,
  founder: "Samay Vashsht",
  founderRole: "Founder",
} as const;

export const DEFAULT_OG = "/og.jpg";

export function siteUrl(path = "/") {
  if (!path || path === "/") return SITE.url;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageTitle(title: string) {
  return title.includes("AI Time Machine") ? title : `${title} · AI Time Machine`;
}

export type FooterLink = { href: string; label: string };
export type FooterColumn = { title: string; links: FooterLink[] };

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { href: "/55-ai-agents", label: "The 55-agent offer" },
      { href: "/agents", label: "Agents directory" },
      { href: "/pricing", label: "Pricing" },
      { href: "/integrations", label: "Integrations" },
      { href: "/security", label: "Security & trust" },
      { href: "/status", label: "System status" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/solutions", label: "All solutions" },
      { href: "/solutions/sales", label: "Sales" },
      { href: "/solutions/marketing", label: "Marketing" },
      { href: "/solutions/support", label: "Support" },
      { href: "/solutions/finance", label: "Finance" },
      { href: "/solutions/hr", label: "People & daily rhythm" },
      { href: "/solutions/ops", label: "Operations" },
      { href: "/use-cases", label: "Use cases" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/help", label: "Help centre" },
      { href: "/partners", label: "Partner program" },
      { href: "/creators", label: "Create with us" },
      { href: "/sitemap", label: "Sitemap" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
      { href: "/legal", label: "Legal" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/privacy-rights", label: "Privacy rights (DPDP & GDPR)" },
      { href: "/terms", label: "Terms" },
      { href: "/acceptable-use", label: "Acceptable use" },
      { href: "/refund-policy", label: "Refunds" },
      { href: "/shipping-policy", label: "Shipping & delivery" },
      { href: "/cookie-policy", label: "Cookies" },
      { href: "/disclaimer", label: "Disclaimer" },
    ],
  },
];

export const NAV_LINKS: FooterLink[] = [
  { href: "/agents", label: "Agents" },
  { href: "/solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    email: SITE.supportEmail,
    address: {
      "@type": "PostalAddress",
      streetAddress: "261 A Bhim Street, Vishwas Nagar",
      addressLocality: "Delhi",
      postalCode: "110032",
      addressCountry: "IN",
    },
    founder: { "@type": "Person", name: SITE.founder, jobTitle: SITE.founderRole },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE.supportEmail,
      availableLanguage: ["English", "Hindi"],
    },
    logo: siteUrl("/media-kit/logo-1080.png"),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: siteUrl(item.path),
    })),
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    author: { "@type": "Person", name: SITE.founder, jobTitle: SITE.founderRole },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      legalName: SITE.legalName,
      logo: { "@type": "ImageObject", url: siteUrl("/media-kit/logo-1080.png") },
    },
    image: input.image ? siteUrl(input.image) : siteUrl(DEFAULT_OG),
    mainEntityOfPage: siteUrl(input.path),
  };
}

export function pageMeta(title: string, description: string, path: string, image = DEFAULT_OG): Metadata {
  const full = pageTitle(title);
  const url = siteUrl(path);
  return {
    title: full,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: full,
      description,
      url,
      siteName: SITE.name,
      type: path.startsWith("/blog/") ? "article" : "website",
      images: [{ url: image, alt: title }],
    },
    twitter: { card: "summary_large_image", title: full, description, images: [image] },
  };
}
