TUNEWRAP STAGE 12.1.1 — HERO WIDE HOTFIX

Исправляет только tablet/desktop Hero.

Что изменено:
- убраны две лишние кнопки:
  "Послушать истории"
  "Автор проекта и его песни"
- оставлена одна основная CTA, как на телефоне;
- убран эффект двух узких desktop-колонок;
- текст снова получает нормальную ширину;
- waveform становится большим фоновым визуалом, как в mobile-композиции;
- Hero занимает ширину экрана увереннее и выглядит как расширенная мобильная версия;
- телефон <=620px не затрагивается.

Установка:
скопировать папку css из ZIP поверх корня website
и заменить:
css/responsive-wide.css

После этого:
npm.cmd test
npx.cmd wrangler pages functions build

GitHub Summary:
Stage 12.1.1 – Align desktop hero with mobile

Commit to main → Push origin → дождаться Cloudflare → Ctrl+F5 на компьютере.
