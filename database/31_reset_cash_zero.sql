-- Reset cash to zero (approved 2026-11-07): drop the Rp10.000.000 opening balance
-- on 1000 KAS DAN BANK and the test journal JRN-260912-0001 (Lotus Jam paid from KAS).
START TRANSACTION;

UPDATE accounts SET opening_balance = 0 WHERE code = '1000';

DELETE jl FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE je.journal_no = 'JRN-260912-0001';
DELETE FROM journal_entries WHERE journal_no = 'JRN-260912-0001';

COMMIT;
