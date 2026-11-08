-- COA: opening balance per account, entered as a plain non-negative amount on
-- that account's own normal-balance side (debit for ASSET/EXPENSE, credit for
-- LIABILITY/EQUITY/REVENUE) — no debit/credit sign for the user to reason
-- about. Not yet wired into any report calculation (Balance Sheet, P&L, etc.
-- still compute opening balances purely from pre-period journal_lines) — this
-- migration only adds the data field + COA display.
ALTER TABLE accounts
  ADD COLUMN opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER description;
