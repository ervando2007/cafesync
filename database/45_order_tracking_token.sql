-- Public order tracking by an unguessable token instead of the sequential
-- order number (which anyone could enumerate to read other customers' orders).
-- Only QR / takeaway orders placed from /order get a token; POS orders stay NULL
-- and are therefore not trackable publicly.
ALTER TABLE orders
  ADD COLUMN tracking_token CHAR(32) NULL AFTER order_no,
  ADD UNIQUE KEY uq_orders_tracking_token (tracking_token);
