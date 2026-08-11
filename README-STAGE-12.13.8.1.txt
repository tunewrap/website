TUNEWRAP — STAGE 12.13.8.1
I18N DICTIONARY COMPLETION

ЧТО ПРОИЗОШЛО
Stage 12.13.8 установился, но его собственный audit правильно остановил npm test:

script.js needs player_back in all five language dictionaries; found 4

ПРИЧИНА
В установщике 12.13.8 была ошибка idempotency-check:
он проверял наличие текста player_back глобально во всём script.js.

RU и UA имеют одинаковое player_back = "Назад".
После вставки RU установщик видел "Назад" в файле и ошибочно считал,
что UA-блок уже тоже заполнен.

В результате:
RU / GE / EN / DE получили Player keys,
а UA-блок остался неполным.

Это НЕ поломка сайта целиком.
Audit как раз сделал свою работу и поймал одну незавершённую локализацию
до Commit/Push.

ЧТО ДЕЛАЕТ 12.13.8.1
- проверяет КАЖДЫЙ языковой блок отдельно;
- дописывает только отсутствующие player_* keys;
- безопасно работает повторно;
- не трогает Audio / Queue / Player logic / CMS / API / D1;
- не меняет существующие переводы, если они уже есть.

УСТАНОВКА
1. Распаковать ZIP поверх website.
2. node scripts/install-stage-12.13.8.1-i18n-dictionary-completion.js
3. node scripts/stage-12.13.8.1-i18n-dictionary-completion-test.js
4. node scripts/stage-12.13.8-global-i18n-audit.js
5. npm.cmd test

D1 НЕ НУЖНА.

GitHub Desktop Summary:
Stage 12.13.8.1 – Complete Global I18N Dictionaries
