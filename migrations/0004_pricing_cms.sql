-- TuneWrap Stage 12.2 — Pricing CMS
CREATE TABLE IF NOT EXISTS pricing_config (
  id TEXT PRIMARY KEY CHECK(id = 'main'),
  config_json TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  last_edited_by TEXT NOT NULL DEFAULT 'migration'
);

INSERT OR IGNORE INTO pricing_config(id,config_json,schema_version,updated_at,last_edited_by)
VALUES(
  'main',
  '{"schemaVersion":1,"currency":"USD","urgentFee":25,"settings":{"locales":{"ru":{"pricingEyebrow":"Стоимость и форматы","pricingTitle":"Выберите свой формат","pricingIntro":"Выберите глубину работы: от песни по готовому тексту до полного создания истории и текста.","promoTitle":"Ограниченная стартовая акция","promoUntil":"Только до 31 августа","weddingTitle":"Свадебный формат","weddingSubtitle":"Музыка для моментов, которые останутся с вами навсегда.","detailsLabel":"Подробнее","weddingPanelLabel":"Для вашей свадьбы","whatIncluded":"Что входит","idealFor":"Идеально подходит для","tierSelect":"Выбрать тариф и продолжить","urgentLabel":"Срочная доставка за 24 часа (+${fee})"}}},"tiers":[{"id":"simple","enabled":true,"order":1,"oldPrice":39,"price":19,"locales":{"ru":{"name":"Просто","badge":"","features":["Ваш текст или идея — в песне","1 стиль на выбор","Базовый монтаж дублей","Доставка 48–72 часа"]}}},{"id":"advanced","enabled":true,"order":2,"oldPrice":99,"price":49,"locales":{"ru":{"name":"Продвинутый","badge":"Популярный","features":["Всё из тарифа «Просто»","Ручной отбор дублей и сведение","До 2 бесплатных правок текста","Доставка 24–48 часов"]}}},{"id":"hit","enabled":true,"order":3,"oldPrice":199,"price":139,"locales":{"ru":{"name":"Хит","badge":"","features":["Всё из тарифа «Продвинутый»","Углублённая продюсерская работа","Правки текста до утверждения","Инструментальная версия в подарок"]}}}],"weddings":[{"id":"first-dance","enabled":true,"order":1,"oldPrice":99,"price":49,"locales":{"ru":{"name":"First Dance","short":"Песня для первого танца","description":"Персональная песня для вашего первого танца. История, слова и музыка, созданные только для вас двоих.","includes":["сбор истории пары","написание персонального текста","создание музыки","готовая песня в MP3","текст песни","обложка","версия для свадебного танца"],"ideal":"Первый танец молодожёнов","button":"Выбрать First Dance"}}},{"id":"love-story","enabled":true,"order":2,"oldPrice":199,"price":99,"locales":{"ru":{"name":"Love Story","short":"История вашей любви","description":"История вашего знакомства, любви и пути к свадьбе, превращённая в полноценную песню.","includes":["подробный сбор истории","ключевые моменты знакомства и отношений","персональный текст","музыка и вокал","готовая песня в MP3","текст песни","обложка","версия для видео Love Story"],"ideal":"Love Story, свадебное видео, церемония или подарок","button":"Выбрать Love Story"}}},{"id":"wedding-collection","enabled":true,"order":3,"oldPrice":299,"price":149,"locales":{"ru":{"name":"Wedding Collection","short":"Музыка для всей свадьбы","description":"Персональная музыкальная коллекция для самых важных моментов вашей свадьбы.","includes":["песня для первого танца","история любви пары","песня-благодарность родителям","семейная или финальная песня","единый стиль обложек","комплект MP3 и текстов"],"ideal":"Полное музыкальное оформление свадебной истории","button":"Выбрать Wedding Collection"}}}]}',
  1,
  strftime('%Y-%m-%dT%H:%M:%fZ','now'),
  'stage-12.2-migration'
);

INSERT OR REPLACE INTO cms_meta(key,value,updated_at)
VALUES ('pricingSchemaVersion','1',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
