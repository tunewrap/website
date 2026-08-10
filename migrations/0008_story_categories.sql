ALTER TABLE tracks ADD COLUMN story_category_ids_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS story_categories_config (
  id TEXT PRIMARY KEY,
  config_json TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  last_edited_by TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO story_categories_config(id,config_json,schema_version,updated_at,last_edited_by)
VALUES(
  'main',
  '{"schemaVersion":1,"categories":[{"id":"birthday","enabled":true,"order":1,"labels":{"ru":"День рождения","uk":"День народження","ka":"დაბადების დღე","en":"Birthday","de":"Geburtstag"}},{"id":"anniversary","enabled":true,"order":2,"labels":{"ru":"Юбилей","uk":"Ювілей","ka":"იუბილე","en":"Anniversary","de":"Jubiläum"}},{"id":"wedding","enabled":true,"order":3,"labels":{"ru":"Свадьба","uk":"Весілля","ka":"ქორწილი","en":"Wedding","de":"Hochzeit"}},{"id":"love","enabled":true,"order":4,"labels":{"ru":"Любовь","uk":"Кохання","ka":"სიყვარული","en":"Love","de":"Liebe"}},{"id":"family","enabled":true,"order":5,"labels":{"ru":"Семья","uk":"Родина","ka":"ოჯახი","en":"Family","de":"Familie"}},{"id":"children","enabled":true,"order":6,"labels":{"ru":"Для детей","uk":"Для дітей","ka":"ბავშვებისთვის","en":"For children","de":"Für Kinder"}},{"id":"congratulations","enabled":true,"order":7,"labels":{"ru":"Поздравления","uk":"Привітання","ka":"მილოცვები","en":"Congratulations","de":"Glückwünsche"}},{"id":"life","enabled":true,"order":8,"labels":{"ru":"О жизни","uk":"Про життя","ka":"ცხოვრებაზე","en":"Life","de":"Über das Leben"}}]}',
  1,
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),
  'stage-12.7-migration'
);

INSERT OR REPLACE INTO cms_meta(key,value,updated_at)
VALUES('storyCategoriesSchemaVersion','1',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
