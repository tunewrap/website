CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  legacy_key TEXT,
  title TEXT NOT NULL,
  original_title TEXT,
  titles_json TEXT NOT NULL DEFAULT '{}',
  descriptions_json TEXT NOT NULL DEFAULT '{}',
  section TEXT NOT NULL CHECK(section IN ('stories','author')),
  language TEXT NOT NULL CHECK(language IN ('GE','UA','EN','DE','RU')),
  audio_url TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  artwork_json TEXT NOT NULL DEFAULT '{}',
  lyrics_json TEXT NOT NULL DEFAULT '{}',
  translation_json TEXT NOT NULL DEFAULT '{}',
  artist TEXT NOT NULL DEFAULT 'TuneWrap',
  album TEXT NOT NULL DEFAULT '',
  category_json TEXT NOT NULL DEFAULT '{}',
  tags_json TEXT NOT NULL DEFAULT '[]',
  duration_label TEXT NOT NULL DEFAULT '',
  duration REAL NOT NULL DEFAULT 0,
  audio_quality_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL CHECK(sort_order > 0),
  featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  schema_version INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  last_edited_by TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS tracks_section_order_active
  ON tracks(section, sort_order) WHERE archived = 0;
CREATE INDEX IF NOT EXISTS tracks_public_queue
  ON tracks(published, archived, section, sort_order);
CREATE INDEX IF NOT EXISTS tracks_language
  ON tracks(section, language, published, archived);
CREATE UNIQUE INDEX IF NOT EXISTS tracks_featured_section
  ON tracks(section) WHERE featured = 1 AND published = 1 AND archived = 0;

CREATE TABLE IF NOT EXISTS cms_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR REPLACE INTO cms_meta(key,value,updated_at)
VALUES ('schemaVersion','2',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
