export type WhatsAppResult = { ok: true } | { ok: false; error: string };

export async function sendOwnerWhatsApp(text: string): Promise<WhatsAppResult | { ok: true; skipped: true }> {
  const provider = (process.env.WHATSAPP_PROVIDER || "none").trim().toLowerCase();
  const phone = (process.env.OWNER_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (provider === "none" || !provider) return { ok: true, skipped: true };
  if (!phone) return { ok: false, error: "OWNER_WHATSAPP_NUMBER is empty." };

  if (provider === "callmebot") {
    const key = process.env.CALLMEBOT_API_KEY || "";
    if (!key) return { ok: false, error: "CALLMEBOT_API_KEY is empty." };
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    if (!response.ok) return { ok: false, error: `CallMeBot ${response.status}` };
    return { ok: true };
  }

  if (provider === "meta") {
    const token = process.env.WHATSAPP_TOKEN || "";
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    if (!token || !phoneId) return { ok: false, error: "WhatsApp Cloud API keys are empty." };
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    });
    if (!response.ok) return { ok: false, error: `WhatsApp Cloud ${response.status}` };
    return { ok: true };
  }

  return { ok: false, error: "Unknown WHATSAPP_PROVIDER." };
}
