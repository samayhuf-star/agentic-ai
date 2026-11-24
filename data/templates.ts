export type ShopTemplate = {
  slug: string;
  title: string;
  when: string;
  message: string;
};

export const TEMPLATE_LIBRARY: ShopTemplate[] = [
  {
    slug: "order-follow-up",
    title: "Order follow-up",
    when: "The day after an order should have reached them.",
    message: `Hello NAME,

This is SHOP. Thank you for your order of ITEM.

Did it reach you, and was everything in the parcel fine? If something is missing or damaged, reply here and I will sort it out.

Thank you,
SHOP`,
  },
  {
    slug: "new-lead-welcome",
    title: "New-lead welcome",
    when: "Someone has just asked about a product.",
    message: `Hello NAME,

Thank you for writing to SHOP. I saw your message about ITEM.

The price is PRICE. I can deliver to AREA, or you can pick it up from the shop between HOURS.

One question so I send the right thing: QUANTITY OR SIZE?

Reply when you are ready. There is no rush.
SHOP`,
  },
  {
    slug: "weekly-stock-check",
    title: "Weekly stock check",
    when: "Monday morning, for the person who checks the shelves.",
    message: `Weekly stock check — SHOP — DATE

Please write the number you see, then tick reorder if we should buy more.

1. ITEM — count: ____ — reorder: yes / no
2. ITEM — count: ____ — reorder: yes / no
3. ITEM — count: ____ — reorder: yes / no
4. Anything damaged or too close to its date: ____
5. Send this note to the person who buys supplies before lunch.

Thank you.`,
  },
  {
    slug: "payment-reminder",
    title: "Payment reminder",
    when: "A customer still owes money for an order they already have.",
    message: `Hello NAME,

This is a reminder from SHOP. The bill for ITEM on DATE is still open. The amount is AMOUNT.

You can pay by UPI to UPI_ID, or in cash at the shop. If you have already paid, please reply with the time of the payment so I can match it.

Thank you,
SHOP`,
  },
  {
    slug: "review-request",
    title: "Review request",
    when: "A few days after a delivery that went well.",
    message: `Hello NAME,

This is SHOP. I hope ITEM was what you wanted.

If you have a minute, a short honest review helps other people nearby decide. Here is the link: LINK

If something was not right, reply to me first and I will fix it.
Thank you,
SHOP`,
  },
  {
    slug: "festival-offer",
    title: "Festival offer",
    when: "Before a festival, for people who already buy from you.",
    message: `Hello NAME,

FESTIVAL is coming up. SHOP is packing orders until DATE, and we are closed on CLOSED_DAY.

ITEM is PRICE until the festival. If you want it kept aside, reply with the quantity and whether you want delivery or pickup.

Shop hours that week: HOURS.
SHOP`,
  },
  {
    slug: "appointment-reminder",
    title: "Appointment reminder",
    when: "The day before a visit, fitting, or booking.",
    message: `Hello NAME,

This is a reminder from SHOP. You are booked on DATE at TIME for SERVICE.

Please reach ADDRESS a few minutes early. If you need a different time, reply today and I will try to move it.

See you then,
SHOP`,
  },
  {
    slug: "complaint-reply",
    title: "Complaint reply",
    when: "Someone is unhappy and you already know what you can do.",
    message: `Hello NAME,

I am sorry about ITEM. I understand you wanted WHAT_THEY_EXPECTED, and that is not what you got.

Here is what I will do: FIX (replace it / collect it / return AMOUNT). I will do this by WHEN.

Reply if you would like a different fix. I will stay on this until it is sorted.
SHOP`,
  },
  {
    slug: "whatsapp-prices",
    title: "Price list on WhatsApp",
    when: "A customer asks you to send today's prices.",
    message: `Hello NAME,

Today's prices at SHOP:

• ITEM — PRICE
• ITEM — PRICE
• ITEM — PRICE

Delivery in AREA is DELIVERY_CHARGE. Pickup is free during HOURS. Payment by UPI or cash.

Tell me the item and quantity if you want it packed.
SHOP`,
  },
  {
    slug: "out-of-stock",
    title: "Out of stock",
    when: "A customer asked for something you have finished.",
    message: `Hello NAME,

Thank you for asking. ITEM is finished today. I expect it back on DATE.

I can message you when it is in, or you can pick ANOTHER_ITEM which is in stock at PRICE.

Which would you like?
SHOP`,
  },
  {
    slug: "delivery-delay",
    title: "Delivery delay",
    when: "You know an order will miss the day you promised.",
    message: `Hello NAME,

I am sorry. Your order of ITEM will not reach you today. It should reach you on NEW_DAY.

You do not need to do anything. If the new day does not work, reply and I will cancel it and return the payment.
SHOP`,
  },
  {
    slug: "payment-received",
    title: "Payment received",
    when: "You have matched their UPI or cash payment.",
    message: `Hello NAME,

I have received AMOUNT for ITEM. Thank you.

I will pack it on PACK_DAY. I will write again when it leaves the shop, or when it is ready for pickup.
SHOP`,
  },
  {
    slug: "shop-hours",
    title: "Change in shop hours",
    when: "Your open times change for a day or a week.",
    message: `Hello,

SHOP hours are changing.

From DATE, we are open HOURS. We are closed on CLOSED_DAY.

Orders already placed will still be packed. If you had a pickup planned, reply and I will confirm the time.
Thank you,
SHOP`,
  },
];
