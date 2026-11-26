-- Idempotent cleanup of clearly identified test / internal QA data.
-- Does not touch real customer pending orders (Salman Alam, Sunil, Rekha Robidas),
-- Samay's admin/staff login users, ryan@googlinks.com, or the phone-only internal user.
-- A full pg_dump was taken before this ran: /workspace/ttm/backups/aitm-prod-2026-11-26T1310-Asia-Dhaka.dump

DELETE FROM "FollowupSend"
WHERE "leadId" IN (SELECT id FROM "Lead" WHERE "orderId" IN ('brdeff38e6d9840b04', 'br6b4764b43b4b9528', 'brbc59650d70dfded7', 'brd552897936455044', 'br71c2b5825e9f8af1', 'br9d02b3061b5078de', 'brbb1cb9d35c488f9b', 'bradb79f939a29a6a3', 'br754e0b809a660ac3', 'manual_mww7wz7t_0979c0ca', 'br680d8cb59d6c9297', 'br444fa5589fc986e2', 'br2accc5fa1b014d2e', 'br8ac694e7900e5d11', 'brf550bdb99f513e53', 'br40e2035664960854', 'br512fa6a030ab54c8', 'br38ffce318341a0f2', 'br27268f7763c52977', 'br5213cce0e2747a49', 'br30a8b0baed4f4749', 'br90571b84f688bee7', 'br50c377520afe8a05', 'brfc723a5cb7664861', 'br0a5ff2258f2b3250', 'br874a179177f5c4e7', 'br1f7d12d366591e0f', 'braf9d851235c37da4', 'brd0726ad605ad7242', 'br1a6e7907fdd1ea8c', 'br62a6f5b361455a37'));

DELETE FROM "Lead" WHERE "orderId" IN ('brdeff38e6d9840b04', 'br6b4764b43b4b9528', 'brbc59650d70dfded7', 'brd552897936455044', 'br71c2b5825e9f8af1', 'br9d02b3061b5078de', 'brbb1cb9d35c488f9b', 'bradb79f939a29a6a3', 'br754e0b809a660ac3', 'manual_mww7wz7t_0979c0ca', 'br680d8cb59d6c9297', 'br444fa5589fc986e2', 'br2accc5fa1b014d2e', 'br8ac694e7900e5d11', 'brf550bdb99f513e53', 'br40e2035664960854', 'br512fa6a030ab54c8', 'br38ffce318341a0f2', 'br27268f7763c52977', 'br5213cce0e2747a49', 'br30a8b0baed4f4749', 'br90571b84f688bee7', 'br50c377520afe8a05', 'brfc723a5cb7664861', 'br0a5ff2258f2b3250', 'br874a179177f5c4e7', 'br1f7d12d366591e0f', 'braf9d851235c37da4', 'brd0726ad605ad7242', 'br1a6e7907fdd1ea8c', 'br62a6f5b361455a37');

DELETE FROM "LoginCode" WHERE lower(email) IN ('aitm.cp1test.1400@mailinator.com', 'ewf2fe2@dell.com', 'neerajsingh.uvt@gmail.com', 'qa-test@theaitimemachine.com', 'samayhuf+aitm-customer@gmail.com', 'samayhuf+aitmflow2025d@gmail.com', 'samayhuf+aitmflow2025m@gmail.com', 'samayhuf+aitm-prodcheck@gmail.com', 'samay@krosz.com');

DELETE FROM "EmailLog" WHERE lower("toEmail") IN ('aitm.cp1test.1400@mailinator.com', 'ewf2fe2@dell.com', 'neerajsingh.uvt@gmail.com', 'qa-test@theaitimemachine.com', 'samayhuf+aitm-customer@gmail.com', 'samayhuf+aitmflow2025d@gmail.com', 'samayhuf+aitmflow2025m@gmail.com', 'samayhuf+aitm-prodcheck@gmail.com', 'samay@krosz.com');

DELETE FROM "SmsLog" WHERE phone IN ('+919821453901', '+919821451280', '+919821451400');

DELETE FROM "Payment" WHERE id IN ('brdeff38e6d9840b04', 'br6b4764b43b4b9528', 'brbc59650d70dfded7', 'brd552897936455044', 'br71c2b5825e9f8af1', 'br9d02b3061b5078de', 'brbb1cb9d35c488f9b', 'bradb79f939a29a6a3', 'br754e0b809a660ac3', 'manual_mww7wz7t_0979c0ca', 'br680d8cb59d6c9297', 'br444fa5589fc986e2', 'br2accc5fa1b014d2e', 'br8ac694e7900e5d11', 'brf550bdb99f513e53', 'br40e2035664960854', 'br512fa6a030ab54c8', 'br38ffce318341a0f2', 'br27268f7763c52977', 'br5213cce0e2747a49', 'br30a8b0baed4f4749', 'br90571b84f688bee7', 'br50c377520afe8a05', 'brfc723a5cb7664861', 'br0a5ff2258f2b3250', 'br874a179177f5c4e7', 'br1f7d12d366591e0f', 'braf9d851235c37da4', 'brd0726ad605ad7242', 'br1a6e7907fdd1ea8c', 'br62a6f5b361455a37');

DELETE FROM "User" WHERE id IN ('cmwtechcc000cju2y8ujme111', 'cmwtegph4002bju2yhmiiz1rj', 'cmwufmj0a0003pt2yh7ykwmra');
