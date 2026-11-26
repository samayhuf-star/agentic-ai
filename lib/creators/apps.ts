export type CreatorApp = {
  id: string;
  name: string;
  blurb: string;
  initials: string;
  tone: string;
  /** When false, the app stays in config for later but is hidden on /creators and rejected by the apply API. */
  listed: boolean;
  icon?: string;
  href?: string;
  hrefLabel?: string;
};

/**
 * Full catalog. Only `listed` apps appear on the public /creators form.
 * The 5 listed store apps were confirmed live on the App Store (developer Sunny Vashisht, id 6820685406)
 * via the iTunes lookup API on 2026-11-26, plus The AI Time Machine on this site.
 */
export const CREATOR_APPS: CreatorApp[] = [
  {
    id: "ai-time-machine",
    name: "AI Time Machine",
    blurb: "A 55-agent workspace that drafts business work you approve.",
    initials: "TM",
    tone: "#c8f25a",
    listed: true,
    icon: "/creators/icons/ai-time-machine.png",
    href: "https://www.theaitimemachine.com",
    hrefLabel: "Website",
  },
  {
    id: "klenzer",
    name: "Klenzer: Photo Storage Cleaner",
    blurb: "Free up space by cleaning duplicate photos, blurry shots, screenshots and large videos.",
    initials: "KL",
    tone: "#9be7c4",
    listed: true,
    icon: "/creators/icons/klenzer.jpg",
    href: "https://apps.apple.com/app/id6820685404",
    hrefLabel: "App Store",
  },
  {
    id: "alarm-klock",
    name: "Alarm Klock",
    blurb: "An alarm clock that turns off only after you complete a wake-up mission.",
    initials: "AK",
    tone: "#8b7cff",
    listed: true,
    icon: "/creators/icons/alarm-klock.jpg",
    href: "https://apps.apple.com/app/id6835240404",
    hrefLabel: "App Store",
  },
  {
    id: "ank-numerology",
    name: "Ank Numerology",
    blurb: "See Vedic, Chaldean and Pythagorean numerology side by side from your name and date of birth.",
    initials: "AN",
    tone: "#ffd36a",
    listed: true,
    icon: "/creators/icons/ank-numerology.jpg",
    href: "https://apps.apple.com/app/id6835341528",
    hrefLabel: "App Store",
  },
  {
    id: "stargaze",
    name: "Stargaze Lite: AR Star Finder",
    blurb: "Hold up your iPhone to find stars, planets, constellations and the ISS.",
    initials: "SG",
    tone: "#7ad7ff",
    listed: true,
    icon: "/creators/icons/stargaze-lite.jpg",
    href: "https://apps.apple.com/app/id6835335478",
    hrefLabel: "App Store",
  },
  {
    id: "divi-mood",
    name: "Divi Mood - Wife mood tracker",
    blurb: "A penguin mood journal and cycle calendar.",
    initials: "DM",
    tone: "#ff9ad5",
    listed: true,
    icon: "/creators/icons/divi-mood.jpg",
    href: "https://apps.apple.com/app/id6835859517",
    hrefLabel: "App Store",
  },
  { id: "sozal", name: "Sozal", blurb: "Schedule and manage social posts across your brands.", initials: "SZ", tone: "#7ad7ff", listed: false },
  { id: "playsz", name: "Playsz", blurb: "A private video player with folders, gestures and a lock.", initials: "PZ", tone: "#ffb3d9", listed: false },
  { id: "clean-inbox", name: "Clean Inbox", blurb: "Unsubscribe, mute senders and bulk-clean your email.", initials: "CI", tone: "#ffd36a", listed: false },
  { id: "ramayan", name: "Ramayan: Watch & Talk", blurb: "Watch and talk through the Ramayan.", initials: "RA", tone: "#ffb26b", listed: false },
  { id: "mahabharat", name: "Mahabharat", blurb: "Watch and explore the Mahabharat.", initials: "MH", tone: "#f08b6a", listed: false },
  { id: "2-patti", name: "2 Patti", blurb: "A teen-patti style card game.", initials: "2P", tone: "#e7c26b", listed: false },
  { id: "klarity", name: "Klarity", blurb: "Screen time and focus tools for your phone.", initials: "KY", tone: "#a9b8ff", listed: false },
  { id: "scanwise", name: "Scanwise", blurb: "Scan and keep documents and passes in one place.", initials: "SW", tone: "#8fd4c2", listed: false },
  { id: "twist-21", name: "Twist 21", blurb: "A 21 card game with a chips pass and daily bonuses.", initials: "T21", tone: "#ff8fab", listed: false },
  { id: "lulla", name: "Lulla", blurb: "Sleep sounds and calming loops for night and rest.", initials: "LU", tone: "#b8a9ff", listed: false },
  { id: "abs-45", name: "45 Days Abs Challenge", blurb: "A 45-day abs workout program.", initials: "45", tone: "#7dffa6", listed: false },
  { id: "momentum-men", name: "Momentum Men's Workout", blurb: "Home workouts built for men.", initials: "MM", tone: "#6ec8ff", listed: false },
  { id: "momentum-women", name: "Momentum Women's Workout", blurb: "Home workouts built for women.", initials: "MW", tone: "#ff9ad5", listed: false },
  { id: "krosz", name: "Krosz", blurb: "Business and legal filing services.", initials: "KR", tone: "#5b8cff", listed: false },
  { id: "chezz", name: "Chezz", blurb: "Play chess on your phone.", initials: "CH", tone: "#d4c48a", listed: false },
];

export const CREATOR_APP_IDS = new Set(CREATOR_APPS.map((app) => app.id));
export const SELECTABLE_APPS = CREATOR_APPS.filter((app) => app.listed);
export const SELECTABLE_APP_IDS = new Set(SELECTABLE_APPS.map((app) => app.id));

export function appById(id: string) {
  return CREATOR_APPS.find((app) => app.id === id) || null;
}

export function appNames(ids: string[]) {
  return ids.map((id) => appById(id)?.name || id);
}

export const PLATFORMS = [
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "x", label: "X" },
  { id: "other", label: "Other" },
] as const;

export const PLATFORM_IDS = new Set(PLATFORMS.map((item) => item.id));

export const FOLLOWER_RANGES = ["Under 1k", "1k–10k", "10k–50k", "50k–100k", "100k–500k", "500k+"] as const;

export const CONTENT_TYPES = [
  { id: "reels", label: "Reels / short video" },
  { id: "long-video", label: "Long video" },
  { id: "ugc", label: "UGC" },
  { id: "reviews", label: "Reviews" },
] as const;

export const CONTENT_TYPE_IDS = new Set(CONTENT_TYPES.map((item) => item.id));

export const RATE_TYPES = [
  { id: "paid", label: "Paid work" },
  { id: "barter", label: "Product / barter" },
  { id: "affiliate", label: "Affiliate / commission" },
] as const;

export const RATE_TYPE_IDS = new Set(RATE_TYPES.map((item) => item.id));

export const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Canada",
  "Australia",
  "Singapore",
  "Germany",
  "France",
  "Indonesia",
  "Malaysia",
  "Nepal",
  "Nigeria",
  "Pakistan",
  "Philippines",
  "Saudi Arabia",
  "South Africa",
  "Spain",
  "Sri Lanka",
  "Other",
] as const;
