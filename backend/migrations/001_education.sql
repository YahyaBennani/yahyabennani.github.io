BEGIN;

CREATE TABLE IF NOT EXISTS education (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('education', 'certification')),
  institution TEXT NOT NULL DEFAULT '',
  period TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  verification_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  image JSONB,
  pdf JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Run once on the existing database, inside a transaction.
INSERT INTO education (title, kind, period, verification_url, sort_order) VALUES
('Engineering degree — Cybersecurity', 'education', 'In progress', '', 0),
('CRTA', 'certification', '', 'https://labs.cyberwarfare.live/credential/achievement/6a820ed2e8da8e3978e3a3f3', 1),
('Malware analysis fundamentals', 'certification', '', 'https://maharatech.gov.eg/mod/customcert/verify_certificate.php?code=qQnZqOcbWN&qrcode=1', 2),
('Mobile application security', 'certification', '', 'https://mliaedu.toubkalit.com/verify-certificate/35-7e86cb91-05e6-42b2-8abb-61830abf9f85-578695', 3),
('Mobile application development (Java)', 'certification', '', 'https://mliaedu.toubkalit.com/verify-certificate/13-7e86cb91-05e6-42b2-8abb-61830abf9f85-070104', 4);
COMMIT;
