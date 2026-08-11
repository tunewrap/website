FIX2 NOTE
Исправлена вторая ошибка установщика:
- прошлый динамический RegExp для I18N был переэкранирован и искал буквальный \s вместо пробелов;
- теперь I18N блоки EN/RU/UA/GE/DE находятся без RegExp: внутри границ реального const I18N;
- добавлен preflight текущей Stage 12.13.7.1 структуры;
- установщик остаётся транзакционным: при любой ошибке рабочий проект не изменяется.



FIXED PACKAGE NOTE
Этот ZIP исправляет установщик для Windows/PowerShell:
- учитывает CRLF строки Windows;
- все изменения транзакционные: если любой anchor/test не найден, рабочие файлы НЕ изменяются;
- временные playerlang/playeri18nlock tests удаляются из общего npm test chain, потому что Stage 12.13.8 их архитектуру заменяет.

TUNEWRAP — STAGE 12.13.8
GLOBAL I18N CONSISTENCY
Native EN / RU / UA / GE / DE + Google/Chrome Translate

ПРОБЛЕМА ПОСЛЕ 12.13.7 / 12.13.7.1
В Full Player данные трека уже могли быть на выбранном языке,
но кнопки оставались English. На других комбинациях появлялись RU-фрагменты.
При включении Google Translate возникала ещё одна независимая система перевода.

ГЛУБОКИЙ АУДИТ НАШЁЛ 5 АРХИТЕКТУРНЫХ ПРИЧИН

1. ДВА ОТДЕЛЬНЫХ I18N ДЛЯ ОДНОГО FULL PLAYER
Основной сайт использует data-i18n + I18N в script.js.
Full Player параллельно получил PLAYER_VISIBLE_UI в playback-engine.js.
Два владельца одного текста начали расходиться.

2. STAGE 12.13.7.1 ЗАПРЕТИЛ GOOGLE TRANSLATE ПЕРЕВОДИТЬ ВЕСЬ PLAYER
На songPlayerScreen / topMiniPlayer был notranslate + translate=no.
Поэтому Google мог переводить страницу, но Player оставался в собственном языке.

3. PUBLIC RUNTIME-МОДУЛИ ЧИТАЛИ document.documentElement.lang
Pricing, Site CMS, Sound, Order, Gift, Contact, UX и другие модули определяли
язык непосредственно из DOM.
Это плохой source of truth при работе браузерного переводчика:
browser translation и native TuneWrap language — разные вещи.

4. СТАРЫЙ RU-FIRST FALLBACK
В нескольких местах при отсутствующей локали было:
requested -> RU -> EN.
Для international English-first TuneWrap это приводит к случайным русским словам.

5. ПОСЛЕ DEPLOY МОГЛИ СМЕШИВАТЬСЯ INDEX И СТАРЫЙ CACHED JS
I18N-критические module imports не имели deploy-version query.
12.13.8 добавляет один cache generation ?v=12.13.8 без изменения порядка bootstrap.

НОВАЯ СХЕМА

A. НАТИВНЫЙ ЯЗЫК TUNEWRAP
Есть один стабильный owner:
document.documentElement.dataset.tunewrapLang
window.TUNEWRAP_CURRENT_LANGUAGE
window.TuneWrapLanguage.get()

Он знает только:
EN / RU / UK(UA) / KA(GE) / DE

Google Translate не управляет этим состоянием.

B. FULL PLAYER
Видимые кнопки Full Player теперь снова принадлежат ОСНОВНОМУ i18n сайта:
data-i18n + I18N.

EN:
Back / Minimize / Lyrics / Translation / Order a similar story

RU:
Назад / Свернуть / Текст песни / Перевод / Заказать похожую историю

UA:
Назад / Згорнути / Текст пісні / Переклад / Замовити схожу історію

GE:
უკან / ჩაკეცვა / სიმღერის ტექსტი / თარგმანი / ...

DE:
Zurück / Minimieren / Songtext / Übersetzung / ...

C. GOOGLE / CHROME TRANSLATE
Весь Full Player снова разрешён к переводу браузером.
NOTRANSLATE оставлен только там, где это действительно нужно:
- TuneWrap brand;
- EN / RU / UA / GE / DE codes;
- language badge трека.

То есть:
Native TuneWrap selector -> работает своим i18n.
Google Translate -> может поверх перевести весь клиентский интерфейс,
включая Full Player и кнопки.

D. DYNAMIC MODULES
Переведены на стабильный TuneWrapLanguage.get():
- Track Catalog runtime
- Full Player / Playback UI
- Site CMS
- Pricing CMS
- Sound Preferences
- Gift Certificate
- Order Intake
- Orders submit
- Package chooser
- Contact channel selector
- Critical UX
- Wide desktop copy

E. FALLBACK
Public missing locale:
selected language -> English -> Russian legacy rescue.

Русский больше не является первым fallback международного сайта.

ЧТО НЕ МЕНЯЕТСЯ
- Audio engine
- Queue
- Next / Previous
- Seek
- Media Session
- D1
- Admin
- Orders schema
- Pricing data
- Site CMS data
- Sound CMS data
- First Paint / Stage 12.13.6.3
- Mini Player X

D1 MIGRATION НЕ НУЖНА.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.8-global-i18n-consistency.js
3. node scripts/stage-12.13.8-global-i18n-audit.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS восстановить _worker.bundle.

GitHub Desktop Summary:
Stage 12.13.8 – Global I18N Consistency

Commit to main → Push origin.

ПРОВЕРКА ПОСЛЕ DEPLOY

Сначала Incognito, Google Translate OFF:

EN:
tunewrap.studio
Full Player: Back / Minimize / Lyrics / Order a similar story

UA:
tunewrap.studio/?lang=uk
Full Player: Назад / Згорнути / Текст пісні / Замовити схожу історію

GE:
tunewrap.studio/?lang=ka
Full Player: უკან / ჩაკეცვა / სიმღერის ტექსტი

DE:
tunewrap.studio/?lang=de
Full Player: Zurück / Minimieren / Songtext

RU:
tunewrap.studio/?lang=ru
Full Player: Назад / Свернуть / Текст песни

ПОТОМ GOOGLE TRANSLATE
Открыть любую из этих страниц и включить перевод Chrome.
Player больше НЕ имеет translate=no на всём контейнере,
поэтому кнопки и динамический текст доступны Google Translate.

ВАЖНО
Brand TuneWrap и коды языков намеренно не переводятся.
Это единственные элементы, которые должны оставаться стабильными.
