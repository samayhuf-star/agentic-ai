-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "pendingEmail" TEXT,
    "businessName" TEXT,
    "sells" TEXT,
    "goal" TEXT,
    "onboardedAt" TIMESTAMP(3),
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "welcomeEmailSentAt" TIMESTAMP(3),
    "emailTokenHash" TEXT,
    "emailTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "gateway" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "phone" TEXT,
    "gatewayPaymentId" TEXT,
    "raw" JSONB,
    "smsSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginCode" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "goals" TEXT NOT NULL,
    "sort" INTEGER NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "recommended" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailTokenHash_key" ON "User"("emailTokenHash");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "LoginCode_email_idx" ON "LoginCode"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "UserAgent_userId_agentId_key" ON "UserAgent"("userId", "agentId");

-- CreateIndex
CREATE INDEX "Approval_userId_status_idx" ON "Approval"("userId", "status");

-- CreateIndex
CREATE INDEX "Task_userId_createdAt_idx" ON "Task"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_userId_agentId_createdAt_idx" ON "Message"("userId", "agentId", "createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAgent" ADD CONSTRAINT "UserAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAgent" ADD CONSTRAINT "UserAgent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed the 55 agents
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('arjun', 'Arjun', 'Campaign planner', 'Marketing & ads', 'Plans the week of posts, offers and emails. Nothing goes out until you say yes.', '#c8f25a', 'customers,everything', 0);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('rohan', 'Rohan', 'Ads watcher', 'Marketing & ads', 'Watches your ads and suggests what to pause or boost. No budget change without your yes.', '#c8f25a', 'customers,everything', 1);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('neha', 'Neha', 'Email and WhatsApp', 'Marketing & ads', 'Writes messages to past customers. Sends nothing until you approve.', '#c8f25a', 'customers,posts,everything', 2);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('vikram', 'Vikram', 'Offer writer', 'Marketing & ads', 'Drafts simple offers for slow days and festivals.', '#c8f25a', 'customers', 3);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('aisha', 'Aisha', 'Brand voice', 'Marketing & ads', 'Keeps every draft sounding like your shop, not a stranger.', '#c8f25a', 'posts,everything', 4);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('karan', 'Karan', 'Audience finder', 'Marketing & ads', 'Suggests who to reach, in plain words. No ad spend without your yes.', '#c8f25a', 'customers', 5);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('meera', 'Meera', 'Festival campaigns', 'Marketing & ads', 'Gets festival drafts ready early. They wait for your yes.', '#c8f25a', 'posts', 6);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('sana', 'Sana', 'Poster ideas', 'Marketing & ads', 'Suggests what to put on a poster or a story.', '#c8f25a', 'posts', 7);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('imran', 'Imran', 'Ad lines', 'Marketing & ads', 'Writes short lines for ads. You approve before they run.', '#c8f25a', 'customers', 8);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('pooja', 'Pooja', 'Weekly marketing plan', 'Marketing & ads', 'Gives you one page on Monday: what to say this week.', '#c8f25a', 'everything', 9);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('zoya', 'Zoya', 'Customer replies', 'Support', 'Answers everyday questions in your tone. Tricky ones come to you.', '#4fe3c1', 'replies,everything', 10);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('ravi', 'Ravi', 'Returns', 'Support', 'Sorts return requests and drafts what to tell the customer.', '#4fe3c1', 'replies,everything', 11);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('ananya', 'Ananya', 'Reviews', 'Support', 'Drafts thank-yous and calm replies to reviews.', '#4fe3c1', 'replies', 12);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('farhan', 'Farhan', 'Order tracking', 'Support', 'Turns “where is my order?” into a clear reply.', '#4fe3c1', 'replies', 13);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('diya', 'Diya', 'Complaints', 'Support', 'Writes a calm reply when someone is upset, and waits for you.', '#4fe3c1', 'replies', 14);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('nikhil', 'Nikhil', 'WhatsApp support', 'Support', 'Drafts WhatsApp replies. Sends none until you say yes.', '#4fe3c1', 'replies', 15);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('leela', 'Leela', 'Refund questions', 'Support', 'Explains refunds in simple words. No money moves without your yes.', '#4fe3c1', 'replies', 16);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('arun', 'Arun', 'Repeat customers', 'Support', 'Notices regulars and drafts a thank-you.', '#4fe3c1', 'replies', 17);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('sneha', 'Sneha', 'Night replies', 'Support', 'Holds late messages and has a draft ready by morning.', '#4fe3c1', 'replies', 18);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('kabir', 'Kabir', 'Lead follow-up', 'Sales', 'Follows people who asked about what you sell. Sends nothing until you approve.', '#ff9f5a', 'customers,everything', 19);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('rehan', 'Rehan', 'Quiet carts', 'Sales', 'Drafts a nudge for people who almost bought.', '#ff9f5a', 'customers,everything', 20);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('naina', 'Naina', 'Quotes', 'Sales', 'Turns a price list into a clear quote.', '#ff9f5a', 'customers', 21);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('harsh', 'Harsh', 'New leads', 'Sales', 'Greets a new enquiry and asks the one next question.', '#ff9f5a', 'customers', 22);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('aditya', 'Aditya', 'Shop follow-ups', 'Sales', 'Reminds you who to call back today.', '#ff9f5a', '', 23);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('ishaan', 'Ishaan', 'Bulk orders', 'Sales', 'Drafts a reply when someone wants a large order.', '#ff9f5a', '', 24);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('kiara', 'Kiara', 'Reminder messages', 'Sales', 'Writes polite reminders. They wait in your yes queue.', '#ff9f5a', '', 25);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('yash', 'Yash', 'Price lists', 'Sales', 'Turns your prices into a message a customer can understand.', '#ff9f5a', '', 26);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('mira', 'Mira', 'Posts and Reels', 'Content', 'Drafts posts and Reel ideas in your voice. Posts nothing until you say yes.', '#b18cff', 'posts,everything', 27);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('rhea', 'Rhea', 'Captions', 'Content', 'Writes the words under a photo.', '#b18cff', 'posts,everything', 28);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('aman', 'Aman', 'Photo ideas', 'Content', 'Tells you what to photograph this week, simply.', '#b18cff', 'posts', 29);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('sara', 'Sara', 'Customer broadcasts', 'Content', 'Drafts one message for past customers.', '#b18cff', 'posts', 30);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('nidhi', 'Nidhi', 'Festival posts', 'Content', 'Prepares festival drafts ahead of time.', '#b18cff', 'posts', 31);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('varun', 'Varun', 'Page drafts', 'Content', 'Writes a simple page about what you sell.', '#b18cff', 'posts', 32);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('myra', 'Myra', 'Google posts', 'Content', 'Drafts a short post for your Google listing.', '#b18cff', 'posts', 33);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('tanvi', 'Tanvi', 'Story ideas', 'Content', 'Gives you a few story ideas for the week.', '#b18cff', 'posts', 34);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('dev', 'Dev', 'Google listing', 'SEO', 'Keeps your Google hours and details ready for a check.', '#ffd166', 'customers,everything', 35);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('isha', 'Isha', 'Pages people search for', 'SEO', 'Drafts helpful pages in plain language.', '#ffd166', 'everything', 36);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('om', 'Om', 'Product titles', 'SEO', 'Suggests clearer names for what you sell.', '#ffd166', 'customers', 37);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('neel', 'Neel', 'Questions people ask', 'SEO', 'Finds questions customers type and drafts a straight answer.', '#ffd166', '', 38);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('anika', 'Anika', 'Nearby searches', 'SEO', 'Helps nearby customers find you, and explains it in plain words.', '#ffd166', '', 39);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('rohit', 'Rohit', 'Listing fixes', 'SEO', 'Points out a missing hour or phone number before you publish it.', '#ffd166', '', 40);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('gautam', 'Gautam', 'Stock checks', 'Ops', 'Lists what is running low and drafts a reorder. Orders nothing without your yes.', '#6ab7ff', 'books,everything', 41);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('fatima', 'Fatima', 'Daily checklist', 'Ops', 'Gives you a short list for the day.', '#6ab7ff', 'everything', 42);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('vivek', 'Vivek', 'Vendor reminders', 'Ops', 'Drafts a chase to a supplier. Sends it only after your yes.', '#6ab7ff', 'books', 43);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('lavanya', 'Lavanya', 'Delivery updates', 'Ops', 'Turns a delay into a message customers can understand.', '#6ab7ff', 'books', 44);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('arnav', 'Arnav', 'Week plan', 'Ops', 'Lays the week out on one page.', '#6ab7ff', '', 45);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('shreya', 'Shreya', 'Task reminders', 'Ops', 'Nudges you about what you already said yes to.', '#6ab7ff', '', 46);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('tara', 'Tara', 'Invoices', 'Money', 'Drafts invoices and keeps a list of who has paid. Sends nothing until you say yes.', '#ff7ab6', 'books,everything', 47);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('rahul', 'Rahul', 'Payment reminders', 'Money', 'Writes a polite reminder for a late payment. It waits for your yes.', '#ff7ab6', 'books', 48);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('kavita', 'Kavita', 'Numbers summary', 'Money', 'Puts this week''s money into a few plain lines. Does not invent figures.', '#ff7ab6', 'books,everything', 49);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('mohit', 'Mohit', 'GST dates', 'Money', 'Reminds you before a GST date. You, or your accountant, still file it.', '#ff7ab6', 'books', 50);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('anjali', 'Anjali', 'Expense notes', 'Money', 'Turns a messy note into a clean expense line.', '#ff7ab6', 'books', 51);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('ayaan', 'Ayaan', 'AI CEO', 'CEO office', 'Picks your starting team and brings you one note. Decides nothing without you.', '#e8e4d4', 'customers,replies,posts,books,everything', 52);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('noor', 'Noor', 'Morning brief', 'CEO office', 'A short good morning: what needs your yes, and what can wait.', '#e8e4d4', 'customers,replies,posts,books,everything', 53);
INSERT INTO "Agent" ("id", "name", "role", "department", "blurb", "color", "goals", "sort") VALUES ('veer', 'Veer', 'Yes queue', 'CEO office', 'Turns an idea into a clear yes or no. Nothing goes live until you tap yes.', '#e8e4d4', 'customers,replies,posts,books,everything', 54);
