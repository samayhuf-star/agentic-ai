export type UseCase = {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  who: string;
  day: string[];
  agents: string[];
  note: string;
};

export const useCases: UseCase[] = [
  {
    slug: "retail-and-shops",
    title: "Retail shops and local stores",
    kicker: "Retail",
    summary: "A shop already has a voice, a counter and regulars. AI Time Machine helps you draft the posts, replies and follow-ups that usually wait until closing time.",
    who: "Kirana stores, boutiques, electronics counters, pharmacies, and other shops that sell in person and online.",
    day: [
      "A Monday plan with a few posts and one simple offer, ready for you to accept or change",
      "Replies to ‘is this in stock?’ and ‘where is my order?’ drafted in your tone",
      "Festival posters and story ideas prepared early, not the night before",
      "A polite note to regulars, sent only after you say yes",
      "A low-stock list so you can reorder without digging through memory",
    ],
    agents: ["pooja", "zoya", "mira", "meera", "gautam", "kabir"],
    note: "These are examples of how an owner can use the agents. They are not case studies, and they are not a promise of sales.",
  },
  {
    slug: "restaurants-and-cafes",
    title: "Restaurants, cafes and cloud kitchens",
    kicker: "Food",
    summary: "Menus change, reviews arrive at odd hours, and festival weeks get busy. Drafts for posts, replies and offers can wait in your queue while you run the floor.",
    who: "Cafes, bakeries, dhabas, restaurants and delivery-first kitchens.",
    day: [
      "Captions and photo ideas for today’s plate, written in your voice",
      "Calm drafts when a review is mixed or a delivery is late",
      "Festival and weekend offer wording you can approve before it goes out",
      "A short reply to catering or bulk-order enquiries",
      "Google-listing posts and hour reminders so details stay accurate",
    ],
    agents: ["mira", "rhea", "ananya", "lavanya", "ishaan", "dev"],
    note: "The product does not manage your POS, inventory, or food-safety records. It drafts words and reminders for you to check.",
  },
  {
    slug: "local-services",
    title: "Local services and trades",
    kicker: "Services",
    summary: "Plumbers, salons, tutors, repair shops and agencies live on enquiries and follow-ups. A clear first reply, a quote and a reminder should not depend on a quiet evening.",
    who: "Salons, clinics’ front desks, home services, repair shops, tutors and other appointment-led work.",
    day: [
      "A first reply to a new enquiry, plus the next question worth asking",
      "Quotes written in plain language from your price list",
      "Reminders for people who asked and then went quiet — only after you approve",
      "Helpful pages that answer the questions people already type",
      "A morning brief of what needs your yes today",
    ],
    agents: ["harsh", "naina", "kabir", "isha", "noor", "myra"],
    note: "AI Time Machine is not a booking calendar or a field-service app. It helps you write and follow up, and you stay in charge.",
  },
  {
    slug: "coaches-and-consultants",
    title: "Coaches, consultants and independent practices",
    kicker: "Independent work",
    summary: "When you are the brand, every post and proposal still has to sound like you. Agents can draft; you keep the voice and the yes.",
    who: "Coaches, consultants, freelancers and small practices that sell their time or a programme.",
    day: [
      "Page drafts about what you offer, in language a stranger can follow",
      "Follow-ups after a discovery call, waiting in your yes queue",
      "A weekly plan so content does not pile up on Sunday night",
      "Invoice drafts and polite payment reminders",
      "A short numbers note for the week, without invented figures",
    ],
    agents: ["varun", "kabir", "pooja", "tara", "rahul", "aisha"],
    note: "This is not legal, medical, or financial advice, and it is not a promise that a practice will fill its calendar.",
  },
  {
    slug: "clinics-and-practices",
    title: "Clinics and care practices (front desk, not clinical advice)",
    kicker: "Clinics",
    summary: "A clinic can use AI Time Machine for front-desk wording, listings and follow-up drafts. It must not invent medical advice, diagnoses, or treatment promises.",
    who: "Clinics, dental practices, therapy rooms and similar fronts-of-house that need clear, careful communication.",
    day: [
      "Drafts for hours, directions and appointment-enquiry replies that you review",
      "Google listing checks for a missing phone number or an old hour",
      "Polite reminders you approve before they go out",
      "A calm first draft when someone is unhappy with a wait or a bill",
      "No clinical recommendations — those stay with the licensed practitioner",
    ],
    agents: ["zoya", "dev", "rohit", "diya", "kiara", "leela"],
    note: "AI Time Machine is not a medical device and does not diagnose, treat, or promise a health outcome. Anything clinical is outside the product.",
  },
  {
    slug: "ecommerce",
    title: "Online stores and small catalogues",
    kicker: "Ecommerce",
    summary: "Titles, replies, return wording and ‘where is my order?’ drafts can be ready before the inbox fills. Publishing and refunds still wait for you.",
    who: "Small D2C catalogues, marketplace sellers, and shops that also sell on WhatsApp or Instagram.",
    day: [
      "Clearer product titles and short page drafts about what you sell",
      "Abandoned-cart nudges that send only after you approve them",
      "Return and refund explanations, with no money moved without your yes",
      "Order-tracking replies in plain words",
      "Festival campaign drafts prepared early",
    ],
    agents: ["om", "rehan", "ravi", "farhan", "leela", "meera"],
    note: "The product does not run your storefront, warehouse, or ad account on its own. It prepares drafts and reminders.",
  },
];

export function getUseCase(slug: string) {
  return useCases.find((item) => item.slug === slug);
}
