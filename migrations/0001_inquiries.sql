CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  contact TEXT NOT NULL,
  email TEXT,
  project_type TEXT NOT NULL,
  message TEXT,
  language TEXT NOT NULL DEFAULT 'zh',
  consent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  photo_keys TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
