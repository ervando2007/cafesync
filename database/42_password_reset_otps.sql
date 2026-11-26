-- 6-digit OTPs for "forgot password via WhatsApp" (sent through Whapi.cloud).
-- Only an HMAC of the code is stored; attempts caps guessing per code.
CREATE TABLE password_reset_otps (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  otp_hash VARCHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_reset_otp_user (user_id, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
