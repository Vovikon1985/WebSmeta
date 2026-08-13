# System Architecture

## 1. High-Level Overview
Система состоит из двух основных процессов, работающих параллельно:
1. **ExecutiveDocumentation.App (WinForms)**: Основное рабочее место инженера. Управление сметами, актами, реестрами.
2. **ExecutiveDocumentation.AutoCAD.Plugin (ARX/NET)**: Плагин внутри AutoCAD. Отвечает за выбор объектов, визуализацию меток, получение геометрических данных.

Связь между процессами осуществляется через **Named Pipes**.

## 2. Database Schema (SQLite)
Основные сущности (предварительная модель):

- **Estimates (Сметы)**: `Id`, `Name`, `FilePath` (xml/xls), `CreatedAt`, `Version`.
- **EstimateItems (Позиции сметы)**: `Id`, `EstimateId`, `Code` (шифр ресурса), `Name`, `Unit`, `Price`, `Total`.
- **Marks (Метки в CAD)**: `Id`, `Handle` (string, уникальный ID объекта в AutoCAD), `DatabaseId` (GUID), `ItemId` (FK), `Position` (XYZ), `IsActive`.
- **Volumes (Объемы)**: `Id`, `MarkId`, `CalculatedValue`, `Formula`, `LastCalcDate`.
- **Acts (Акты КС-2/КС-3)**: `Id`, `Number`, `Date`, `Status`.
- **ActRows**: `Id`, `ActId`, `ItemId`, `VolumeId`, `Quantity`, `Price`, `Sum`.

*Примечание*: Связь с объектами AutoCAD осуществляется через свойство `Handle` (шестнадцатеричная строка), так как `ObjectId` меняется при пересохранении файла, а `Handle` стабилен в пределах файла чертежа.

## 3. IPC Mechanism (Named Pipes)
Используется двунаправленный канал связи.

**Server**: WinForms App (`NamedPipeServerStream`).
**Client**: AutoCAD Plugin (`NamedPipeClientStream`).

**Формат сообщений**: JSON сериализация DTO из проекта `Contracts`.

### Основные команды (Command -> Request):
- `SelectObjectRequest`: Запрос на выбор объекта пользователем в AutoCAD.
- `GetObjectGeometryRequest`: Получение геометрии по Handle.
- `HighlightMarkRequest`: Подсветить объект по ID метки.
- `DeleteMarkRequest`: Удалить метку/текст в чертеже.

### Основные события (Event -> Response):
- `ObjectSelectedEvent`: Возвращает `Handle`, `Layer`, `EntityType`.
- `GeometryCalculatedEvent`: Возвращает длину/площадь/объем.
- `PluginStatusEvent`: Статус подключения плагина.

## 4. AutoCAD Integration Strategy
- **Persistence**: Данные о привязке сметных позиций к объектам хранятся в SQLite, а не в XData чертежа (для чистоты чертежа и безопасности). В чертеже могут оставаться только визуальные метки (блоки/текст) с уникальным Handle.
- **Transaction Management**: Все изменения в чертеже выполняются в транзакциях AutoCAD.
- **Versioning**: Поддержка AutoCAD 2018-2025 (через targeting .NET Framework 4.8 и динамическую загрузку референсов или использование пакетов NuGet Autodesk.AutoCAD.RuntimeGrx).

## 5. Data Flow (Import)
1. Пользователь загружает XML/Excel (Гранд-Смета).
2. Parser (Infrastructure) преобразует в `List<EstimateItem>`.
3. Service (Application) валидирует и сохраняет в SQLite через Dapper (Bulk Insert).
4. UI обновляет дерево смет.
