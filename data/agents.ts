export const DEPARTMENTS = [
  { name: "Marketing & ads", color: "#c8f25a" },
  { name: "Support", color: "#4fe3c1" },
  { name: "Sales", color: "#ff9f5a" },
  { name: "Content", color: "#b18cff" },
  { name: "SEO", color: "#ffd166" },
  { name: "Ops", color: "#6ab7ff" },
  { name: "Money", color: "#ff7ab6" },
  { name: "CEO office", color: "#e8e4d4" },
] as const;

export const GOALS = [
  { id: "customers", label: "Get more customers" },
  { id: "replies", label: "Answer customers faster" },
  { id: "posts", label: "Post regularly" },
  { id: "books", label: "Keep the books tidy" },
  { id: "everything", label: "A bit of everything" },
] as const;

export type GoalId = (typeof GOALS)[number]["id"];

export type AgentSeed = {
  id: string;
  name: string;
  role: string;
  department: string;
  blurb: string;
  color: string;
  goals: GoalId[];
};

const colorOf: Record<string, string> = Object.fromEntries(DEPARTMENTS.map((d) => [d.name, d.color]));

function agent(
  id: string,
  name: string,
  role: string,
  department: string,
  blurb: string,
  goals: GoalId[],
): AgentSeed {
  return { id, name, role, department, blurb, color: colorOf[department], goals };
}

const allGoals: GoalId[] = ["customers", "replies", "posts", "books", "everything"];

export const agents: AgentSeed[] = [
  agent("arjun", "Arjun", "Campaign planner", "Marketing & ads", "Plans the week of posts, offers and emails. Nothing goes out until you say yes.", ["customers", "everything"]),
  agent("rohan", "Rohan", "Ads watcher", "Marketing & ads", "Watches your ads and suggests what to pause or boost. No budget change without your yes.", ["customers", "everything"]),
  agent("neha", "Neha", "Email and WhatsApp", "Marketing & ads", "Writes messages to past customers. Sends nothing until you approve.", ["customers", "posts", "everything"]),
  agent("vikram", "Vikram", "Offer writer", "Marketing & ads", "Drafts simple offers for slow days and festivals.", ["customers"]),
  agent("aisha", "Aisha", "Brand voice", "Marketing & ads", "Keeps every draft sounding like your shop, not a stranger.", ["posts", "everything"]),
  agent("karan", "Karan", "Audience finder", "Marketing & ads", "Suggests who to reach, in plain words. No ad spend without your yes.", ["customers"]),
  agent("meera", "Meera", "Festival campaigns", "Marketing & ads", "Gets festival drafts ready early. They wait for your yes.", ["posts"]),
  agent("sana", "Sana", "Poster ideas", "Marketing & ads", "Suggests what to put on a poster or a story.", ["posts"]),
  agent("imran", "Imran", "Ad lines", "Marketing & ads", "Writes short lines for ads. You approve before they run.", ["customers"]),
  agent("pooja", "Pooja", "Weekly marketing plan", "Marketing & ads", "Gives you one page on Monday: what to say this week.", ["everything"]),

  agent("zoya", "Zoya", "Customer replies", "Support", "Answers everyday questions in your tone. Tricky ones come to you.", ["replies", "everything"]),
  agent("ravi", "Ravi", "Returns", "Support", "Sorts return requests and drafts what to tell the customer.", ["replies", "everything"]),
  agent("ananya", "Ananya", "Reviews", "Support", "Drafts thank-yous and calm replies to reviews.", ["replies"]),
  agent("farhan", "Farhan", "Order tracking", "Support", "Turns “where is my order?” into a clear reply.", ["replies"]),
  agent("diya", "Diya", "Complaints", "Support", "Writes a calm reply when someone is upset, and waits for you.", ["replies"]),
  agent("nikhil", "Nikhil", "WhatsApp support", "Support", "Drafts WhatsApp replies. Sends none until you say yes.", ["replies"]),
  agent("leela", "Leela", "Refund questions", "Support", "Explains refunds in simple words. No money moves without your yes.", ["replies"]),
  agent("arun", "Arun", "Repeat customers", "Support", "Notices regulars and drafts a thank-you.", ["replies"]),
  agent("sneha", "Sneha", "Night replies", "Support", "Holds late messages and has a draft ready by morning.", ["replies"]),

  agent("kabir", "Kabir", "Lead follow-up", "Sales", "Follows people who asked about what you sell. Sends nothing until you approve.", ["customers", "everything"]),
  agent("rehan", "Rehan", "Quiet carts", "Sales", "Drafts a nudge for people who almost bought.", ["customers", "everything"]),
  agent("naina", "Naina", "Quotes", "Sales", "Turns a price list into a clear quote.", ["customers"]),
  agent("harsh", "Harsh", "New leads", "Sales", "Greets a new enquiry and asks the one next question.", ["customers"]),
  agent("aditya", "Aditya", "Shop follow-ups", "Sales", "Reminds you who to write back to today.", []),
  agent("ishaan", "Ishaan", "Bulk orders", "Sales", "Drafts a reply when someone wants a large order.", []),
  agent("kiara", "Kiara", "Reminder messages", "Sales", "Writes polite reminders. They wait in your yes queue.", []),
  agent("yash", "Yash", "Price lists", "Sales", "Turns your prices into a message a customer can understand.", []),

  agent("mira", "Mira", "Posts and Reels", "Content", "Drafts posts and Reel ideas in your voice. Posts nothing until you say yes.", ["posts", "everything"]),
  agent("rhea", "Rhea", "Captions", "Content", "Writes the words under a photo.", ["posts", "everything"]),
  agent("aman", "Aman", "Photo ideas", "Content", "Tells you what to photograph this week, simply.", ["posts"]),
  agent("sara", "Sara", "Customer broadcasts", "Content", "Drafts one message for past customers.", ["posts"]),
  agent("nidhi", "Nidhi", "Festival posts", "Content", "Prepares festival drafts ahead of time.", ["posts"]),
  agent("varun", "Varun", "Page drafts", "Content", "Writes a simple page about what you sell.", ["posts"]),
  agent("myra", "Myra", "Google posts", "Content", "Drafts a short post for your Google listing.", ["posts"]),
  agent("tanvi", "Tanvi", "Story ideas", "Content", "Gives you a few story ideas for the week.", ["posts"]),

  agent("dev", "Dev", "Google listing", "SEO", "Keeps your Google hours and details ready for a check.", ["customers", "everything"]),
  agent("isha", "Isha", "Pages people search for", "SEO", "Drafts helpful pages in plain language.", ["everything"]),
  agent("om", "Om", "Product titles", "SEO", "Suggests clearer names for what you sell.", ["customers"]),
  agent("neel", "Neel", "Questions people ask", "SEO", "Finds questions customers type and drafts a straight answer.", []),
  agent("anika", "Anika", "Nearby searches", "SEO", "Helps nearby customers find you, and explains it in plain words.", []),
  agent("rohit", "Rohit", "Listing fixes", "SEO", "Points out a missing hour or phone number before you publish it.", []),

  agent("gautam", "Gautam", "Stock checks", "Ops", "Lists what is running low and drafts a reorder. Orders nothing without your yes.", ["books", "everything"]),
  agent("fatima", "Fatima", "Daily checklist", "Ops", "Gives you a short list for the day.", ["everything"]),
  agent("vivek", "Vivek", "Vendor reminders", "Ops", "Drafts a chase to a supplier. Sends it only after your yes.", ["books"]),
  agent("lavanya", "Lavanya", "Delivery updates", "Ops", "Turns a delay into a message customers can understand.", ["books"]),
  agent("arnav", "Arnav", "Week plan", "Ops", "Lays the week out on one page.", []),
  agent("shreya", "Shreya", "Task reminders", "Ops", "Nudges you about what you already said yes to.", []),

  agent("tara", "Tara", "Invoices", "Money", "Drafts invoices and keeps a list of who has paid. Sends nothing until you say yes.", ["books", "everything"]),
  agent("rahul", "Rahul", "Payment reminders", "Money", "Writes a polite reminder for a late payment. It waits for your yes.", ["books"]),
  agent("kavita", "Kavita", "Numbers summary", "Money", "Puts this week's money into a few plain lines. Does not invent figures.", ["books", "everything"]),
  agent("mohit", "Mohit", "GST dates", "Money", "Reminds you before a GST date. You, or your accountant, still file it.", ["books"]),
  agent("anjali", "Anjali", "Expense notes", "Money", "Turns a messy note into a clean expense line.", ["books"]),

  agent("ayaan", "Ayaan", "AI CEO", "CEO office", "Picks your starting team and brings you one note. Decides nothing without you.", allGoals),
  agent("noor", "Noor", "Morning brief", "CEO office", "A short good morning: what needs your yes, and what can wait.", allGoals),
  agent("veer", "Veer", "Yes queue", "CEO office", "Turns an idea into a clear yes or no. Nothing goes live until you tap yes.", allGoals),
];

export function isGoal(value: string): value is GoalId {
  return GOALS.some((goal) => goal.id === value);
}

export function goalLabel(id: string) {
  return GOALS.find((goal) => goal.id === id)?.label ?? id;
}
