# TuneWrap Stage 12.1 — Tablet & Desktop Experience

Цель: убрать старый desktop-слой и перенести на планшет/компьютер новую premium black-and-gold визуальную систему, которая уже работает на телефоне.

## Важно

Телефон <= 620 px НЕ переделывается.

Новый `css/responsive-wide.css` работает только от 621 px.
Track Catalog, Global Queue, D1, R2, Orders API и аудио-движок не переписываются.

## Что меняется на планшете/компьютере

- единая чёрно-золотая визуальная система вместо старого фиолетового desktop;
- новая версия Hero с тем же направлением, что и mobile;
- Philosophy / How it Works / Stories / Author / Pricing / Order / Contacts;
- тарифы и wedding packages становятся нормальной wide-сеткой;
- заказ удобно заполнять с клавиатуры на компьютере;
- Full Player теперь открывается на tablet/desktop;
- Top Mini Player работает на tablet/desktop;
- полные музыкальные библиотеки получают wide shell и grid;
- Corporate и Tier Detail остаются существующими overlay, но получают wide-композицию.

## Изменённые файлы

NEW:
- css/responsive-wide.css
- js/responsive-wide.js
- scripts/responsive-wide-test.js
- README-STAGE-12.1.txt
- STAGE-12.1-CHANGED-FILES.txt

MODIFIED:
- js/app-bootstrap.js
- package.json

## Специально НЕ менялось

- css/style.css
- index.html
- js/script.js
- js/playback-engine.js
- js/catalog-runtime.js
- Track Catalog
- Global Queue
- D1 / R2
- Orders API
- Admin Studio

Это сделано специально, чтобы не рисковать уже проверенной мобильной версией и музыкальным движком.

## Установка

Распаковать ZIP поверх корня `website`.

Windows спросит о замене:
- `js/app-bootstrap.js`
- `package.json`

Разрешить замену.

## Проверка

PowerShell из `website`:

```powershell
npm.cmd test
npx.cmd wrangler pages functions build
```

Ожидается новый PASS:

`PASS: Stage 12.1 responsive contract ...`

и:

`Compiled Worker successfully`

## GitHub Desktop

Summary:

`Stage 12.1 – Tablet and desktop experience`

Commit to main → Push origin.

После зелёного Cloudflare deployment:

### Телефон
Проверить 1–2 экрана. Они должны выглядеть как раньше.

### Компьютер
Открыть сайт → Ctrl+F5.
Проверить:
1. Hero.
2. Stories / Author.
3. Pricing.
4. Order form.
5. Contacts.
6. Открыть песню кликом по большой карточке.
7. Свернуть Full Player — должен остаться компактный Mini Player справа сверху.

### Планшет
Проверить portrait и landscape, особенно Hero, Pricing и Order.
