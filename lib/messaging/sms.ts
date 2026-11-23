import { prisma } from "@/lib/prisma";

export async function sendText(phone: string, body: string) {
  const provider = (process.env.SMS_PROVIDER || "mock").toLowerCase();
  if (provider === "msg91" && process.env.MSG91_AUTH_KEY) {
    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        authkey: process.env.MSG91_AUTH_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        template_id: process.env.MSG91_TEMPLATE_ID,
        short_url: "0",
        recipients: [{ mobiles: phone.replace(/\D/g, ""), var1: body }],
      }),
    });
    if (!response.ok) throw new Error("MSG91 did not accept the message.");
    await log(phone, body, "msg91");
    return;
  }
  if (provider === "gupshup" && process.env.GUPSHUP_API_KEY) {
    const response = await fetch("https://api.gupshup.io/wa/api/v1/msg", {
      method: "POST",
      headers: {
        apikey: process.env.GUPSHUP_API_KEY,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        channel: "whatsapp",
        source: process.env.GUPSHUP_SOURCE || "",
        destination: phone.replace(/\D/g, ""),
        "src.name": process.env.GUPSHUP_APP_NAME || "AI Time Machine",
        message: JSON.stringify({ type: "text", text: body }),
      }),
    });
    if (!response.ok) throw new Error("Gupshup did not accept the message.");
    await log(phone, body, "gupshup");
    return;
  }
  console.log(`[sms:mock] to ${phone}: ${body}`);
  await log(phone, body, "mock");
}

async function log(phone: string, body: string, provider: string) {
  await prisma.smsLog.create({ data: { phone, body, provider } });
}
