# Project State Tracker

| Этап | Название | Статус | Описание |
|------|----------|--------|----------|
| 0 | Foundation & Context | **In Progress** | Создание структуры SLN, настройка CI/CD базовых правил, архитектура IPC и БД. |
| 1 | Domain Core | Pending | Сущности: Estimate, Item, Act. Интерфейсы репозиториев. |
| 2 | Database Implementation | Pending | SQLite схема, миграции EF Core, репозитории на Dapper. |
| 3 | IPC Contracts & Protocol | Pending | DTO, сериализация, базовый сервер/клиент Named Pipes. |
| 4 | AutoCAD Plugin Skeleton | Pending | Базовый плагин, команда подключения, логирование. |
| 5 | Import Module (Grand Smeta) | Pending | Парсер XML/Excel, маппинг в Domain. |
| 6 | WinForms UI Shell | Pending | Главное окно, меню, навигация, DI контейнер. |
| 7 | Estimates Management UI | Pending | Отображение смет, поиск, фильтрация. |
| 8 | CAD Selection Tool | Pending | Логика выбора объектов и сохранения Handle в БД. |
| 9 | Volumes Calculation | Pending | Привязка формул к типам объектов, пересчет объемов. |
| 10 | Acts Generation (KS-2/KS-3) | Pending | Генерация актов на основе выполненных объемов. |
| 11 | Reporting & Export | Pending | Экспорт в Word/Excel, печать форм. |
| 12 | Testing & QA | Pending | Покрытие тестами, нагрузочное тестирование БД. |
| 13 | Deployment | Pending | Installer (WiX/InnoSetup), автозапуск плагина. |
| 14 | Documentation | Pending | Руководство пользователя, API doc. |

## Current Focus
- [x] Инициализация репозитория.
- [ ] Создание структуры папок и проектов.
- [ ] Написание RULES.md и ARCHITECTURE.md.
- [ ] Определение DTO для IPC.
