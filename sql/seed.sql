PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO admin_users (full_name, email, password_hash, role)
VALUES ('Arun Kumar', 'admin@wendersbengaluru.in', 'REPLACE_WITH_A_BCRYPT_HASH', 'admin');

INSERT OR IGNORE INTO places (name, area, type, status, image_url, description) VALUES
  ('Ooty', 'Nilgiris', 'Hill station', 'Live', '/images/otty.jpg', 'Tea gardens, misty mornings and slow mountain days.'),
  ('Wayanad', 'Kerala', 'Forest escape', 'Live', 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=900&q=85', 'Rainforest trails, waterfalls and quiet stays.'),
  ('Mysuru', 'Karnataka', 'Heritage city', 'Live', 'https://images.unsplash.com/photo-1600100397608-f010a3c50eaf?auto=format&fit=crop&w=900&q=85', 'Palaces, markets and a generous taste of history.'),
  ('Chikkamagaluru', 'Karnataka', 'Coffee country', 'Live', 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85', 'Cloud-kissed peaks and fresh coffee estates.'),
  ('Coorg', 'Karnataka', 'Rainy retreat', 'Draft', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85', 'Homestays, spice gardens and monsoon calm.'),
  ('Gokarna', 'Karnataka', 'Coastal escape', 'Draft', 'https://images.unsplash.com/photo-1507529910107-8f1f4f4d3c4c?auto=format&fit=crop&w=900&q=85', 'Quiet beaches for a softer kind of weekend.');

INSERT OR IGNORE INTO customers (full_name, email, location) VALUES
  ('Ananya Rao', 'ananya.rao@email.com', 'Bengaluru'),
  ('Rohan Mehta', 'rohan.mehta@email.com', 'Indiranagar'),
  ('Meera Krishnan', 'meera.k@email.com', 'Jayanagar'),
  ('Arjun Shah', 'arjun.shah@email.com', 'Koramangala');

INSERT INTO enquiries (customer_id, project_type, message, arrival_date, departure_date, travellers, status, estimated_value, enquiry_date)
SELECT id, 'Ooty weekend', 'Looking for a slow mountain escape with a good local stay.', '2026-10-10', '2026-10-12', '2 travellers', 'New', 350000, '2026-09-18'
FROM customers WHERE email = 'ananya.rao@email.com' AND NOT EXISTS (SELECT 1 FROM enquiries WHERE customer_id = customers.id);

INSERT INTO enquiries (customer_id, project_type, message, arrival_date, departure_date, travellers, status, estimated_value, enquiry_date)
SELECT id, 'Wayanad escape', 'Planning a rainforest weekend with easy trails and waterfalls.', '2026-10-16', '2026-10-19', '2 travellers', 'Planning', 900000, '2026-09-16'
FROM customers WHERE email = 'rohan.mehta@email.com' AND NOT EXISTS (SELECT 1 FROM enquiries WHERE customer_id = customers.id);

INSERT INTO enquiries (customer_id, project_type, message, arrival_date, departure_date, travellers, status, estimated_value, enquiry_date)
SELECT id, 'Mysuru heritage tour', 'Need a thoughtful palace, food and culture itinerary.', '2026-10-24', '2026-10-26', '2 travellers', 'Confirmed', 180000, '2026-09-12'
FROM customers WHERE email = 'meera.k@email.com' AND NOT EXISTS (SELECT 1 FROM enquiries WHERE customer_id = customers.id);

INSERT INTO enquiries (customer_id, project_type, message, arrival_date, departure_date, travellers, status, estimated_value, enquiry_date)
SELECT id, 'Chikkamagaluru stay', 'A quiet coffee estate weekend for two.', '2026-11-05', '2026-11-08', '2 travellers', 'Completed', 220000, '2026-09-08'
FROM customers WHERE email = 'arjun.shah@email.com' AND NOT EXISTS (SELECT 1 FROM enquiries WHERE customer_id = customers.id);