-- Optional: a starter service menu. Run once if your services table is empty,
-- then edit prices, durations and descriptions from the admin dashboard.

insert into public.services (name, description, duration_minutes, price, is_active)
select * from (values
  ('Swedish Relaxation Massage',
   'Long, flowing strokes with warm oil to ease everyday tension, quiet a busy mind and leave the whole body feeling lighter.',
   60, 95.00, true),
  ('Deep Tissue Massage',
   'Slow, focused pressure on the deeper layers of muscle — ideal for persistent tightness in the back, neck and shoulders.',
   60, 115.00, true),
  ('Hot Stone Massage',
   'Smooth, heated basalt stones combined with Swedish technique to soften muscles and invite deep, unhurried relaxation.',
   75, 135.00, true),
  ('Aromatherapy Massage',
   'A gentle full-body session with a personalised blend of essential oils chosen during your consultation.',
   60, 105.00, true),
  ('Sports & Recovery Massage',
   'Targeted work for active bodies — stretching, compression and trigger point techniques to support muscle health.',
   90, 150.00, true),
  ('Reflexology',
   'Calm, precise pressure on the feet and lower legs to restore a sense of balance from the ground up.',
   45, 75.00, true)
) as v(name, description, duration_minutes, price, is_active)
where not exists (select 1 from public.services);
