TUNEWRAP WEB — STAGE 12.8.2
CERTIFICATE SIX-PACKAGES FIT HOTFIX

Проблема:
После Stage 12.8.1 первые 3 обычных тарифа были видны,
а 3 свадебных оказывались ниже видимой области.

Причина:
контейнер двух групп всё ещё был CSS Grid.
В компактном окне grid-строки растягивались по высоте,
создавая большое пустое пространство после первых трёх карточек.
Так как обычный скролл был специально отключён,
вторая группа визуально «терялась».

Исправление:
- группы «Персональная песня» и «Свадебный формат»
  теперь идут обычным плотным block-flow;
- убрано вертикальное растягивание grid;
- 3 обычных + 3 свадебных остаются в одном окне;
- desktop/tablet остаются без обычного скролла;
- phone остаётся компактным;
- только очень низкий landscape экран сохраняет safety-scroll.

Данные тарифов НЕ менялись.
Pricing CMS НЕ менялся.
CRM НЕ менялся.
D1 migration НЕ нужна.

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.8.2-certificate-fit.js
3. node scripts/stage-12.8.2-certificate-fit-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build
6. Restore _worker.bundle.
7. GitHub Summary:
   Stage 12.8.2 – Certificate Six Packages Fit
8. Commit to main → Push origin.
