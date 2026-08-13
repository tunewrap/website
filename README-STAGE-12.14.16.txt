TUNEWRAP — STAGE 12.14.16
SEARCH INDEXING SEO

ЦЕЛЬ

Подготовить https://tunewrap.studio к регистрации и индексации в Google Search
Console и Bing Webmaster Tools без изменения интерфейса и рабочей логики сайта.

ЧТО ДОБАВЛЕНО

- robots.txt разрешает индексацию публичного сайта и закрывает технические зоны;
- sitemap.xml содержит английскую, русскую, украинскую, грузинскую и немецкую
  версии сайта;
- canonical и hreflang связывают пять языковых адресов;
- отдельные SEO title и description для EN / RU / UA / GE / DE;
- Open Graph и Twitter metadata;
- Organization + WebSite structured data;
- фирменный favicon.svg;
- X-Robots-Tag noindex для Admin Studio и API;
- автоматический тест SEO-конфигурации.

НЕ ИЗМЕНЕНО

- дизайн и видимый текст страниц;
- мобильная навигация и обновление с возвратом на Home;
- плеер, очередь и аудио;
- переводы сайта и админка;
- D1, R2, формы и API.

УСТАНОВКА

1. Распаковать ZIP в корень website с заменой файлов.
2. Выполнить:

   npm.cmd test
   npx.cmd wrangler pages functions build

3. После сборки удалить из Changes только _worker.bundle.
4. GitHub Desktop Summary:

   Stage 12.14.16 – Search Indexing SEO

5. Commit to main -> Push origin -> дождаться зелёного Cloudflare.

ПРОВЕРКА ПОСЛЕ ПУБЛИКАЦИИ

- https://tunewrap.studio/robots.txt
- https://tunewrap.studio/sitemap.xml
- https://tunewrap.studio/favicon.svg

После успешной публикации добавить домен в Google Search Console и Bing
Webmaster Tools, отправить sitemap.xml и запросить индексацию главной страницы.

D1 migration: not required.
