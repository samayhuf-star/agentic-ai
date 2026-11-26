export type CreatorApp = {
  id: string;
  name: string;
  blurb: string;
  initials: string;
  tone: string;
};

/** Public catalog for the creator application page. Names follow Drive "Samay Apps" folders and current workstreams. */
export const CREATOR_APPS: CreatorApp[] = [
  { id: "ai-time-machine", name: "AI Time Machine", blurb: "A 55-agent workspace that drafts business work you approve.", initials: "TM", tone: "#c8f25a" },
  { id: "sozal", name: "Sozal", blurb: "Schedule and manage social posts across your brands.", initials: "SZ", tone: "#7ad7ff" },
  { id: "playsz", name: "Playsz", blurb: "A private video player with folders, gestures and a lock.", initials: "PZ", tone: "#ffb3d9" },
  { id: "klenzer", name: "Klenzer", blurb: "Clean up photos, videos, screenshots and duplicate contacts.", initials: "KL", tone: "#9be7c4" },
  { id: "clean-inbox", name: "Clean Inbox", blurb: "Unsubscribe, mute senders and bulk-clean your email.", initials: "CI", tone: "#ffd36a" },
  { id: "ramayan", name: "Ramayan: Watch & Talk", blurb: "Watch and talk through the Ramayan.", initials: "RA", tone: "#ffb26b" },
  { id: "mahabharat", name: "Mahabharat", blurb: "Watch and explore the Mahabharat.", initials: "MH", tone: "#f08b6a" },
  { id: "2-patti", name: "2 Patti", blurb: "A teen-patti style card game.", initials: "2P", tone: "#e7c26b" },
  { id: "klarity", name: "Klarity", blurb: "Screen time and focus tools for your phone.", initials: "KY", tone: "#a9b8ff" },
  { id: "scanwise", name: "Scanwise", blurb: "Scan and keep documents and passes in one place.", initials: "SW", tone: "#8fd4c2" },
  { id: "twist-21", name: "Twist 21", blurb: "A 21 card game with a chips pass and daily bonuses.", initials: "T21", tone: "#ff8fab" },
  { id: "lulla", name: "Lulla", blurb: "Sleep sounds and calming loops for night and rest.", initials: "LU", tone: "#b8a9ff" },
  { id: "abs-45", name: "45 Days Abs Challenge", blurb: "A 45-day abs workout program.", initials: "45", tone: "#7dffa6" },
  { id: "momentum-men", name: "Momentum Men's Workout", blurb: "Home workouts built for men.", initials: "MM", tone: "#6ec8ff" },
  { id: "momentum-women", name: "Momentum Women's Workout", blurb: "Home workouts built for women.", initials: "MW", tone: "#ff9ad5" },
  { id: "krosz", name: "Krosz", blurb: "Business and legal filing services.", initials: "KR", tone: "#5b8cff" },
  { id: "chezz", name: "Chezz", blurb: "Play chess on your phone.", initials: "CH", tone: "#d4c48a" },
];

export const CREATOR_APP_IDS = new Set(CREATOR_APPS.map((app) => app.id));

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
