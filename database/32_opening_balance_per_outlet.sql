-- Opening balances become per outlet (approved 2026-11-07).
-- amount is Dr-signed: debit positive, credit negative (so contra accounts such as
-- accumulated depreciation and every liability/equity line fit one column), and the
-- sum over one outlet must be 0 for that outlet's Neraca to balance.
-- The old company-wide accounts.opening_balance (only KAS Rp2.000.000) is dropped,
-- per the user's choice to re-enter it per outlet.
CREATE TABLE IF NOT EXISTS account_opening_balances (
  account_id BIGINT UNSIGNED NOT NULL,
  outlet_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id, outlet_id),
  KEY idx_aob_outlet (outlet_id),
  CONSTRAINT fk_aob_account FOREIGN KEY (account_id) REFERENCES accounts (id),
  CONSTRAINT fk_aob_outlet FOREIGN KEY (outlet_id) REFERENCES outlets (id),
  CONSTRAINT fk_aob_user FOREIGN KEY (updated_by) REFERENCES users (id)
);

ALTER TABLE accounts DROP COLUMN opening_balance;
