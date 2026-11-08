-- KASIR requirements: flat 11% PB1 tax + 3.5% service charge on gross (bruto),
-- percentage-only discount (2/5/10%), and a "Void" flow (reason + manager
-- authentication) replacing the old client-only "Clear Order" reset and the
-- Held Orders list's instant cancel.
--
-- `tax_total` is kept and reused for PB1 (still "tax" conceptually, just a
-- flat rate now instead of a per-product rate) rather than renamed, to avoid
-- touching every existing read of that column; `discount_percent` records
-- which of the 3 fixed options was chosen so resuming a held order can
-- restore the exact selection, not just the resulting Rupiah amount.

ALTER TABLE orders
  ADD COLUMN service_charge_total DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER tax_total,
  ADD COLUMN discount_percent DECIMAL(5,2) NULL AFTER discount_total,
  MODIFY COLUMN status ENUM('OPEN','CONFIRMED','PREPARING','READY','SERVED','PAID','CANCELLED','REFUNDED','VOIDED') NOT NULL DEFAULT 'OPEN',
  ADD COLUMN void_reason VARCHAR(255) NULL,
  ADD COLUMN voided_by BIGINT UNSIGNED NULL,
  ADD COLUMN void_authorized_by BIGINT UNSIGNED NULL,
  ADD COLUMN voided_at DATETIME NULL,
  ADD CONSTRAINT orders_voided_by_fk FOREIGN KEY (voided_by) REFERENCES users(id),
  ADD CONSTRAINT orders_void_authorized_by_fk FOREIGN KEY (void_authorized_by) REFERENCES users(id);
