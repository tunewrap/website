TUNEWRAP — STAGE 12.13.8.2
ENGLISH-FIRST FALLBACK COMPLETION

Это маленький исправляющий пакет после Stage 12.13.8.

Текущий audit остановился на:
RU-first fallback remains: locales?.ru||offer?.locales?.en

Это означает не «всё сломано», а что audit нашёл ещё один старый fallback,
который установщик 12.13.8 не заменил.

Что делает 12.13.8.2:
- проходит только public runtime modules, связанные с языком;
- меняет оставшиеся fallback-последовательности RU -> EN на EN -> RU;
- проверяет синтаксис каждого изменённого JS;
- только после всех проверок записывает файлы;
- не трогает Audio / Queue / Seek / Player playback logic / API / D1 / Admin.

Итоговая политика:
selected native language -> EN -> RU legacy rescue.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.8.2-english-first-fallback-completion.js
3. node scripts/stage-12.13.8.2-english-first-fallback-completion-test.js
4. node scripts/stage-12.13.8-global-i18n-audit.js
5. npm.cmd test

D1 НЕ НУЖНА.

GitHub Desktop Summary после всех PASS:
Stage 12.13.8.2 – Complete Global I18N Fallbacks
