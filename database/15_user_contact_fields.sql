ALTER TABLE users
  ADD COLUMN whatsapp_number VARCHAR(30) NULL AFTER avatar_url,
  ADD COLUMN address VARCHAR(255) NULL AFTER whatsapp_number;
