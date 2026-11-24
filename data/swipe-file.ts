export type SwipePrompt = { title: string; text: string };

export type SwipeGroup = {
  id: "sales" | "support" | "operations";
  label: string;
  prompts: SwipePrompt[];
};

export const SWIPE_INTRO =
  "Copy-and-use prompts for sales, support and operations. Paste one, add a few details about your shop, and edit the reply before you send it.";

export const SWIPE_GROUPS: SwipeGroup[] = [
  {
    id: "sales",
    label: "Sales",
    prompts: [
      {
        title: "A lead who went quiet",
        text: "Write a short WhatsApp message I can send to someone who asked about a product three days ago and then went quiet. Be polite. Remind them what they asked about. Ask if they still want it. Do not push and do not offer a fake discount. I will add the shop name, the item, and the price at the end. Keep it under 60 words. Simple English.",
      },
      {
        title: "Price list as a WhatsApp message",
        text: "Turn the price list I paste below into one WhatsApp message a customer can read on a phone. Group similar items. Put the price next to each item. Use rupees. Add one line at the top that says these are today's prices and one line at the end that says delivery time and how to pay (UPI or cash). Do not add items I did not list. Price list:",
      },
      {
        title: "They asked for the best price",
        text: "A customer asked, \"What is your best price?\" Write two replies I can choose from. The first keeps the price I give you and explains what is included (item, packing, delivery). The second offers a small saving only if they buy the quantity I mention. Do not invent a lower price. Sound calm, not desperate. I will add the item, the price, and the quantity.",
      },
      {
        title: "Order is ready for pickup",
        text: "Write a WhatsApp message telling a customer their order is packed and ready to pick up from the shop. Include the shop hours I give you, what they should bring (the order name or a bill), and how long I will keep it. Be warm and short. Do not say the order was already delivered.",
      },
      {
        title: "A past buyer may need a refill",
        text: "Write a gentle note to a customer who bought from me about a month ago. Ask if they need the same item again. Mention the item I name. Do not pretend I know they have run out. Give them an easy way to say yes or no. Under 50 words. Simple English.",
      },
      {
        title: "They visited and did not buy",
        text: "Someone came to the shop, looked at a product, and left without buying. Write a same-day WhatsApp message. Thank them for coming. Ask what held them back, in one question. Offer to answer that question. Do not apologise too much and do not cut the price unless I say so.",
      },
      {
        title: "A new item for people who bought something similar",
        text: "Write a message for customers who already bought a product I name. Tell them about one new item that goes with it. Say the price I give you. Say they can ignore the message if they are not interested. Do not claim it will change their business or their income. Keep it friendly and short.",
      },
      {
        title: "Do you deliver to my area?",
        text: "Write a reply to \"Do you deliver to my area?\" I will tell you the area, whether I deliver there, the charge, and the usual time. If I do not deliver there, say so clearly and offer pickup. If I do, say the charge and when it usually leaves the shop. Do not promise a time I did not give you.",
      },
      {
        title: "Follow up after a quotation",
        text: "I sent a quotation yesterday. Write a follow-up I can send today. Refer to the quotation in one line. Ask if they want me to change anything. Ask if I should hold the items. Do not say the price is about to go up unless I say that is true. I will add the quotation number, the item, and the total.",
      },
      {
        title: "A weekend note for a regular",
        text: "Write a Friday message for a regular customer. Mention one thing that is in stock this weekend, the price, and the shop hours. Invite them to reply if they want it kept aside. Do not use words like exclusive, limited drop, or hurry. Sound like a shopkeeper who knows them.",
      },
      {
        title: "They said they will think about it",
        text: "A customer said \"I will think about it.\" Write a reply that respects that. Ask one useful question that helps them decide, such as size, quantity, or delivery day. Tell them there is no rush. Offer to hold the price I name until the date I name, and no longer. Do not argue.",
      },
      {
        title: "I still need one detail",
        text: "I cannot confirm an order yet because one detail is missing. Write a message that says what I already have right, what I still need (I will name it: size, colour, quantity, address, or payment), and that I will pack it after they reply. Keep it kind. Do not make them feel they did something wrong.",
      },
    ],
  },
  {
    id: "support",
    label: "Support",
    prompts: [
      {
        title: "Late delivery, calm and kind",
        text: "Write a reply to a customer whose order is late. Start by saying I am sorry it is late. Say the real reason if I give you one. Say the new day it should reach them. Tell them what I will do if it does not arrive by then (replace, resend, or return the money). Do not blame the customer or the delivery person by name. Short and calm.",
      },
      {
        title: "The wrong item went out",
        text: "A customer received the wrong item. Write a reply that says I will fix it. Tell them whether to keep the wrong item or send it back, based on what I tell you. Say when the right item will go out. Do not ask them to pay again. Be direct and kind.",
      },
      {
        title: "The item arrived damaged",
        text: "Write a reply to a customer who says the product arrived damaged. Ask for one photo if I do not have one yet. Say I will replace it or return the money, and I will tell you which of those I can do. Do not argue about whose fault it was. Do not say the damage is normal.",
      },
      {
        title: "They cannot find the delivery",
        text: "A customer says nobody called and they cannot find the parcel. Write a reply. Ask for the landmark or gate colour only if I do not already have the address. Say I am checking with the person who carries deliveries. Give them a time today when I will write again. Do not tell them to keep waiting with no time.",
      },
      {
        title: "They want to cancel after I packed it",
        text: "A customer wants to cancel after I have packed the order. Write a fair reply. If it has not left the shop, say I can cancel it and how the payment comes back. If it has left, say that clearly and what we can still do. I will tell you which case this is. Do not make them feel foolish for changing their mind.",
      },
      {
        title: "They paid twice",
        text: "A customer says they paid twice, once by UPI and once by cash or another UPI. Write a reply that takes it seriously. Say I am checking today's payments. Ask for the time of the second payment and the last four digits or the UPI name, only if I need them. Say I will return the extra money to the same place it came from, if the second payment is real. Do not accuse them of a mistake.",
      },
      {
        title: "They are unhappy with the product",
        text: "A customer is unhappy with the taste, fit, colour, or finish. Write a reply that listens first. Repeat their complaint in one plain line so they know I understood. Offer a replacement or a return, based on the rule I give you. Do not tell them they are using it wrong unless I have a simple care step that would genuinely help. No medical advice.",
      },
      {
        title: "They asked a question I already answered",
        text: "A customer asked the same question again. Write a patient reply. Answer it again in one or two lines, even if I answered before. Then ask if they want me to confirm the order. Do not say \"as I already told you\". Simple English.",
      },
      {
        title: "I need one more day",
        text: "I need one more day before an order can leave. Write a message that says this early, before they have to chase me. Give the new day. Give one true reason in a few words. Tell them they can cancel if the new day does not work. Do not promise a discount for the delay unless I say so.",
      },
      {
        title: "After I fixed the problem",
        text: "The late, wrong, or damaged order is now sorted. Write a short closing note. Say what I did. Ask if what they have now is right. Invite them to write to me if it is not. Do not ask for a review in the same message. Do not say it will never happen again.",
      },
      {
        title: "The message is angry",
        text: "Rewrite my reply to an angry customer. The first line should lower the heat without saying their feelings are wrong. Then say the one fact I give you. Then say the next step and when I will do it. Take out any line that sounds like blame. Keep my meaning. Plain words.",
      },
      {
        title: "How to use or look after it",
        text: "Write simple care steps for the product I name, using only the facts I paste below. Number the steps. Use short lines a person can follow at home. If I did not give a fact, do not invent one. No health claims. Facts:",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    prompts: [
      {
        title: "What is running low",
        text: "I will paste what I counted in the shop. List the items that are at or below the number I mark as low. For each one, draft a reorder line I can send to my supplier: item name, how many I want, and the pack size if I wrote it. Put the urgent ones first. Do not add items I did not count. Counts:",
      },
      {
        title: "Weekly stock check",
        text: "Write a Monday checklist for a weekly stock check in a small shop. Include: count the fast sellers, note anything damaged, check dates on items that expire, write what to reorder, and put the list where the person who buys supplies will see it. Keep each step to one line. Leave a blank line under each step so I can write the answer. Do not turn it into a software process.",
      },
      {
        title: "The supplier is late",
        text: "Write a polite WhatsApp message to a supplier whose delivery is late. Say the order reference I give you, what I was expecting, and the day I needed it. Ask them to tell me today whether it is coming or not. Be firm and respectful. Do not threaten to stop buying unless I say that.",
      },
      {
        title: "Ask a supplier for today's rate",
        text: "Write a short message asking a supplier for today's rate on the items I list. Ask for the pack size and the soonest they can send it. Say I buy from them often, if that is true, without flattery. I will paste the item list under the message.",
      },
      {
        title: "We are closing early today",
        text: "Write two short notices: one for the shop door and one for WhatsApp status. Say we are closing early today, the time, and when we open again. Give the reason only if I provide one. Tell customers who already have an order what happens to pickup. Keep both notices under 40 words.",
      },
      {
        title: "Opening tasks for tomorrow",
        text: "Write a plain opening list for the person who opens the shop tomorrow. Include lights and lock, cash float, a look at yesterday's pending orders, items to put out front, and one line for sweeping. I will add anything special. Use simple words. No more than 8 lines.",
      },
      {
        title: "What to pack for a bulk order",
        text: "Turn this bulk order into a packing list the packer can tick. One line per item with the quantity in numbers. Add a last line for the bill, a last line for the address label, and a last line to check the customer's name. Do not merge two items onto one line. Order:",
      },
      {
        title: "End of day cash and UPI",
        text: "Write an end-of-day check I can do in ten minutes. Steps for: count cash, match it to the notes I made, look at today's UPI total, list any payment that is still missing, write what to bank tomorrow, and lock the rest. Use plain words. Do not give tax or legal advice. Leave a space next to each step for the amount.",
      },
      {
        title: "A regular item is out of stock",
        text: "A regular item is finished. Write three things: a one-line reply I can send to customers who ask for it today, a line for the person at the counter so they all say the same thing, and a reorder message to the supplier. I will tell you the item and the day I expect it back. Do not suggest a different product unless I name one.",
      },
      {
        title: "Handover from morning to evening",
        text: "Write a shift handover note with blanks I can fill in two minutes. Sections: orders still open, customers waiting for a call, stock that ran out, money to watch, and anything the next person must not forget. Four lines each, no more. Plain English.",
      },
      {
        title: "Plan this week's deliveries",
        text: "I will paste delivery addresses and areas. Group them by area so one trip covers neighbours together. Put the suggested order of areas, not a map. Flag any order that is marked urgent. If an address is incomplete, list it at the top as \"ask the customer first\". Do not invent landmarks.",
      },
      {
        title: "Before I meet the person who keeps the books",
        text: "Write a list of questions I can take to the person who keeps my shop's books. Cover: which bills from this month are still unpaid, which customer payments are still open, what papers they need from me, and what I should bring next time. Plain words. Do not tell me how much tax I owe and do not invent numbers.",
      },
    ],
  },
];
