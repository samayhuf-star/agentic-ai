import QRCode from "qrcode";
import { appOrigin } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PNG QR that opens the one-tap payment link for an order (scan with a phone camera). */
export async function GET(request: Request) {
  const order = new URL(request.url).searchParams.get("order") || "";
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(order)) return new Response("Bad order", { status: 400 });
  const link = `${appOrigin(request)}/api/checkout/retry?order=${encodeURIComponent(order)}`;
  const png = await QRCode.toBuffer(link, { type: "png", width: 360, margin: 1, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
  });
}
