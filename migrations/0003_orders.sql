CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  client_submission_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK(status IN ('new','in_progress','waiting_client','done','archived')),
  order_type TEXT NOT NULL DEFAULT 'order'
    CHECK(order_type IN ('order','certificate','wedding','corporate')),
  interface_language TEXT NOT NULL DEFAULT 'ru'
    CHECK(interface_language IN ('ru','uk','ka','en','de')),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  occasion TEXT NOT NULL DEFAULT '',
  occasion_detail TEXT NOT NULL DEFAULT '',
  story_core TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  golden_answers_json TEXT NOT NULL DEFAULT '[]',
  tier_label TEXT NOT NULL DEFAULT '',
  wedding_package_id TEXT NOT NULL DEFAULT '',
  wedding_package_label TEXT NOT NULL DEFAULT '',
  styles_json TEXT NOT NULL DEFAULT '[]',
  urgent INTEGER NOT NULL DEFAULT 0 CHECK(urgent IN (0,1)),
  quoted_price INTEGER,
  raw_message TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'web',
  source_url TEXT NOT NULL DEFAULT '',
  internal_notes TEXT NOT NULL DEFAULT '',
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_edited_by TEXT NOT NULL DEFAULT 'public-form'
);

CREATE INDEX IF NOT EXISTS orders_status_created
  ON orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_created
  ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS orders_contact
  ON orders(contact);

INSERT OR REPLACE INTO cms_meta(key,value,updated_at)
VALUES ('ordersSchemaVersion','1',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
