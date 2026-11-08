-- Real per-channel pricing: the owner's actual menu data shows different
-- prices for the same product depending on sales channel (e.g. Affogato is
-- Rp 35.000 Dine In but Rp 44.800 on GrabFood — a markup very common for
-- delivery platforms). `outlet_products` previously held exactly one price
-- per (outlet, product); it now holds one price per (outlet, product,
-- channel). `channel` is deliberately a free VARCHAR, not an ENUM, since more
-- channels (GoFood, ShopeeFood, ...) are expected to show up over time and
-- shouldn't each need a schema migration.
--
-- Existing rows (from the earlier menu imports, all effectively "walk-in"
-- pricing) are backfilled as the 'DINE_IN' channel, since dine-in is this
-- app's default/primary channel today.

ALTER TABLE outlet_products
  ADD COLUMN channel VARCHAR(20) NOT NULL DEFAULT 'DINE_IN' AFTER product_id;

ALTER TABLE outlet_products
  DROP INDEX outlet_id,
  ADD UNIQUE KEY outlet_channel_product (outlet_id, channel, product_id);
