TUNEWRAP — STAGE 12.12.2
ORDER PACKAGE RESTORE + ANNOUNCEMENT POSITION

1. КУДА ИСЧЕЗЛИ ПАКЕТЫ В АНКЕТЕ

Причина найдена.

Поле «Пакет и стоимость» создаёт не HTML, а js/ux-critical-fixes.js:
- #regularPackageField
- #fieldTier

Stage 12.10 затем превращает этот select в фирменное окно выбора 6 пакетов.

После Stage 12.11 в функции validContact появились некорректно записанные slash/regex escapes.
Из-за этого browser module ux-critical-fixes.js мог не выполниться целиком.
Если этот module не запускается:
- #regularPackageField не создаётся;
- Stage 12.10 нечего превращать в package chooser;
- в анкете после summary сразу идёт «Стиль песни».

Именно это видно на скринах.

12.12.2:
- полностью заменяет проблемную validContact на syntax-safe реализацию;
- installer ОБЯЗАТЕЛЬНО запускает node --check js/ux-critical-fixes.js;
- существующий package selector восстанавливается;
- сохраняются все 6 пакетов: Просто / Продвинутый / Хит / First Dance / Love Story / Wedding Collection;
- core уже слушает tunewrap:set-order-tier / tunewrap:set-order-wedding, поэтому менять order architecture не нужно.

2. НОВОСТЬ НА ГЛАВНОЙ

Раньше announcement вставлялся внутрь текстовой колонки Hero.
На мобильном эта колонка начинается визуально довольно низко, поэтому новость оказывалась почти посередине волны.

Теперь announcement:
- физически переносится непосредственно в #hero;
- позиционируется сверху Hero;
- phone: 14px от верхнего края;
- tablet: 16px;
- desktop: 18px;
- текст Hero не ломается и не сдвигается.

D1 migration НЕ НУЖНА.

Установка:
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.12.2-package-announcement-fix.js
3. node scripts/stage-12.12.2-package-announcement-test.js
4. npm.cmd test
5. npx.cmd wrangler pages functions build

После PASS:
restore _worker.bundle

GitHub Desktop Summary:
Stage 12.12.2 – Order Package Restore + Announcement Position

Commit to main → Push origin.

ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ

PHONE:
- открыть анкету;
- сразу после summary должна снова быть кнопка «Выберите пакет»;
- открыть её → 6 пакетов;
- выбрать «Просто» → summary должен показать пакет и цену.

HOME:
- новость должна стоять в верхней части Hero, а не внутри середины волны.

DESKTOP:
- пакет снова виден в анкете;
- новость стоит у верхней части Hero.
