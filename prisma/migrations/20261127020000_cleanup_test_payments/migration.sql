-- Remove unpaid test checkouts (samayhuf+ aliases and the "QA Test Smoke" row).
-- Never deletes a paid / paid_unassigned payment. Does not delete users
-- (the only plus-alias users are admin/staff logins; samayhuf@gmail.com has paid sales).
-- Backup: /workspace/ttm/backups/aitm-test-payments-2026-11-27T0158-Asia-Dhaka.json
-- SHA256 67d80e79520b7f5e82f0cd4acf6522d17c6dbe5a97e24168365a863707196227

CREATE TEMP TABLE _test_pay AS
SELECT id, lower(email) AS email
FROM "Payment"
WHERE status NOT IN ('paid', 'paid_unassigned')
  AND (
    id IN (
      'br4a5c3e344f925fb1',
      'br6bfd7d61adfe27ae',
      'brd2ef1f48ec116a38',
      'br57b6301c8cf849c7',
      'br27a788be769c3b3b',
      'br4d28cd8c5bbcef79',
      'br043fedc41c3319b2',
      'brc8646c1a652d83dc',
      'br2303246496785979',
      'br1c0107b16459d7ec',
      'br564a2131e3abede6',
      'brb5be8ed7d673e8c6',
      'br8078dc47b64576d7',
      'br7c2fc8ba3033a6ef',
      'brcde23bed7dd32199',
      'bref54fb609dc55b05',
      'brbd767b0d42bed122',
      'br837addf668c0a8ef',
      'brfd53c3f7eee244c7',
      'br01360a8495e804b2',
      'brf4503e0679d15308',
      'brb943feb4d49714a7',
      'brc6ea3c79c575c72b',
      'brc5a76833986cba2c'
    )
    OR email ~* '^samayhuf\+.*@gmail\.com$'
  );

-- Guard: refuse if a paid row somehow landed in the temp set.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "Payment" p
    JOIN _test_pay t ON t.id = p.id
    WHERE p.status IN ('paid', 'paid_unassigned')
  ) THEN
    RAISE EXCEPTION 'Refusing to delete a paid payment';
  END IF;
END $$;

DELETE FROM "FollowupSend"
WHERE "leadId" IN (SELECT id FROM "Lead" WHERE "orderId" IN (SELECT id FROM _test_pay));

DELETE FROM "Lead" WHERE "orderId" IN (SELECT id FROM _test_pay);

DELETE FROM "SystemEvent"
WHERE "paymentId" IN (SELECT id FROM _test_pay)
   OR (email IS NOT NULL AND lower(email) ~* '^samayhuf\+.*@gmail\.com$');

DELETE FROM "EmailLog"
WHERE lower("toEmail") ~* '^samayhuf\+.*@gmail\.com$';

DELETE FROM "LoginCode"
WHERE lower(email) ~* '^samayhuf\+.*@gmail\.com$';

DELETE FROM "Payment" WHERE id IN (SELECT id FROM _test_pay) AND status NOT IN ('paid', 'paid_unassigned');

INSERT INTO "SystemEvent" (
  "id", "createdAt", "type", "status", "summary", "detail", "tag", "dedupeKey"
) VALUES (
  'cleanup_test_payments_20261127',
  NOW(),
  'admin',
  'cleanup',
  'Removed unpaid test payments (samayhuf+ aliases and QA smoke). Paid sales were kept.',
  'Backup /workspace/ttm/backups/aitm-test-payments-2026-11-27T0158-Asia-Dhaka.json. Future samayhuf+ checkouts are flagged isTest and hidden from payments, sales and the funnel by default.',
  'admin',
  'admin:cleanup:test-payments:20261127'
)
ON CONFLICT ("dedupeKey") DO NOTHING;

DROP TABLE _test_pay;
