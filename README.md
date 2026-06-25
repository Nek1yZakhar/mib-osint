# MIB OSINT — Сайт-витрина дайджестов международной информационной безопасности

![HTML5](https://img.shields.io/badge/HTML5-Vanilla_JS-orange)
![CSS3](https://img.shields.io/badge/CSS3-Dark_Academic-blueviolet)
![Supabase](https://img.shields.io/badge/DB-Supabase-3ECF8E)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-black)
![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-lightgrey)

🌐 **Живой сайт:** https://mib-osint.vercel.app

Публичный фронтенд-сайт для отображения свежих выпусков дайджестов по Международной Информационной Безопасности (МИБ). Проект работает полностью на стороне клиента, запрашивая опубликованные материалы из Supabase.

## Стек технологий
- **Core**: HTML5, Vanilla JavaScript.
- **Styling**: Чистый CSS3 (Dark Academic стиль, шрифт Inter, CSS Grid, Shimmer Skeletons, адаптивный mobile-first дизайн).
- **Database**: Подключение к Supabase через `@supabase/supabase-js` CDN клиент.

---

## 🛠️ Локальный запуск и тестирование

Вы можете открыть сайт локально без необходимости запуска веб-сервера:

1. Откройте файл `index.html` в любом современном браузере.
2. По умолчанию база данных будет недоступна из-за отсутствия ключей в файле `assets/env.js`.
3. Для тестирования с реальными данными вы можете:
   - Временно прописать ваши `SUPABASE_URL` и `SUPABASE_ANON_KEY` в файл `assets/env.js`.

*Внимание: никогда не отправляйте в репозиторий файл `assets/env.js` с заполненными боевыми ключами!*

---

## 🚀 Деплой на Vercel

Сайт полностью готов к автоматическому развёртыванию на хостинге Vercel.

### Шаг 1: Создание репозитория и импорт в Vercel
1. Создайте новое публичное или приватное репозиторий на GitHub (например, `mib-osint`).
2. Закоммитьте и отправьте туда все файлы из этой папки (`git push`).
3. Перейдите в панель управления Vercel, нажмите **Add New -> Project** и импортируйте репозиторий `mib-osint`.

### Шаг 2: Настройка Build Command
Так как проект использует динамическую сборку файла переменных окружения `assets/env.js`, вам необходимо настроить сборку в Vercel:

1. В окне настроек проекта перед деплоем раскройте вкладку **Build and Development Settings**.
2. В поле **Build Command** включите переключатель (OVERRIDE) и введите команду:
   ```bash
   node build-env.js
   ```
3. В поле **Output Directory** оставьте значение по умолчанию (`.`).

### Шаг 3: Настройка Environment Variables
Перейдите во вкладку **Environment Variables** и добавьте следующие переменные:

- `SUPABASE_URL` — URL вашего проекта Supabase (например, `https://abcde.supabase.co`).
- `SUPABASE_ANON_KEY` — Публичный Anon-токен вашего проекта Supabase.

### Шаг 4: Развертывание
Нажмите кнопку **Deploy**. Vercel запустит скрипт `build-env.js`, который автоматически создаст файл `assets/env.js` с вашими секретными переменными в скомпилированном дистрибутиве, после чего сайт станет доступен по вашему домену `*.vercel.app`.
