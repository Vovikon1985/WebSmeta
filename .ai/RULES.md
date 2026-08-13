# Project Rules & Constraints

## 1. General Principles
- **Local First**: Приложение работает исключительно локально. Никаких облачных зависимостей для хранения данных.
- **Master Data Source**: SQLite является единственным источником истины для данных проекта.
- **No GPL**: Запрещено использование библиотек с лицензией GPL. Разрешены MIT, Apache 2.0, BSD.
- **Language**: C# 12+ (где поддерживается), русский язык в UI и комментариях кода, английский в именах сущностей кода.

## 2. Technology Stack
- **UI**: WinForms (.NET 8.0 / .NET Framework 4.8). **Запрещено**: WPF, Avalonia, Electron, Web-based UI.
- **Database**: SQLite.
- **ORM**: 
  - **Dapper**: Для высокопроизводительного чтения (сметы, объемы).
  - **EF Core**: Для миграций схемы БД и управления сложными связями сущностей (если требуется), либо чистый SQL + Dapper для полного контроля. *Решение: Гибридный подход (EF Core для миграций/конфига, Dapper для данных).*
- **IPC**: Named Pipes (`System.IO.Pipes`) для связи Desktop App и AutoCAD Plugin.
- **Data Formats**:
  - **XML**: Импорт/Экспорт смет (Гранд-Смета, Excel/XML).
  - **JSON**: Конфигурация приложения, сериализация сообщений IPC.

## 3. Architecture (Clean Architecture)
- **Domain**: Чистые POCO, интерфейсы репозиториев, бизнес-правила. Нет зависимостей от внешних библиотек.
- **Application**: Use Cases, DTO, валидация. Зависит только от Domain.
- **Infrastructure**: Реализация репозиториев (SQLite), IPC сервисы, файловые сервисы.
- **Contracts**: DTO для IPC коммуникации. Независим от всего.
- **App (WinForms)**: Презентационный слой.
- **AutoCAD.Plugin**: Тонкий клиент, отправляющий команды через IPC.

## 4. Coding Standards
- **SOLID**: Строгое соблюдение принципов.
- **Async/Await**: Использовать везде, где есть I/O операции (БД, IPC, Файл).
- **Dependency Injection**: Использовать встроенный DI контейнер .NET.
- **Logging**: Serilog (файловый лог).

## 5. Testing
- Покрытие юнит-тестами бизнес-логики (Domain/Application) > 80%.
- Интеграционные тесты для IPC и БД.
