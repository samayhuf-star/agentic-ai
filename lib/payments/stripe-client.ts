import Stripe from "stripe";
import { stripeSecretConfigured } from "@/lib/us";

export function getStripe(): Stripe | null {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) return null;
  return new Stripe(key);
}

export function requireStripe() {
  const client = getStripe();
  if (!client || !stripeSecretConfigured()) {
    throw new Error("Stripe is not configured.");
  }
  return client;
}
