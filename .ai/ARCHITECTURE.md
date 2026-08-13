## 📄 Файл 2: `.ai/ARCHITECTURE.md` — Архитектура системы

Этот файл описывает **как именно** устроена система: структура Solution, слои, зависимости, ER-модель, IPC-механизм, работа с AutoCAD.

**Путь**: `.ai/ARCHITECTURE.md` (в корне репозитория)

```markdown
# ARCHITECTURE.md — Архитектура системы ExecutiveDocumentation

## 1. Общая архитектурная модель

### 1.1 Модульный монолит + AutoCAD Plugin

```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN APPLICATION                         │
│                                                             │
│  ┌─────────────┐                                            │
│  │  WinForms   │  ← UI Layer (Presentation)                │
│  │     App     │                                           │
│  └──────┬──────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐                                            │
│  │ Application │  ← Use Cases, Orchestration               │
│  │   Layer     │                                           │
│  └──────┬──────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐                                            │
│  │   Domain    │  ← Entities, Value Objects, Rules         │
│  │   Layer     │                                           │
│  └──────┬──────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐                                            │
│  │Infrastructure│ ← SQLite, XML, JSON, FileSystem, Logs    │
│  │   Layer     │                                           │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Named Pipes (IPC)
                         │ JSON DTO из Contracts
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    AUTOСAD PLUGIN                           │
│                                                             │
│  ┌─────────────┐                                            │
│  │  Commands   │  ← AutoCAD .NET API                       │
│  │  (ICommand) │                                           │
│  └──────┬──────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐                                            │
│  │   Volume    │  ← Расчёт объёмов из геометрии            │
│  │  Providers  │                                           │
│  └──────┬──────┘                                           │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐                                            │
│  │ Mark Renderer│ ← Отрисовка графических меток в DWG      │
│  └─────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Принципы

- **Модульный монолит**: всё основное приложение — одна сборка, но с чёткими слоями
- **Отдельный AutoCAD Plugin**: работает внутри процесса AutoCAD, общается с App через IPC
- **SQLite**: основное локальное хранилище структурированных данных
- **Файловая система**: DWG, PDF, DOCX, оригинальные XML
- **JSON**: только конфигурация и правила
- **XML**: импорт/экспорт и хранение оригиналов смет

---

## 2. Структура Solution

### 2.1 Итоговая структура

```
ExecutiveDocumentation.sln
│
├── src/
│   ├── ExecutiveDocumentation.Shared/           # .NET Standard 2.0
│   ├── ExecutiveDocumentation.Domain/           # .NET Standard 2.0
│   ├── ExecutiveDocumentation.Application/      # .NET Standard 2.0
│   ├── ExecutiveDocumentation.Infrastructure/   # .NET 8.0
│   ├── ExecutiveDocumentation.Contracts/        # .NET Standard 2.0
│   ├── ExecutiveDocumentation.App/              # WinForms .NET 8.0
│   └── ExecutiveDocumentation.AutoCAD.Plugin/   # .NET Framework 4.8 / .NET 8.0
│
├── tests/
│   ├── ExecutiveDocumentation.Domain.Tests/     # xUnit
│   ├── ExecutiveDocumentation.Application.Tests/# xUnit
│   ├── ExecutiveDocumentation.Infrastructure.Tests/ # xUnit
│   └── ExecutiveDocumentation.Integration.Tests/# xUnit
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── AUTOCAD_INTEGRATION.md
│   ├── XML_FORMAT.md
│   └── DEVELOPMENT.md
│
├── .ai/
│   ├── RULES.md
│   ├── ARCHITECTURE.md
│   ├── STATE.md
│   ├── XML_SPEC.md
│   ├── IMPROVEMENTS.md
│   └── AUTOCAD_GUIDE.md
│
├── README.md
├── CHANGELOG.md
├── .gitignore
└── .editorconfig
```

### 2.2 Целевые фреймворки и причины

| Проект | Target Framework | Причина |
|--------|------------------|---------|
| `ExecutiveDocumentation.Shared` | `netstandard2.0` | Максимальная совместимость: может использоваться и в .NET 8, и в .NET Framework 4.8 |
| `ExecutiveDocumentation.Domain` | `netstandard2.0` | Domain не должен зависеть от конкретного рантайма |
| `ExecutiveDocumentation.Application` | `netstandard2.0` | Use Cases должны быть независимы от инфраструктуры |
| `ExecutiveDocumentation.Contracts` | `netstandard2.0` | **Критично**: Contracts используется и WinForms App (.NET 8), и AutoCAD Plugin (.NET FW 4.8 / .NET 8). Должен быть совместим с обоими |
| `ExecutiveDocumentation.Infrastructure` | `net8.0` | Работа с SQLite, FileSystem, Logging — удобно на современном рантайме |
| `ExecutiveDocumentation.App` | `net8.0-windows` | WinForms на .NET 8 работает быстрее и стабильнее, чем на .NET Framework |
| `ExecutiveDocumentation.AutoCAD.Plugin` | `net48` или `net8.0` | **Зависит от версии AutoCAD**: AutoCAD 2024 и ниже требуют .NET Framework 4.8, AutoCAD 2025+ требует .NET 8.0. Решение принимается на Этапе 0 |
| Все тестовые проекты | `net8.0` | Тесты запускаются в .NET 8 |

### 2.3 Важное замечание по AutoCAD Plugin

**Проблема**: AutoCAD Plugin загружается в процесс `acad.exe`. Версия .NET должна совпадать с той, на которой собран AutoCAD.

**Решение**:
1. На Этапе 0 определить, какая версия AutoCAD установлена у пользователя
2. Если AutoCAD 2024 и ниже → Plugin на `net48`
3. Если AutoCAD 2025+ → Plugin на `net8.0`
4. `Contracts` и `Domain` на `netstandard2.0` — работают в обоих случаях
5. Если потребуется поддержка нескольких версий AutoCAD одновременно — создать два проекта Plugin:
   - `ExecutiveDocumentation.AutoCAD.Plugin.Net48`
   - `ExecutiveDocumentation.AutoCAD.Plugin.Net8`
   - Общий код вынести в `ExecutiveDocumentation.AutoCAD.Common`

---

## 3. Зависимости между проектами

### 3.1 Граф зависимостей

```
ExecutiveDocumentation.Shared
        ↑
ExecutiveDocumentation.Domain
        ↑
ExecutiveDocumentation.Application
        ↑           ↑
        │           │
ExecutiveDocumentation.Infrastructure
        ↑
ExecutiveDocumentation.App

ExecutiveDocumentation.Contracts
        ↑           ↑
        │           │
ExecutiveDocumentation.App    ExecutiveDocumentation.AutoCAD.Plugin
```

### 3.2 Правила зависимостей (ОБЯЗАТЕЛЬНЫЕ)

| Проект | Может ссылаться на | НЕ может ссылаться на |
|--------|-------------------|----------------------|
| `Domain` | `Shared` | WinForms, SQLite, AutoCAD API, XML parser, Infrastructure, Application |
| `Application` | `Domain`, `Shared` | WinForms, SQLite, AutoCAD API, Infrastructure |
| `Infrastructure` | `Application`, `Domain`, `Shared` | WinForms, AutoCAD API |
| `Contracts` | `Shared` | Domain, Application, Infrastructure, WinForms, AutoCAD API |
| `App` | `Application`, `Infrastructure`, `Domain`, `Shared`, `Contracts` | AutoCAD API (только через IPC) |
| `AutoCAD.Plugin` | `Contracts`, `Shared` | Domain, Application, Infrastructure, WinForms |

### 3.3 Запрещённые зависимости

```
❌ Form → SQLite напрямую
❌ Form → XML parser напрямую
❌ Form → AutoCAD API напрямую
❌ Domain → Infrastructure
❌ Application → Infrastructure
❌ AutoCAD.Plugin → Domain
❌ AutoCAD.Plugin → Application
```

Все обращения UI к данным, XML, AutoCAD должны идти через Application Layer.

---

## 4. Слои архитектуры

### 4.1 Shared

**Назначение**: Общие примитивы, не зависящие от бизнес-логики.

**Содержит**:
- `Result<T>` / `Result` — обёртка для возврата результатов операций
- `Guard` — проверка предусловий (null, empty, out of range)
- `DateTimeProvider` — абстракция над текущим временем
- `IGuidProvider` — генерация GUID
- Базовые value objects: `Money`, `Quantity`, `UnitCode`
- Перечисления: `EstimateStatus`, `MarkStatus`, `VolumeSource`

**Не содержит**: Бизнес-правила, сущности, репозитории.

### 4.2 Domain

**Назначение**: Ядро бизнес-логики. Не зависит от внешних библиотек.

**Содержит**:
- **Entities**: `Project`, `Estimate`, `EstimateSection`, `EstimateSubsection`, `EstimateItem`, `Drawing`, `Mark`, `Volume`, `Document`, `Act`, `Improvement`, `HistoryEntry`
- **Value Objects**: `AutoCADObjectReference`, `QuantityValue`, `MarkText`, `EstimateCode`, `DrawingPath`
- **Domain Services**: `VolumeCalculator` (чистая логика без AutoCAD), `MarkNumberGenerator`
- **Domain Rules**: Валидация, инварианты
- **Interfaces**: `IEstimateRepository`, `IMarkRepository`, `IVolumeProvider`, `IDocumentGenerator` (интерфейсы объявляются здесь, реализуются в Infrastructure)

**Пример Entity**:
```csharp
public class Mark
{
    public MarkId Id { get; private set; }
    public ProjectId ProjectId { get; private set; }
    public DrawingId DrawingId { get; private set; }
    public EstimateItemId EstimateItemId { get; private set; }
    public AutoCADObjectReference AutoCADObject { get; private set; }
    public QuantityValue Quantity { get; private set; }
    public MarkStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    
    // Методы поведения
    public void UpdateQuantity(QuantityValue newQuantity, QuantitySource source) { ... }
    public void BindToEstimateItem(EstimateItemId itemId) { ... }
}
```

### 4.3 Application

**Назначение**: Use Cases, оркестрация, DTO. Не содержит бизнес-правил.

**Содержит**:
- **Use Cases** (каждый — отдельный класс):
  - `ImportEstimateUseCase`
  - `CreateMarkUseCase`
  - `BindMarkToEstimateItemUseCase`
  - `CalculateVolumeUseCase`
  - `UpdateVolumeUseCase`
  - `GenerateActUseCase`
  - `ExportEstimateUseCase`
  - `BackupProjectUseCase`
  - `RestoreProjectUseCase`
  - `SearchEstimateItemsUseCase`
  - `GetEstimateItemsPagedUseCase`
- **Interfaces**: `IUnitOfWork`, `IApplicationDbContext`
- **DTO**: `EstimateItemDto`, `MarkDto`, `VolumeDto`, `ProjectDto`
- **Mappings**: Domain ↔ DTO

**Пример Use Case**:
```csharp
public class CreateMarkUseCase
{
    private readonly IMarkRepository _markRepository;
    private readonly IEstimateItemRepository _estimateRepository;
    private readonly IVolumeProvider _volumeProvider;
    private readonly IUnitOfWork _unitOfWork;
    
    public async Task<Result<MarkDto>> ExecuteAsync(CreateMarkRequest request, CancellationToken ct)
    {
        // 1. Получить позицию сметы
        // 2. Получить объём через IVolumeProvider
        // 3. Создать Mark
        // 4. Сохранить
        // 5. Вернуть DTO
    }
}
```

### 4.4 Infrastructure

**Назначение**: Реализации интерфейсов, работа с внешним миром.

**Содержит**:
- **SQLite**: `AppDbContext`, репозитории, миграции
- **XML**: `GrandEstimateXmlParser`, `XmlExporter`, `XsdValidator`
- **JSON**: `SettingsService`, `VolumeRulesService`
- **FileSystem**: `FileStorage`, `BackupService`, `HashCalculator`
- **Logging**: `Logger` (обёртка над Microsoft.Extensions.Logging)
- **Document Generation**: `ActGenerator`, `DocxTemplateEngine`
- **IPC Server**: `NamedPipeServer` (для связи с AutoCAD Plugin)

### 4.5 Contracts

**Назначение**: DTO для IPC между App и AutoCAD Plugin.

**Содержит**:
- **Commands** (от App к Plugin):
  - `SelectObjectCommand`
  - `AddMarkCommand`
  - `CalculateVolumeCommand`
  - `UpdateMarkCommand`
  - `DeleteMarkCommand`
- **Events** (от Plugin к App):
  - `ObjectSelectedEvent`
  - `MarkCreatedEvent`
  - `VolumeCalculatedEvent`
  - `ErrorEvent`
- **DTO**:
  - `AutoCADObjectInfo` (Handle, ObjectId, Layer, ObjectType)
  - `VolumeCalculationRequest`
  - `VolumeCalculationResult`
  - `MarkDrawingInfo`
- **Message Envelope**:
  ```csharp
  public class IpcMessage
  {
      public string MessageType { get; set; }
      public string CorrelationId { get; set; }
      public DateTime Timestamp { get; set; }
      public string PayloadJson { get; set; }
  }
  ```

### 4.6 App (WinForms)

**Назначение**: UI слой. Только отображение и вызов Use Cases.

**Содержит**:
- `MainForm` — главное окно с TreeView навигацией
- `ProjectView`, `EstimateView`, `MarksView`, `VolumesView`, `DocumentsView`, `ImprovementsView`
- **ViewModels** (для WinForms можно использовать BindingSource + DTO)
- **DI Container Setup**: `Program.cs` настраивает `ServiceCollection`
- **IPC Client**: `NamedPipeClient` для отправки команд плагину

**Запрещено**:
- Обращаться к SQLite напрямую
- Парсить XML
- Вызывать AutoCAD API

### 4.7 AutoCAD.Plugin

**Назначение**: Работа внутри AutoCAD. Только команды, геометрия, метки.

**Содержит**:
- `Commands/` — AutoCAD команды (`AddMarkCommand`, `SelectObjectCommand`)
- `Geometry/` — чтение геометрии объектов
- `VolumeProviders/` — реализации `IVolumeProvider` для AutoCAD
- `MarkRenderer/` — отрисовка графических меток (MText, Block, Jig)
- `IpcClient/` — Named Pipe клиент для связи с App
- `PluginModule.cs` — точка входа (`IExtensionApplication`)

**Запрещено**:
- Хранить бизнес-логику
- Обращаться к SQLite
- Знать о Domain-модели

---

## 5. ER-модель SQLite

### 5.1 Диаграмма сущностей

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Project   │──1───*│  Estimate   │──1───*│EstimateSection│
└─────────────┘       └─────────────┘       └──────┬──────┘
       │                                          │
       │ 1                                        │ 1
       │                                          │
       │ *                                        │ *
┌──────┴──────┐                          ┌────────┴────────┐
│   Drawing   │                          │EstimateSubsection│
└──────┬──────┘                          └────────┬────────┘
       │                                          │
       │ 1                                        │ 1
       │                                          │
       │ *                                        │ *
┌──────┴──────┐                          ┌────────┴────────┐
│    Mark     │*───────────────────────1│  EstimateItem   │
└──────┬──────┘                          └─────────────────┘
       │
       │ 1
       │
       │ *
┌──────┴──────┐
│   Volume    │
└─────────────┘

┌─────────────┐       ┌─────────────┐
│  Document   │       │     Act     │
└─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│   History   │       │ Improvement │
└─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│  Settings   │       │ DatabaseInfo│
└─────────────┘       └─────────────┘
```

### 5.2 Таблицы и поля

#### Project
```sql
CREATE TABLE Project (
    Id TEXT PRIMARY KEY,                    -- GUID
    Name TEXT NOT NULL,
    Description TEXT,
    CreatedAt TEXT NOT NULL,                -- ISO 8601
    UpdatedAt TEXT NOT NULL,
    Status TEXT NOT NULL DEFAULT 'Active',
    SettingsJson TEXT                       -- JSON настроек проекта
);
```

#### Estimate
```sql
CREATE TABLE Estimate (
    Id TEXT PRIMARY KEY,
    ProjectId TEXT NOT NULL REFERENCES Project(Id) ON DELETE CASCADE,
    Name TEXT NOT NULL,
    SourceFilePath TEXT,                    -- Путь к оригинальному XML
    SourceFileHash TEXT,                    -- SHA256 хэш
    ImportedAt TEXT,
    Version TEXT,                           -- Версия формата ГРАНД
    TotalItemsCount INTEGER DEFAULT 0,
    Status TEXT NOT NULL DEFAULT 'Imported',
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);
CREATE INDEX IX_Estimate_ProjectId ON Estimate(ProjectId);
```

#### EstimateSection
```sql
CREATE TABLE EstimateSection (
    Id TEXT PRIMARY KEY,
    EstimateId TEXT NOT NULL REFERENCES Estimate(Id) ON DELETE CASCADE,
    ParentSectionId TEXT REFERENCES EstimateSection(Id),
    Code TEXT,
    Name TEXT NOT NULL,
    SortOrder INTEGER DEFAULT 0,
    Level INTEGER DEFAULT 0
);
CREATE INDEX IX_EstimateSection_EstimateId ON EstimateSection(EstimateId);
CREATE INDEX IX_EstimateSection_ParentId ON EstimateSection(ParentSectionId);
```

#### EstimateSubsection
```sql
CREATE TABLE EstimateSubsection (
    Id TEXT PRIMARY KEY,
    SectionId TEXT NOT NULL REFERENCES EstimateSection(Id) ON DELETE CASCADE,
    Code TEXT,
    Name TEXT NOT NULL,
    SortOrder INTEGER DEFAULT 0
);
CREATE INDEX IX_EstimateSubsection_SectionId ON EstimateSubsection(SectionId);
```

#### EstimateItem
```sql
CREATE TABLE EstimateItem (
    Id TEXT PRIMARY KEY,
    SubsectionId TEXT REFERENCES EstimateSubsection(Id),
    SectionId TEXT REFERENCES EstimateSection(Id),
    EstimateId TEXT NOT NULL REFERENCES Estimate(Id) ON DELETE CASCADE,
    Code TEXT,                              -- Код расценки: 01-01-001-01
    Name TEXT NOT NULL,
    Unit TEXT,                              -- м3, м2, т, шт
    PlannedQuantity REAL,
    PricePerUnit REAL,
    TotalPrice REAL,
    ExternalId TEXT,                        -- ID из XML ГРАНД
    ExtraDataJson TEXT,                     -- Дополнительные поля
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);
CREATE INDEX IX_EstimateItem_EstimateId ON EstimateItem(EstimateId);
CREATE INDEX IX_EstimateItem_SubsectionId ON EstimateItem(SubsectionId);
CREATE INDEX IX_EstimateItem_SectionId ON EstimateItem(SectionId);
CREATE INDEX IX_EstimateItem_Code ON EstimateItem(Code);
CREATE INDEX IX_EstimateItem_Name ON EstimateItem(Name);
CREATE INDEX IX_EstimateItem_Unit ON EstimateItem(Unit);
CREATE INDEX IX_EstimateItem_ExternalId ON EstimateItem(ExternalId);
```

#### Drawing
```sql
CREATE TABLE Drawing (
    Id TEXT PRIMARY KEY,
    ProjectId TEXT NOT NULL REFERENCES Project(Id) ON DELETE CASCADE,
    FileName TEXT NOT NULL,
    FilePath TEXT NOT NULL,
    FileHash TEXT,
    FileSize INTEGER,
    AutoCADVersion TEXT,
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);
CREATE INDEX IX_Drawing_ProjectId ON Drawing(ProjectId);
```

#### AutoCADObject
```sql
CREATE TABLE AutoCADObject (
    Id TEXT PRIMARY KEY,
    DrawingId TEXT NOT NULL REFERENCES Drawing(Id) ON DELETE CASCADE,
    Handle TEXT NOT NULL,                   -- Устойчивый идентификатор
    ObjectId TEXT,                          -- Может меняться между сессиями
    ObjectType TEXT,                        -- Line, Polyline, Circle, Solid3d, BlockReference
    LayerName TEXT,
    Color TEXT,
    Linetype TEXT,
    BoundsMinX REAL,
    BoundsMinY REAL,
    BoundsMinZ REAL,
    BoundsMaxX REAL,
    BoundsMaxY REAL,
    BoundsMaxZ REAL,
    AttributesJson TEXT,                    -- Дополнительные атрибуты
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);
CREATE INDEX IX_AutoCADObject_DrawingId ON AutoCADObject(DrawingId);
CREATE INDEX IX_AutoCADObject_Handle ON AutoCADObject(Handle);
CREATE UNIQUE INDEX IX_AutoCADObject_Drawing_Handle ON AutoCADObject(DrawingId, Handle);
```

#### Mark
```sql
CREATE TABLE Mark (
    Id TEXT PRIMARY KEY,
    ProjectId TEXT NOT NULL REFERENCES Project(Id) ON DELETE CASCADE,
    DrawingId TEXT NOT NULL REFERENCES Drawing(Id),
    EstimateId TEXT REFERENCES Estimate(Id),
    EstimateItemId TEXT REFERENCES EstimateItem(Id),
    AutoCADObjectId TEXT REFERENCES AutoCADObject(Id),
    MarkNumber TEXT NOT NULL,               -- ИД-000125
    Text TEXT,
    PositionX REAL,
    PositionY REAL,
    PositionZ REAL,
    Status TEXT NOT NULL DEFAULT 'Active',
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);
CREATE INDEX IX_Mark_ProjectId ON Mark(ProjectId);
CREATE INDEX IX_Mark_DrawingId ON Mark(DrawingId);
CREATE INDEX IX_Mark_EstimateItemId ON Mark(EstimateItemId);
CREATE INDEX IX_Mark_AutoCADObjectId ON Mark(AutoCADObjectId);
CREATE UNIQUE INDEX IX_Mark_Project_MarkNumber ON Mark(ProjectId, MarkNumber);
```

#### Volume
```sql
CREATE TABLE Volume (
    Id TEXT PRIMARY KEY,
    MarkId TEXT NOT NULL REFERENCES Mark(Id) ON DELETE CASCADE,
    EstimateItemId TEXT REFERENCES EstimateItem(Id),
    CalculatedQuantity REAL,                -- Автоматический расчёт
    ManualQuantity REAL,                    -- Ручная корректировка
    FinalQuantity REAL,                     -- Итоговое значение
    QuantitySource TEXT NOT NULL,           -- Auto, Manual, Mixed
    Unit TEXT,
    CalculationMethod TEXT,                 -- Solid3dVolume, Area, Length, Count, Attribute
    CalculationDetailsJson TEXT,
    CalculatedAt TEXT,
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);
CREATE INDEX IX_Volume_MarkId ON Volume(MarkId);
CREATE INDEX IX_Volume_EstimateItemId ON Volume(EstimateItemId);
```

#### Document
```sql
CREATE TABLE Document (
    Id TEXT PRIMARY KEY,
    ProjectId TEXT NOT NULL REFERENCES Project(Id) ON DELETE CASCADE,
    DocumentType TEXT NOT NULL,             -- АОСР, КС-2, КС-3, КС-6, Journal
    Number TEXT,
    Title TEXT NOT NULL,
    FilePath TEXT,                          -- Путь к сгенерированному файлу
    TemplatePath TEXT,
    GeneratedAt TEXT,
    Status TEXT NOT NULL DEFAULT 'Draft',
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);
CREATE INDEX IX_Document_ProjectId ON Document(ProjectId);
CREATE INDEX IX_Document_Type ON Document(DocumentType);
```

#### Act
```sql
CREATE TABLE Act (
    Id TEXT PRIMARY KEY,
    DocumentId TEXT NOT NULL REFERENCES Document(Id) ON DELETE CASCADE,
    ActType TEXT NOT NULL,                  -- АОСР, КС-2, КС-3
    Number TEXT,
    Date TEXT,
    EstimateId TEXT REFERENCES Estimate(Id),
    TotalAmount REAL,
    Status TEXT NOT NULL DEFAULT 'Draft',
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);
CREATE INDEX IX_Act_DocumentId ON Act(DocumentId);
```

#### History
```sql
CREATE TABLE History (
    Id TEXT PRIMARY KEY,
    EntityType TEXT NOT NULL,
    EntityId TEXT NOT NULL,
    ChangeType TEXT NOT NULL,               -- Created, Updated, Deleted
    OldValueJson TEXT,
    NewValueJson TEXT,
    ChangedAt TEXT NOT NULL,
    Source TEXT NOT NULL                    -- User, AutoCAD, Import, Migration
);
CREATE INDEX IX_History_Entity ON History(EntityType, EntityId);
CREATE INDEX IX_History_ChangedAt ON History(ChangedAt);
```

#### Improvement
```sql
CREATE TABLE Improvement (
    Id TEXT PRIMARY KEY,
    Title TEXT NOT NULL,
    Description TEXT,
    Priority TEXT NOT NULL DEFAULT 'Medium',
    Status TEXT NOT NULL DEFAULT 'Idea',
    TargetVersion TEXT,
    Notes TEXT,
    CreatedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);
CREATE INDEX IX_Improvement_Status ON Improvement(Status);
```

#### DatabaseInfo
```sql
CREATE TABLE DatabaseInfo (
    Key TEXT PRIMARY KEY,
    Value TEXT NOT NULL
);
-- Содержит: DatabaseVersion, ApplicationVersion, CreatedAt, LastMigrationAt
```

### 5.3 Индексы и их назначение

| Индекс | Назначение |
|--------|-----------|
| `IX_EstimateItem_EstimateId` | Быстрый поиск позиций по смете |
| `IX_EstimateItem_Code` | Поиск по коду расценки |
| `IX_EstimateItem_Name` | Поиск по наименованию |
| `IX_EstimateItem_ExternalId` | Связь с оригинальным XML |
| `IX_Mark_EstimateItemId` | Поиск меток по позиции сметы |
| `IX_Mark_DrawingId` | Поиск меток на чертеже |
| `IX_AutoCADObject_Handle` | Повторный поиск объекта по Handle |
| `IX_Volume_MarkId` | Получение объёмов метки |
| `IX_History_Entity` | История изменений сущности |

---

## 6. IPC механизм (Named Pipes)

### 6.1 Архитектура обмена

```
┌─────────────────────┐         Named Pipe          ┌─────────────────────┐
│   WinForms App      │◄───────────────────────────►│   AutoCAD Plugin    │
│                     │    Pipe: "ExecDocIPC"       │                     │
│  NamedPipeServer    │    JSON DTO из Contracts    │  NamedPipeClient    │
└─────────────────────┘                             └─────────────────────┘
```

### 6.2 Параметры соединения

- **Имя канала**: `ExecutiveDocumentation.IPC`
- **Направление**: Duplex (двусторонний)
- **Формат сообщений**: JSON, обёрнутый в `IpcMessage`
- **Таймаут**: 30 секунд
- **Переподключение**: Автоматическое при разрыве соединения

### 6.3 Формат сообщения

```json
{
  "messageType": "CalculateVolumeCommand",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-08-13T10:30:00Z",
  "payloadJson": "{...}"
}
```

### 6.4 Список команд и событий

| Тип | Направление | Назначение |
|-----|-------------|-----------|
| `SelectObjectCommand` | App → Plugin | Запросить выбор объекта в AutoCAD |
| `ObjectSelectedEvent` | Plugin → App | Объект выбран, возвращает Handle, ObjectId, тип |
| `AddMarkCommand` | App → Plugin | Создать графическую метку на чертеже |
| `MarkCreatedEvent` | Plugin → App | Метка создана, возвращает позицию |
| `CalculateVolumeCommand` | App → Plugin | Рассчитать объём объекта |
| `VolumeCalculatedEvent` | Plugin → App | Объём рассчитан |
| `UpdateMarkCommand` | App → Plugin | Обновить текст/позицию метки |
| `DeleteMarkCommand` | App → Plugin | Удалить метку с чертежа |
| `GetDrawingInfoCommand` | App → Plugin | Получить информацию о текущем чертеже |
| `ErrorEvent` | Plugin → App | Ошибка в AutoCAD |
| `PluginConnectedEvent` | Plugin → App | Плагин подключился |
| `PluginDisconnectedEvent` | Plugin → App | Плагин отключился |

### 6.5 Обработка ошибок

- Если плагин не запущен → App показывает сообщение "AutoCAD Plugin не подключен"
- Если соединение разорвано → автоматическое переподключение до 3 попыток
- Если AutoCAD закрыт → плагин отправляет `PluginDisconnectedEvent` перед выгрузкой

---

## 7. AutoCAD Integration

### 7.1 Идентификация объектов

**Проблема**: `ObjectId` меняется при каждом открытии чертежа.

**Решение**: Использовать **Handle** — устойчивый идентификатор, сохраняемый в DWG.

```csharp
// В плагине
using Autodesk.AutoCAD.DatabaseServices;

ObjectId objId = selectedObjectId;
using (Transaction tr = db.TransactionManager.StartTransaction())
{
    Entity entity = (Entity)tr.GetObject(objId, OpenMode.ForRead);
    Handle handle = entity.Handle;
    string handleString = handle.ToString();  // "1A4F"
    // Сохраняем handleString в Contracts DTO
}
```

### 7.2 Повторный поиск объекта

```csharp
// В плагине при восстановлении связи
using (Transaction tr = db.TransactionManager.StartTransaction())
{
    if (db.TryGetObjectId(new Handle(Convert.ToInt64(handleString, 16)), out ObjectId objId))
    {
        Entity entity = (Entity)tr.GetObject(objId, OpenMode.ForRead);
        // Объект найден
    }
}
```

### 7.3 Поддержка разных версий AutoCAD

**Стратегия**:
1. Общий интерфейс `IAutoCADAdapter` в Contracts
2. Реализации для разных версий в Plugin
3. Компилляция под целевую версию AutoCAD

```csharp
// В Contracts
public interface IAutoCADAdapter
{
    Task<ObjectInfo> SelectObjectAsync();
    Task<VolumeResult> CalculateVolumeAsync(string handle);
    Task DrawMarkAsync(MarkDrawingInfo markInfo);
}
```

### 7.4 Локализация команд

- Команды AutoCAD регистрируются через атрибуты `[CommandMethod]`
- Имена команд задаются константами в `Contracts`
- **НЕ использовать** русские/английские имена команд в бизнес-логике

```csharp
// В Plugin
[CommandMethod("EXECDOC_ADDMARK")]
public void AddMark()
{
    // Логика команды
}
```

---

## 8. Volume Engine

### 8.1 Архитектура

```
┌─────────────────────┐
│  IVolumeProvider    │  ← Интерфейс в Domain
└─────────┬───────────┘
          │
          │ реализации
          ▼
┌─────────────────────┐
│ AutoCADVolumeProvider│  ← В AutoCAD Plugin (через IPC)
└─────────────────────┘
┌─────────────────────┐
│ ManualVolumeProvider │  ← В Application (ручной ввод)
└─────────────────────┘
┌─────────────────────┐
│ AttributeVolumeProvider│ ← Из атрибутов блоков
└─────────────────────┘
```

### 8.2 Интерфейс

```csharp
// В Domain
public interface IVolumeProvider
{
    Task<Result<VolumeCalculation>> CalculateVolumeAsync(
        VolumeCalculationRequest request, 
        CancellationToken ct = default);
    
    bool CanCalculate(AutoCADObjectInfo objectInfo);
}
```

### 8.3 Типы расчётов

| Метод | Описание | Пример |
|-------|----------|--------|
| `Solid3dVolume` | Объём 3D Solid | `Solid3d.Volume` |
| `Area` | Площадь поверхности | `Surface.Area`, `Region.Area` |
| `Length` | Длина кривой | `Curve.Length`, `Polyline.Length` |
| `Count` | Количество объектов | `1` для каждого объекта |
| `Attribute` | Значение атрибута блока | `BlockReference.AttributeCollection` |
| `Manual` | Введённое пользователем | Из UI |

### 8.4 Хранение результатов

```csharp
// В Volume
CalculatedQuantity = 125.40;   // Автоматический расчёт
ManualQuantity = null;         // Ручная корректировка
FinalQuantity = 125.40;        // Итог
QuantitySource = "Auto";       // Источник

// Если пользователь изменил:
CalculatedQuantity = 125.40;   // Остался
ManualQuantity = 130.00;       // Ручное значение
FinalQuantity = 130.00;        // Итог = Manual
QuantitySource = "Manual";     // Источник изменён
```

---

## 9. XML Pipeline

### 9.1 Импорт

```
XML файл
    │
    ▼
┌─────────────────────┐
│  FileValidator      │  ← Проверка существования, кодировки, размера
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  OriginalXmlSaver   │  ← Сохранение в Source/Estimate_Original.xml
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  XmlSchemaValidator │  ← XSD validation (если схема доступна)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  GrandEstimateParser│  ← XmlSerializer / LINQ to XML → DTO
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  DtoToDomainMapper  │  ← DTO → Domain entities
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  EstimateRepository │  ← Bulk insert в SQLite
└─────────────────────┘
```

### 9.2 Экспорт

```
SQLite
    │
    ▼
┌─────────────────────┐
│  DomainToDtoMapper  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  XmlDtoBuilder      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  XmlSerializer      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  XsdValidator       │  ← Проверка схемы (если доступна)
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Output File        │
└─────────────────────┘
```

### 9.3 Важные правила

- **НЕ выдумывать** XML-схему
- Использовать **только реальный XML** пользователя
- Если XSD недоступна — **не утверждать**, что файл соответствует официальной схеме
- Оригинальный XML **не изменять**

---

## 10. Миграции SQLite

### 10.1 Подход

Использовать **собственный механизм миграций** на основе SQL-скриптов.

**Причина**: EF Core Migrations добавляет сложность и зависимости. Для SQLite проще и надёжнее использовать версионированные SQL-файлы.

### 10.2 Структура миграций

```
Infrastructure/
└── Migrations/
    ├── 001_InitialSchema.sql
    ├── 002_AddVolumeTable.sql
    ├── 003_AddHistoryTable.sql
    └── 004_AddImprovements.sql
```

### 10.3 Таблица версий

```sql
CREATE TABLE DatabaseInfo (
    Key TEXT PRIMARY KEY,
    Value TEXT NOT NULL
);

INSERT INTO DatabaseInfo (Key, Value) VALUES ('DatabaseVersion', '001');
INSERT INTO DatabaseInfo (Key, Value) VALUES ('ApplicationVersion', '0.1.0');
```

### 10.4 Процесс миграции

```
При запуске приложения:
1. Прочитать DatabaseVersion из DatabaseInfo
2. Найти все миграции с номером больше текущего
3. Если есть миграции:
   a. Создать backup Project.db
   b. Начать транзакцию
   c. Применить миграции по порядку
   d. Обновить DatabaseVersion
   e. Закоммитить транзакцию
4. Если ошибка:
   a. Откатить транзакцию
   b. Восстановить из backup
   c. Показать ошибку пользователю
```

---

## 11. Dependency Injection

### 11.1 Контейнер

Использовать **Microsoft.Extensions.DependencyInjection** (стандартный, бесплатный, MIT).

### 11.2 Регистрация сервисов

```csharp
// В Program.cs или DiConfigurator.cs
var services = new ServiceCollection();

// Infrastructure
services.AddSingleton<ISqlConnectionFactory>(sp => 
    new SqlConnectionFactory(connectionString));
services.AddScoped<IUnitOfWork, UnitOfWork>();
services.AddScoped<IEstimateRepository, EstimateRepository>();
services.AddScoped<IMarkRepository, MarkRepository>();
services.AddScoped<IVolumeRepository, VolumeRepository>();

// Application
services.AddScoped<ImportEstimateUseCase>();
services.AddScoped<CreateMarkUseCase>();
services.AddScoped<CalculateVolumeUseCase>();

// IPC
services.AddSingleton<IIpcServer, NamedPipeServer>();

// Logging
services.AddLogging(builder => builder.AddFile("Logs/app.log"));

// Settings
services.AddSingleton<ISettingsService, JsonSettingsService>();

var provider = services.BuildServiceProvider();
```

### 11.3 Правила

- **Singleton**: Settings, IPC Server, Logger, ConnectionFactory
- **Scoped**: Repositories, Use Cases, UnitOfWork
- **Transient**: DTO mappers, validators

---

## 12. Конфигурация

### 12.1 Файлы JSON

```
Settings/
├── application.json      # Общие настройки приложения
├── project.json          # Настройки текущего проекта
├── autocad.json          # Настройки AutoCAD (версия, путь)
├── volume-rules.json     # Правила расчёта объёмов
└── backup.json           # Настройки резервного копирования
```

### 12.2 Пример application.json

```json
{
  "applicationName": "ExecutiveDocumentation",
  "version": "0.1.0",
  "language": "ru-RU",
  "autoBackup": {
    "enabled": true,
    "intervalMinutes": 30,
    "maxBackups": 10
  },
  "logging": {
    "level": "Information",
    "filePath": "Logs/app.log",
    "maxFileSizeMB": 10
  },
  "ui": {
    "theme": "Light",
    "defaultPageSize": 100
  }
}
```

### 12.3 Пример volume-rules.json

```json
{
  "rules": [
    {
      "objectType": "Solid3d",
      "method": "Solid3dVolume",
      "unit": "m3"
    },
    {
      "objectType": "Polyline",
      "method": "Length",
      "unit": "m"
    },
    {
      "objectType": "BlockReference",
      "method": "Attribute",
      "attributeName": "VOLUME",
      "unit": "m3"
    }
  ],
  "defaultMethod": "Manual",
  "defaultUnit": "pcs"
}
```

---

## 13. Логирование

### 13.1 Структура

Использовать **Microsoft.Extensions.Logging** + кастомный `FileLogger`.

**Причина**: Бесплатно, стандартно, расширяемо. Не нужно тащить Serilog/NLog, если достаточно простого файлового логгера.

### 13.2 Уровни

- `Trace` — детальные технические сообщения
- `Debug` — отладочная информация
- `Information` — значимые события (запуск, импорт, экспорт)
- `Warning` — предупреждения (некритичные ошибки)
- `Error` — ошибки, требующие внимания
- `Critical` — критические сбои

### 13.3 Формат записи

```
[2026-08-13 10:30:45.123] [INFO] [MainThread] Application started. Version: 0.1.0
[2026-08-13 10:31:02.456] [INFO] [ImportWorker] Estimate imported. Items: 15420, Time: 3.2s
[2026-08-13 10:32:15.789] [ERROR] [IpcServer] Connection lost. Attempting reconnect...
```

---

## 14. Обработка ошибок

### 14.1 Result Pattern

Все операции возвращают `Result<T>`:

```csharp
public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }
    
    public static Result Success() => new Result(true, null);
    public static Result Failure(Error error) => new Result(false, error);
}

public class Result<T> : Result
{
    public T Value { get; }
    
    public static Result<T> Success(T value) => new Result<T>(value, true, null);
    public new static Result<T> Failure(Error error) => new Result<T>(default, false, error);
}
```

### 14.2 Типы ошибок

```csharp
public class Error
{
    public string Code { get; }
    public string Message { get; }
    public ErrorType Type { get; }
    public Exception Exception { get; }  // Для логирования
}

public enum ErrorType
{
    Validation,
    NotFound,
    Conflict,
    Infrastructure,
    External  // AutoCAD, XML
}
```

### 14.3 Правило

- **В Domain/Application**: возвращать `Result<T>`, **НЕ бросать исключения** для ожидаемых ошибок
- **В Infrastructure**: можно бросать исключения для неожиданных ошибок (потеря соединения, повреждение файла)
- **В UI**: ловить все исключения, логировать, показывать понятное сообщение

---

## 15. Производительность

### 15.1 Большие сметы (50 000+ позиций)

**Проблема**: Загрузка всех позиций в память и в DataGridView невозможна.

**Решение**:
1. **SQL**: Использовать `LIMIT` и `OFFSET` для пагинации
2. **DataGridView**: `VirtualMode = true`, данные подгружаются постранично
3. **Поиск**: Индексы на `Code`, `Name`, `EstimateId`
4. **Импорт**: Bulk insert транзакциями по 1000 строк
5. **Кэширование**: Кэш секций/подсекций (их мало), позиции не кэшировать

### 15.2 Пример запроса с пагинацией

```sql
SELECT Id, Code, Name, Unit, PlannedQuantity
FROM EstimateItem
WHERE EstimateId = @estimateId
  AND (@search IS NULL OR Code LIKE '%' || @search || '%' OR Name LIKE '%' || @search || '%')
ORDER BY Code
LIMIT @pageSize OFFSET @offset;
```

### 15.3 Асинхронность

- Все операции с БД — `async/await`
- Импорт XML — в фоновом потоке
- IPC вызовы — асинхронные
- UI не блокировать

---

## 16. Тестируемость

### 16.1 Принципы

- Domain — чистые функции, без внешних зависимостей → легко тестировать
- Application — зависимости через интерфейсы → мокать
- Infrastructure — интеграционные тесты с in-memory SQLite
- AutoCAD Plugin — ручное тестирование в AutoCAD + unit-тесты для VolumeProviders

### 16.2 Стратегия тестов

| Уровень | Что тестировать | Инструменты |
|---------|----------------|-------------|
| Domain | Правила, инварианты, расчёты | xUnit |
| Application | Use Cases с моками | xUnit + Moq |
| Infrastructure | SQLite, XML парсинг | xUnit + SQLite in-memory |
| Integration | Полный импорт → поиск → метки | xUnit + временная папка |
| Performance | 10k/50k позиций | xUnit + BenchmarkDotNet |

---

## 17. Расширяемость

### 17.1 Переход к серверной архитектуре

Если в будущем потребуется многопользовательский режим:

1. **Domain** и **Application** остаются без изменений
2. **Infrastructure**: заменить `SqliteConnectionFactory` на `SqlServerConnectionFactory` или `PostgresConnectionFactory`
3. **App**: заменить WinForms на Web API + клиент
4. **Contracts**: использовать те же DTO для API

**Поэтому важно**: не привязывать Domain и Application к SQLite и WinForms.

### 17.2 Новые типы документов

1. Добавить новый `DocumentType` в enum
2. Создать шаблон в `Templates/`
3. Реализовать `IDocumentGenerator` для нового типа
4. Зарегистрировать в DI

### 17.3 Новые источники объёмов

1. Реализовать `IVolumeProvider`
2. Добавить правило в `volume-rules.json`
3. Зарегистрировать в DI

---

## 18. Безопасность

### 18.1 Path Traversal

Все пути к файлам проверять:
```csharp
public static string GetSafePath(string basePath, string relativePath)
{
    string fullPath = Path.GetFullPath(Path.Combine(basePath, relativePath));
    if (!fullPath.StartsWith(Path.GetFullPath(basePath)))
        throw new SecurityException("Path traversal detected");
    return fullPath;
}
```

### 18.2 XML External Entities (XXE)

При парсинге XML:
```csharp
var settings = new XmlReaderSettings
{
    DtdProcessing = DtdProcessing.Prohibit,
    XmlResolver = null
};
```

### 18.3 Валидация входных данных

- Все строки из XML/JSON — проверять на длину, формат
- Числа — проверять на диапазон
- Пути — проверять на существование и права

---

## 19. Резервное копирование

### 19.1 Ручной Backup

- Копировать `Project.db` и все файлы проекта в `Backup/`
- Формат: `Backup_2026-08-13_10-30-00.zip`
- Перед копированием — закрыть соединение с SQLite

### 19.2 Автоматический Backup

- По таймеру (настраивается в `backup.json`)
- Перед миграциями
- Перед импортом XML

### 19.3 Restore

- Распаковать backup во временную папку
- Проверить целостность SQLite (`PRAGMA integrity_check`)
- Заменить текущие файлы
- Обновить `DatabaseVersion`

---

## 20. Этапы реализации

| Этап | Описание | Зависимости |
|------|----------|-------------|
| 0 | Анализ и архитектура | Нет |
| 1 | Solution структура | Этап 0 |
| 2 | SQLite и миграции | Этап 1 |
| 3 | XML Import | Этап 2, реальный XML |
| 4 | AutoCAD Integration | Этап 1, Contracts |
| 5 | Add Mark | Этап 3, 4 |
| 6 | Volume Engine | Этап 4 |
| 7 | Volume Update | Этап 6 |
| 8 | Executive Documentation | Этап 3 |
| 9 | XML Export | Этап 3 |
| 10 | DOCX/PDF | Этап 8 |
| 11 | Backup/Restore | Этап 2 |
| 12 | Testing | Все этапы |
| 13 | Update | Этап 11 |
| 14 | Release | Этап 12 |
