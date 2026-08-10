TUNEWRAP STAGE 12.2.1 — PRICING CARD OPEN HOTFIX

Исправляет регрессию Stage 12.2:
карточки «Подробнее» на публичном сайте перестали нормально открываться.

Причина:
Pricing CMS наблюдал весь DOM через MutationObserver и сам же постоянно
переписывал/переставлял карточки, создавая цикл обновлений.

Исправлено:
- глобальный MutationObserver удалён;
- существующий script.js снова полностью отвечает за открытие/закрытие;
- Pricing CMS только подставляет D1-тексты и цены;
- порядок DOM меняется только если реально изменён;
- свадебный wide-adapter также больше не наблюдает собственные изменения.

Заменяются:
js/pricing-cms-runtime.js
js/wedding-detail-wide.js

Добавляется:
scripts/pricing-card-open-hotfix-test.js

Проверка:
node scripts/pricing-card-open-hotfix-test.js
npm.cmd test
npx.cmd wrangler pages functions build

GitHub Summary:
Stage 12.2.1 – Fix pricing card opening
