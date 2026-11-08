-- Reports requirement: show a description/note from the Chart of Accounts on
-- every report. `accounts` had no free-text field for this at all.
ALTER TABLE accounts
  ADD COLUMN description VARCHAR(255) NULL AFTER name;
