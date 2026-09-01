import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

/** Client Stripe (server-side apenas — nunca importar isto em um Client Component). */
export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY não configurada.");
    }
    stripeSingleton = new Stripe(secretKey, {
      apiVersion: "2024-06-20",
    });
  }
  return stripeSingleton;
}
