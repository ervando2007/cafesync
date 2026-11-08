-- Printable "Jurnal Umum" voucher support: free-text voucher metadata on the
-- entry, and persisted stock-item/qty per line (previously only transient
-- input driving the inventory side-effect — now needed for the printable
-- voucher and the on-screen line detail to actually show a QTY column).

ALTER TABLE journal_entries
  ADD COLUMN voucher_no VARCHAR(50) NULL AFTER journal_no,
  ADD COLUMN pic VARCHAR(150) NULL AFTER outlet_id,
  ADD COLUMN approved_by VARCHAR(150) NULL AFTER memo,
  ADD COLUMN acknowledged_by VARCHAR(150) NULL AFTER approved_by;

ALTER TABLE journal_lines
  ADD COLUMN stock_item_id BIGINT UNSIGNED NULL AFTER account_id,
  ADD COLUMN qty DECIMAL(18,6) NULL AFTER stock_item_id,
  ADD CONSTRAINT journal_lines_stock_item_fk FOREIGN KEY (stock_item_id) REFERENCES stock_items(id);
