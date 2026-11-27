import { Prisma } from "@prisma/client";
import { readStatsRange, type RangeKey } from "@/lib/admin/range";
import { istDayStart } from "@/lib/ist";
import { prisma } from "@/lib/prisma";

const OFFSET = 5.5 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const VISIT_PREFIX = "visit:";
const INAPP_VISIT_PREFIX = "inapp_browser_prompt:visit:";
const CAMPAIGN_PREFIX = "Campaign ";

/** Hits that mean a person is here. Mail, webhooks and admin audit rows are not presence. */
export const ACTIVE_TYPES = [
  "visit",
  "signup",
  "otp",
  "login",
  "checkout",
  "pay_again",
  "inapp_browser_prompt",
  "cashfree.attempt",
  "payment.paid",
  "payment.failed",
  "cta_click",
  "form_start",
  "form_step",
  "checkout.return",
  "clarity.session",
  "recovery_link_clicked",
  "agent",
] as const;

export type LiveBucket = "hour" | "day";

export type LiveRange = {
  key: RangeKey;
  from: Date;
  to: Date;
  fromInput: string;
  toInput: string;
  includeTagged: boolean;
  bucket: LiveBucket;
};

export type RankRow = { label: string; pageViews: number; visitors: number };
export type CountRow = { label: string; events: number };
export type CityRow = { label: string; people: number };
export type SeriesPoint = { bucket: string; label: string; visitors: number; sessions: number; pageViews: number };
export type MinutePoint = { minute: number; label: string; users: number; views: number };
export type FunnelStep = {
  label: string;
  events: number;
  people: number;
  ofVisits: number | null;
  ofPrevious: number | null;
};

export type LiveAnalytics = {
  generatedAt: string;
  range: {
    key: RangeKey;
    fromInput: string;
    toInput: string;
    includeTagged: boolean;
    bucket: LiveBucket;
  };
  realtime: { active5: number; active30: number; minutes: MinutePoint[] };
  totals: { visitors: number; sessions: number; pageViews: number };
  series: SeriesPoint[];
  sources: RankRow[];
  campaigns: RankRow[];
  pages: RankRow[];
  inApp: CountRow[];
  devices: CountRow[];
  cities: CityRow[];
  funnel: FunnelStep[];
  revenueInr: number;
  refundedInr: number;
};

export function percentOf(part: number, whole: number) {
  if (!whole) return null;
  return Math.round((part / whole) * 1000) / 10;
}

export function readLiveRange(params: { range?: string; from?: string; to?: string; include?: string }): LiveRange {
  const requested = params.range === "today" || params.range === "7d" || params.range === "30d" || params.range === "custom" ? params.range : "7d";
  const stats = readStatsRange({ range: requested, from: params.from, to: params.to });
  if (requested === "custom" && !stats.from) return readLiveRange({ range: "7d", include: params.include });
  const from = stats.from ?? new Date(stats.to.getTime() - 6 * DAY);
  const span = stats.to.getTime() - from.getTime();
  return {
    key: requested === "custom" && !stats.from ? "7d" : requested,
    from,
    to: stats.to,
    fromInput: stats.fromInput || istInput(from),
    toInput: stats.toInput || istInput(stats.to),
    includeTagged: params.include === "1",
    bucket: span <= 36 * HOUR ? "hour" : "day",
  };
}

export function liveQuery(range: Pick<LiveRange, "key" | "fromInput" | "toInput" | "includeTagged">, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  params.set("range", range.key);
  if (range.includeTagged) params.set("include", "1");
  if (range.key === "custom") {
    if (range.fromInput) params.set("from", range.fromInput);
    if (range.toInput) params.set("to", range.toInput);
  }
  for (const [key, value] of Object.entries(extra || {})) if (value) params.set(key, value);
  return params.toString();
}

function istInput(date: Date) {
  const ist = new Date(date.getTime() + OFFSET);
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${ist.getUTCFullYear()}-${month}-${day}`;
}

function startOfIstHour(date: Date) {
  const ist = new Date(date.getTime() + OFFSET);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), ist.getUTCHours()) - OFFSET;
}

function bucketKey(date: Date, unit: LiveBucket) {
  const ist = new Date(date.getTime() + OFFSET);
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  const dateKey = `${ist.getUTCFullYear()}-${month}-${day}`;
  if (unit === "day") return dateKey;
  return `${dateKey} ${String(ist.getUTCHours()).padStart(2, "0")}:00`;
}

function bucketLabel(key: string, unit: LiveBucket) {
  if (unit === "hour") return key.slice(11, 16);
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function listBucketKeys(from: Date, to: Date, unit: LiveBucket) {
  const step = unit === "day" ? DAY : HOUR;
  const start = unit === "day" ? istDayStart(from).getTime() : startOfIstHour(from);
  const end = unit === "day" ? istDayStart(to).getTime() : startOfIstHour(to);
  const keys: string[] = [];
  for (let cursor = end; cursor >= start && keys.length < 90; cursor -= step) keys.push(bucketKey(new Date(cursor), unit));
  return keys.reverse();
}

function tagSql(includeTagged: boolean) {
  return includeTagged ? Prisma.sql`TRUE` : Prisma.sql`e.tag IS NULL`;
}

function actorSql() {
  return Prisma.sql`COALESCE(NULLIF(mv."visitorId", ''), NULLIF(e."userId", ''), NULLIF(lower(e.email), ''), NULLIF(e.phone, ''), NULLIF(e."dedupeKey", ''), e.id)`;
}

function simpleActorSql() {
  return Prisma.sql`COALESCE(NULLIF(e."userId", ''), NULLIF(lower(e.email), ''), NULLIF(e.phone, ''), NULLIF(e."dedupeKey", ''), e.id)`;
}

function visitIdSql() {
  const visitFrom = Prisma.raw(String(VISIT_PREFIX.length + 1));
  const inappFrom = Prisma.raw(String(INAPP_VISIT_PREFIX.length + 1));
  return Prisma.sql`CASE
    WHEN e."dedupeKey" LIKE ${`${VISIT_PREFIX}%`} THEN substring(e."dedupeKey" from ${visitFrom})
    WHEN e."dedupeKey" LIKE ${`${INAPP_VISIT_PREFIX}%`} THEN substring(e."dedupeKey" from ${inappFrom})
    ELSE NULL
  END`;
}

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return asObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function asList(value: unknown): Array<Record<string, unknown>> {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
}

function rankRows(value: unknown): RankRow[] {
  return asList(value).map((row) => ({
    label: String(row.label || "Unknown"),
    pageViews: num(row.pageViews),
    visitors: num(row.visitors),
  }));
}

function funnelSteps(visitEvents: number, visitPeople: number, row: Record<string, unknown>): FunnelStep[] {
  const steps = [
    { label: "Visit", events: visitEvents, people: visitPeople },
    { label: "Signup", events: num(row.signup_events), people: num(row.signup_people) },
    { label: "Checkout started", events: num(row.checkout_events), people: num(row.checkout_people) },
    { label: "Payment success", events: num(row.paid_events), people: num(row.paid_people) },
  ];
  return steps.map((step, index) => ({
    ...step,
    ofVisits: percentOf(step.events, steps[0].events),
    ofPrevious: index === 0 ? null : percentOf(step.events, steps[index - 1].events),
  }));
}

/**
 * Aggregates the activity log. Page views are visit rows, so they match the Activity
 * type filter for the same dates and the same admin/test tag rule. One scan of the
 * visits in range, then small indexed counts for the funnel and the last 30 minutes.
 */
export async function liveAnalytics(range: LiveRange, now = new Date()): Promise<LiveAnalytics> {
  const format = range.bucket === "hour" ? "YYYY-MM-DD HH24:00" : "YYYY-MM-DD";
  const since30 = new Date(now.getTime() - 30 * MINUTE);
  const since5 = new Date(now.getTime() - 5 * MINUTE);
  const tagged = tagSql(range.includeTagged);

  const [trafficRows, funnelRows, realtimeRows, deviceRows, cityRows] = await Promise.all([
    prisma.$queryRaw<Array<{ payload: unknown }>>`
      WITH hits AS MATERIALIZED (
        SELECT
          e.id,
          ${actorSql()} AS actor,
          e."createdAt" AS at,
          COALESCE(NULLIF(btrim(e.source), ''), 'Direct') AS source,
          COALESCE(
            NULLIF(btrim(mv.campaign), ''),
            CASE
              WHEN e.detail LIKE ${`${CAMPAIGN_PREFIX}%`} THEN NULLIF(btrim(substring(e.detail from ${Prisma.raw(String(CAMPAIGN_PREFIX.length + 1))})), '')
              ELSE NULL
            END
          ) AS campaign,
          COALESCE(
            NULLIF(btrim(mv.path), ''),
            CASE
              WHEN e.summary LIKE 'Visited %' THEN NULLIF(regexp_replace(e.summary, '^Visited (.*) from .+$', '\\1'), e.summary)
              ELSE NULL
            END
          ) AS path,
          to_char((e."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', ${format}) AS bucket
        FROM "SystemEvent" e
        LEFT JOIN "MarketingVisit" mv ON mv.id = ${visitIdSql()}
        WHERE e.type = 'visit'
          AND e."createdAt" >= ${range.from}
          AND e."createdAt" <= ${range.to}
          AND ${tagged}
      ),
      marked AS (
        SELECT
          hits.*,
          CASE
            WHEN hits.at - LAG(hits.at) OVER (PARTITION BY hits.actor ORDER BY hits.at, hits.id) > interval '30 minutes'
              OR LAG(hits.at) OVER (PARTITION BY hits.actor ORDER BY hits.at, hits.id) IS NULL
            THEN 1
            ELSE 0
          END AS session_start
        FROM hits
      )
      SELECT json_build_object(
        'views', (SELECT COUNT(*)::int FROM marked),
        'visitors', (SELECT COUNT(DISTINCT actor)::int FROM marked),
        'sessions', (SELECT COALESCE(SUM(session_start), 0)::int FROM marked),
        'series', COALESCE((
          SELECT json_agg(json_build_object(
            'bucket', bucket,
            'pageViews', page_views,
            'visitors', visitors,
            'sessions', sessions
          ) ORDER BY bucket)
          FROM (
            SELECT bucket,
                   COUNT(*)::int AS page_views,
                   COUNT(DISTINCT actor)::int AS visitors,
                   COALESCE(SUM(session_start), 0)::int AS sessions
            FROM marked
            GROUP BY bucket
          ) series_rows
        ), '[]'::json),
        'sources', COALESCE((
          SELECT json_agg(json_build_object('label', label, 'pageViews', page_views, 'visitors', visitors) ORDER BY page_views DESC, label)
          FROM (
            SELECT source AS label, COUNT(*)::int AS page_views, COUNT(DISTINCT actor)::int AS visitors
            FROM marked
            GROUP BY source
            ORDER BY page_views DESC, source
            LIMIT 8
          ) source_rows
        ), '[]'::json),
        'campaigns', COALESCE((
          SELECT json_agg(json_build_object('label', label, 'pageViews', page_views, 'visitors', visitors) ORDER BY page_views DESC, label)
          FROM (
            SELECT campaign AS label, COUNT(*)::int AS page_views, COUNT(DISTINCT actor)::int AS visitors
            FROM marked
            WHERE campaign IS NOT NULL
            GROUP BY campaign
            ORDER BY page_views DESC, campaign
            LIMIT 8
          ) campaign_rows
        ), '[]'::json),
        'pages', COALESCE((
          SELECT json_agg(json_build_object('label', label, 'pageViews', page_views, 'visitors', visitors) ORDER BY page_views DESC, label)
          FROM (
            SELECT path AS label, COUNT(*)::int AS page_views, COUNT(DISTINCT actor)::int AS visitors
            FROM marked
            WHERE path IS NOT NULL
            GROUP BY path
            ORDER BY page_views DESC, path
            LIMIT 8
          ) page_rows
        ), '[]'::json)
      ) AS payload
    `,
    prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        COUNT(*) FILTER (WHERE e.type = 'signup')::int AS signup_events,
        COUNT(DISTINCT CASE WHEN e.type = 'signup' THEN ${simpleActorSql()} END)::int AS signup_people,
        COUNT(*) FILTER (WHERE e.type = 'checkout')::int AS checkout_events,
        COUNT(DISTINCT CASE WHEN e.type = 'checkout' THEN ${simpleActorSql()} END)::int AS checkout_people,
        COUNT(*) FILTER (WHERE e.type = 'payment.paid')::int AS paid_events,
        COUNT(DISTINCT CASE WHEN e.type = 'payment.paid' THEN ${simpleActorSql()} END)::int AS paid_people,
        COALESCE(SUM(e."amountInr") FILTER (WHERE e.type = 'payment.paid'), 0)::int AS revenue,
        COALESCE(SUM(e."amountInr") FILTER (WHERE e.type = 'payment.refunded'), 0)::int AS refunded
      FROM "SystemEvent" e
      WHERE e."createdAt" >= ${range.from}
        AND e."createdAt" <= ${range.to}
        AND ${tagged}
        AND e.type IN ('signup', 'checkout', 'payment.paid', 'payment.refunded')
    `,
    prisma.$queryRaw<Array<{ payload: unknown }>>`
      WITH recent AS MATERIALIZED (
        SELECT ${actorSql()} AS actor, e."createdAt" AS at, e.type
        FROM "SystemEvent" e
        LEFT JOIN "MarketingVisit" mv ON mv.id = ${visitIdSql()}
        WHERE e."createdAt" >= ${since30}
          AND e."createdAt" <= ${now}
          AND ${tagged}
          AND e.type IN (${Prisma.join([...ACTIVE_TYPES])})
      )
      SELECT json_build_object(
        'active5', (SELECT COUNT(DISTINCT actor)::int FROM recent WHERE at >= ${since5}),
        'active30', (SELECT COUNT(DISTINCT actor)::int FROM recent),
        'minutes', COALESCE((
          SELECT json_agg(json_build_object('minute', minute_key, 'users', users, 'views', views) ORDER BY minute_key)
          FROM (
            SELECT (EXTRACT(EPOCH FROM at)::bigint / 60) AS minute_key,
                   COUNT(DISTINCT actor)::int AS users,
                   COUNT(*) FILTER (WHERE type = 'visit')::int AS views
            FROM recent
            GROUP BY 1
          ) minute_rows
        ), '[]'::json)
      ) AS payload
    `,
    prisma.$queryRaw<Array<{ kind: string; label: string; events: number }>>`
      SELECT kind, label, COUNT(*)::int AS events
      FROM (
        SELECT 'inapp'::text AS kind, COALESCE(NULLIF(btrim(e.status), ''), 'unknown') AS label
        FROM "SystemEvent" e
        WHERE e.type = 'inapp_browser_prompt'
          AND e."createdAt" >= ${range.from}
          AND e."createdAt" <= ${range.to}
          AND ${tagged}
        UNION ALL
        SELECT 'device'::text, COALESCE(NULLIF(btrim(e.detail), ''), 'unknown')
        FROM "SystemEvent" e
        WHERE e.type = 'inapp_browser_prompt'
          AND e.detail IS NOT NULL
          AND btrim(e.detail) <> ''
          AND e."createdAt" >= ${range.from}
          AND e."createdAt" <= ${range.to}
          AND ${tagged}
        UNION ALL
        SELECT 'device'::text, btrim(p.device)
        FROM "SystemEvent" e
        JOIN "Payment" p ON p.id = e."paymentId"
        WHERE e.type = 'checkout'
          AND p.device IS NOT NULL
          AND btrim(p.device) <> ''
          AND e."createdAt" >= ${range.from}
          AND e."createdAt" <= ${range.to}
          AND ${tagged}
      ) buckets
      GROUP BY kind, label
      ORDER BY events DESC, label
    `,
    prisma.$queryRaw<Array<{ label: string; people: number }>>`
      SELECT city AS label, COUNT(DISTINCT actor)::int AS people
      FROM (
        SELECT
          ${simpleActorSql()} AS actor,
          NULLIF(btrim(COALESCE(by_id.city, by_email.city)), '') AS city
        FROM "SystemEvent" e
        LEFT JOIN "User" by_id ON by_id.id = e."userId"
        LEFT JOIN "User" by_email ON e."userId" IS NULL AND lower(by_email.email) = lower(e.email)
        WHERE e."createdAt" >= ${range.from}
          AND e."createdAt" <= ${range.to}
          AND ${tagged}
          AND e.type IN ('signup', 'login', 'checkout', 'payment.paid', 'visit')
      ) located
      WHERE city IS NOT NULL
      GROUP BY city
      ORDER BY people DESC, city
      LIMIT 8
    `,
  ]);

  const traffic = asObject(trafficRows[0]?.payload);
  const funnel = funnelRows[0] || {};
  const realtime = asObject(realtimeRows[0]?.payload);
  const byMinute = new Map(asList(realtime.minutes).map((row) => [num(row.minute), { users: num(row.users), views: num(row.views) }]));
  const startMinute = Math.floor(since30.getTime() / MINUTE);
  const endMinute = Math.floor(now.getTime() / MINUTE);
  const minutes: MinutePoint[] = [];
  for (let minute = startMinute; minute <= endMinute; minute += 1) {
    const hit = byMinute.get(minute);
    minutes.push({
      minute,
      label: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(minute * MINUTE)),
      users: hit?.users || 0,
      views: hit?.views || 0,
    });
  }
  const seriesByBucket = new Map(asList(traffic.series).map((row) => [String(row.bucket), row]));
  const series = listBucketKeys(range.from, range.to, range.bucket).map((bucket) => {
    const row = seriesByBucket.get(bucket);
    return {
      bucket,
      label: bucketLabel(bucket, range.bucket),
      visitors: num(row?.visitors),
      sessions: num(row?.sessions),
      pageViews: num(row?.pageViews),
    };
  });
  const pageViews = num(traffic.views);
  const visitors = num(traffic.visitors);

  return {
    generatedAt: now.toISOString(),
    range: {
      key: range.key,
      fromInput: range.fromInput,
      toInput: range.toInput,
      includeTagged: range.includeTagged,
      bucket: range.bucket,
    },
    realtime: { active5: num(realtime.active5), active30: num(realtime.active30), minutes },
    totals: { visitors, sessions: num(traffic.sessions), pageViews },
    series,
    sources: rankRows(traffic.sources),
    campaigns: rankRows(traffic.campaigns),
    pages: rankRows(traffic.pages),
    inApp: deviceRows
      .filter((row) => row.kind === "inapp")
      .slice(0, 8)
      .map((row) => ({ label: row.label, events: num(row.events) })),
    devices: deviceRows
      .filter((row) => row.kind === "device")
      .slice(0, 8)
      .map((row) => ({ label: row.label, events: num(row.events) })),
    cities: cityRows.map((row) => ({ label: row.label, people: num(row.people) })),
    funnel: funnelSteps(pageViews, visitors, funnel),
    revenueInr: num(funnel.revenue),
    refundedInr: num(funnel.refunded),
  };
}
