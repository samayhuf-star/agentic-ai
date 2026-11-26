export type Solution = {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  problem: string;
  help: string[];
  agents: string[]; // agent ids
  limits: string[];
  departments: string[];
};

export const solutions: Solution[] = [
  {
    slug: "marketing",
    title: "Marketing, for owners who still want the final say",
    kicker: "Marketing",
    summary: "Get a weekly plan, offer drafts, ad lines and festival ideas ready to review. Nothing is posted or spent until you approve it.",
    problem: "Marketing often slips because the week fills up. You know you should post, plan a simple offer, and look at ads — and then the day ends.",
    help: [
      "A one-page weekly marketing plan you can actually finish",
      "Drafts for posts, emails and WhatsApp to past customers, in your voice",
      "Short ad lines and offer wording for slow days and festivals",
      "Suggestions on who to reach — with no budget change until you say yes",
      "A brand-voice check so drafts sound like your shop, not a stranger",
    ],
    agents: ["arjun", "rohan", "neha", "vikram", "aisha", "karan", "meera", "sana", "imran", "pooja"],
    limits: [
      "Agents draft. They do not publish posts or change ad spend on their own.",
      "You connect your own AI key. Usage is billed by that provider, not included in the ₹1,999 fee.",
      "AI Time Machine does not promise more customers, cheaper ads, or a ranking on Google.",
    ],
    departments: ["Marketing & ads", "Content"],
  },
  {
    slug: "sales",
    title: "Sales follow-ups that wait in your yes queue",
    kicker: "Sales",
    summary: "Turn enquiries, quiet carts and quotes into clear next messages — then approve them before anyone is contacted.",
    problem: "Leads go quiet because nobody wrote back the same day. Follow-ups feel pushy if you rush them, and they never happen if you wait too long.",
    help: [
      "A clear first reply to a new enquiry, plus the one next question worth asking",
      "A polite nudge for someone who almost bought",
      "Quotes and price lists written so a customer can understand them",
      "A reminder list of who you said you would write back to today",
      "Drafts for bulk-order replies and gentle reminders, all waiting for your yes",
    ],
    agents: ["kabir", "rehan", "naina", "harsh", "aditya", "ishaan", "kiara", "yash"],
    limits: [
      "No message is sent to a customer until you approve it.",
      "This is not a CRM that auto-dials or auto-emails your list.",
      "We do not promise a close rate, pipeline size, or sales result.",
    ],
    departments: ["Sales"],
  },
  {
    slug: "support",
    title: "Customer support drafts, in your tone",
    kicker: "Support",
    summary: "Everyday questions, tracking replies, reviews, returns and complaints start as drafts you can edit. Tricky ones are flagged for you.",
    problem: "The same questions arrive all day: where is my order, can I return this, why is it late. A rushed reply can sound sharp. A delayed reply makes a small problem bigger.",
    help: [
      "Everyday answers written in your tone",
      "Clear tracking and refund explanations, without moving money on their own",
      "Thank-yous and calm replies to reviews",
      "A first draft when someone is upset, so you can soften or tighten it",
      "WhatsApp reply drafts that send only after you say yes",
      "Late messages held so a draft is waiting in the morning",
    ],
    agents: ["zoya", "ravi", "ananya", "farhan", "diya", "nikhil", "leela", "arun", "sneha"],
    limits: [
      "Agents do not issue refunds or change an order without you.",
      "They are not a 24/7 unattended helpdesk. You remain responsible for what goes out.",
      "Support is not a promise that every customer will be happy.",
    ],
    departments: ["Support"],
  },
  {
    slug: "finance",
    title: "Money drafts and reminders — not a replacement for your accountant",
    kicker: "Finance",
    summary: "Invoice drafts, polite payment reminders, a plain weekly numbers note, expense lines and GST date reminders. You, or your accountant, still file and still send.",
    problem: "Invoices wait, reminders feel awkward, and GST dates arrive faster than they appear to. None of that should be invented or filed in your name.",
    help: [
      "Invoice drafts and a simple list of who has paid",
      "Polite payment reminders that wait in your yes queue",
      "A short weekly numbers summary that does not invent figures",
      "Reminders before a GST date — you or your accountant still file",
      "Messy expense notes turned into clean lines you can check",
    ],
    agents: ["tara", "rahul", "kavita", "mohit", "anjali"],
    limits: [
      "AI Time Machine is not an accountant, auditor, or GST filing tool.",
      "It does not send invoices or move money until you approve the message.",
      "It does not invent numbers. If a figure is missing, the draft should say so.",
    ],
    departments: ["Money"],
  },
  {
    slug: "ops",
    title: "Operations: stock, suppliers, delivery notes and the week on one page",
    kicker: "Operations",
    summary: "Low-stock lists, supplier chases, delivery updates and a daily checklist — prepared for you, with no order placed until you say yes.",
    problem: "Work hides in memory: a supplier to chase, a delay to explain, a shelf that is about to run out. A short list beats a long worry.",
    help: [
      "A list of what is running low, plus a reorder draft you can approve",
      "A short daily checklist and a one-page week plan",
      "Supplier reminder drafts that send only after your yes",
      "Delivery delays explained in words a customer can follow",
      "Nudges about tasks you already agreed to",
    ],
    agents: ["gautam", "fatima", "vivek", "lavanya", "arnav", "shreya"],
    limits: [
      "Agents do not place supplier orders on their own.",
      "They do not connect to your inventory software unless you paste the facts they need.",
      "This is a drafting and reminder layer, not a warehouse system.",
    ],
    departments: ["Ops"],
  },
  {
    slug: "hr",
    title: "People and daily rhythm — with an honest limit",
    kicker: "People",
    summary: "AI Time Machine does not include a dedicated HR, payroll or hiring product today. What it can do is help a small team keep a daily rhythm: checklists, week plans and task reminders.",
    problem: "Small teams rarely need an enterprise HR suite. They need the day to be visible, and the work they already agreed to not to disappear.",
    help: [
      "A short daily checklist the owner can share with the floor",
      "A one-page week plan from the ops and CEO-office agents",
      "Reminders about tasks you already said yes to",
      "Drafts for simple internal notes, which you still send yourself",
    ],
    agents: ["fatima", "arnav", "shreya", "noor", "veer", "ayaan"],
    limits: [
      "There is no HR, payroll, PF, ESI, attendance or hiring-ATS module today.",
      "We do not offer employment contracts, offer letters as a legal service, or performance reviews as a formal system.",
      "If those are what you need, use a specialist tool. We will not pretend otherwise.",
    ],
    departments: ["Ops", "CEO office"],
  },
];

export function solutionBySlug(slug: string) {
  return solutions.find((item) => item.slug === slug);
}
