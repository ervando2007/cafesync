-- Attendance step 2: Fingerspot (Revo) machines push scans to CafeSync through the
-- Fingerspot cloud "attlog" webhook:
--   {"type":"attlog","cloud_id":"XXXX","data":{"pin":"1","scan":"2020-07-21 10:11","verify":"1","status_scan":"0"}}
-- verify: 1=finger 2=password 3=card 4=face 6=vein
-- status_scan: 0=scan in 1=scan out 2=break in 3=break out
--
-- * users.attendance_pin maps the machine's user PIN to a CafeSync user.
-- * attendance_devices registers each machine (cloud_id) to the outlet it sits in.
-- * attendance_scans keeps every webhook scan as received (audit + dedupe), with
--   what CafeSync did with it, so a missing IN/OUT can always be traced.
-- * attendances.source tells web clock-ins from machine scans.

ALTER TABLE users
  ADD COLUMN attendance_pin VARCHAR(20) NULL AFTER address,
  ADD UNIQUE KEY uq_users_attendance_pin (attendance_pin);

ALTER TABLE attendances
  ADD COLUMN source ENUM('WEB', 'DEVICE') NOT NULL DEFAULT 'WEB' AFTER outlet_id;

CREATE TABLE IF NOT EXISTS attendance_devices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cloud_id VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  outlet_id BIGINT UNSIGNED NOT NULL,
  -- STATUS: use the IN/OUT key pressed on the machine (status_scan).
  -- TOGGLE: ignore the key; first scan = IN, next scan = OUT.
  scan_mode ENUM('STATUS', 'TOGGLE') NOT NULL DEFAULT 'STATUS',
  status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  last_seen_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_devices_cloud_id (cloud_id),
  FOREIGN KEY (outlet_id) REFERENCES outlets(id)
);

CREATE TABLE IF NOT EXISTS attendance_scans (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cloud_id VARCHAR(64) NOT NULL,
  device_id BIGINT UNSIGNED NULL,
  pin VARCHAR(20) NOT NULL,
  scan_at DATETIME NOT NULL,
  verify TINYINT NULL,
  status_scan TINYINT NULL,
  user_id BIGINT UNSIGNED NULL,
  attendance_id BIGINT UNSIGNED NULL,
  result ENUM('IN', 'OUT', 'DUPLICATE', 'ALREADY_IN', 'NO_OPEN_IN', 'BREAK', 'UNKNOWN_DEVICE', 'UNKNOWN_PIN') NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_scans_event (cloud_id, pin, scan_at),
  INDEX idx_attendance_scans_received (received_at),
  FOREIGN KEY (device_id) REFERENCES attendance_devices(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (attendance_id) REFERENCES attendances(id) ON DELETE SET NULL
);

-- Settings → Attendance Devices is ADMIN-only (same as the rest of /settings).
