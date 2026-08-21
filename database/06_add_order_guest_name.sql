USE cafe_management;

ALTER TABLE orders ADD COLUMN guest_name VARCHAR(150) NULL AFTER customer_id;
