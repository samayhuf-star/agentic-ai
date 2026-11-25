import Link from "next/link";
import { rangeQuery, type StatsRange } from "@/lib/admin/range";

const links = [
  { href: "/sup-admin/stats", label: "Sales" },
  { href: "/sup-admin/stats/orders", label: "Orders" },
  { href: "/sup-admin/stats/customers", label: "Customers" },
  { href: "/sup-admin/stats/funnel", label: "Funnel" },
];

export function StatsBar({ range, path, status = "" }: { range: StatsRange; path: string; status?: string }) {
  return (
    <div className="stats-bar">
      <p className="row-actions chip-row">
        {links.map((link) => (
          <Link key={link.href} href={`${link.href}?${rangeQuery(range, link.href.endsWith("/orders") && status ? { status } : {})}`} className={path === link.href ? "on" : ""}>
            {link.label}
          </Link>
        ))}
        <Link href="/sup-admin">Overview</Link>
      </p>
      <form className="stats-filters" action={path} method="get">
        <div className="chip-row">
          {["today", "7d", "30d", "all"].map((key) => (
            <Link key={key} className={range.key === key ? "on" : ""} href={`${path}?${rangeQuery({ ...range, key: key as StatsRange["key"] }, status ? { status } : {})}`}>
              {key === "today" ? "Today" : key === "7d" ? "7d" : key === "30d" ? "30d" : "All"}
            </Link>
          ))}
        </div>
        <input type="hidden" name="range" value="custom" />
        <label>
          From
          <input type="date" name="from" defaultValue={range.fromInput} aria-label="From date" />
        </label>
        <label>
          To
          <input type="date" name="to" defaultValue={range.toInput} aria-label="To date" />
        </label>
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label className="check">
          <input type="checkbox" name="tests" value="1" defaultChecked={range.includeTest} />
          Include test orders
        </label>
        <button className="btn btn-g" type="submit">
          Apply
        </button>
        <Link href={`${path}?${rangeQuery({ ...range, includeTest: !range.includeTest }, status ? { status } : {})}`}>
          {range.includeTest ? "Showing live and test" : "Showing live only"}
        </Link>
      </form>
    </div>
  );
}
