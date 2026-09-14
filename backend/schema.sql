-- À exécuter une fois dans l'onglet "Query" de Vercel Postgres (ou via psql)

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  tech_stack TEXT[] DEFAULT '{}',
  repo_url TEXT DEFAULT '',
  demo_url TEXT DEFAULT '',
  category TEXT DEFAULT '',        -- ex: offensive, defensive, devsecops
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS writeups (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ctf_name TEXT DEFAULT '',
  category TEXT DEFAULT '',        -- ex: pwn, web, crypto, forensics, rev, osint
  difficulty TEXT DEFAULT '',      -- ex: easy, medium, hard, insane
  summary TEXT DEFAULT '',
  content_markdown TEXT NOT NULL,  -- corps du writeup en Markdown
  tags TEXT[] DEFAULT '{}',
  external_link TEXT DEFAULT '',
  published_at DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Outils affichés dans les blocs "pacman -S" de la page d'accueil.
-- Gérés entièrement via le panneau admin (CRUD) : rien n'est codé en dur côté front.
CREATE TABLE IF NOT EXISTS tools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,               -- ex: nmap
  version TEXT DEFAULT '',          -- ex: 7.95
  category TEXT NOT NULL CHECK (category IN ('offensive', 'defensive', 'devsecops')),
  description TEXT DEFAULT '',      -- courte note optionnelle
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_writeups_slug ON writeups(slug);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);

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

-- Shared, atomic rate limit counters. Apply before deploying security changes.
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL CHECK (hits > 0),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expiry ON rate_limit_buckets(expires_at);
