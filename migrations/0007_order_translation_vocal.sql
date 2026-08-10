ALTER TABLE orders ADD COLUMN vocal_choice TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN translation_ru_json TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN translation_ru_at TEXT NOT NULL DEFAULT '';

INSERT OR REPLACE INTO cms_meta(key,value,updated_at)
VALUES ('ordersSchemaVersion','3',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
