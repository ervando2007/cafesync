// Pricing channels: a product can sell at a different price on each of these
// (e.g. Affogato is cheaper Dine In than on GrabFood, a markup common for
// delivery platforms). A plain string union, not a DB enum — more channels
// (GoFood, ShopeeFood, ...) are expected over time. No "server-only" here
// (unlike lib/pos.ts) since both server actions and the client POS/customer
// menu components need this same mapping.
export const PRICING_CHANNELS = ["DINE_IN", "TAKEAWAY", "GRABFOOD"] as const;
export type PricingChannel = (typeof PRICING_CHANNELS)[number];

/** Maps an order's own channel (how/where it was placed) to which price list applies. */
export function pricingChannelFor(orderChannel: string): PricingChannel {
  if (orderChannel === "TAKEAWAY") return "TAKEAWAY";
  if (orderChannel === "DELIVERY") return "GRABFOOD";
  return "DINE_IN"; // DINE_IN_STAFF, DINE_IN_QR, POS
}
