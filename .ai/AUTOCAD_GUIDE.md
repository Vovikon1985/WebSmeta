## 📄 Файл 6: `.ai/AUTOCAD_GUIDE.md` — Шпаргалка по AutoCAD .NET API

Этот файл — **техническое руководство** по работе с AutoCAD .NET API. Он содержит паттерны, примеры кода и важные замечания для разработки плагина.

**Путь**: `.ai/AUTOCAD_GUIDE.md` (в корне репозитория)

```markdown
# AUTOCAD_GUIDE.md — Шпаргалка по AutoCAD .NET API

> **⚠️ ВАЖНОЕ ПРЕДУПРЕЖДЕНИЕ**
> 
> **ЗАПРЕЩЕНО выдумывать AutoCAD API.**
> 
> Все примеры кода в этом файле являются **паттернами и шаблонами**.
> Точные имена классов, методов и свойств **ДОЛЖНЫ быть проверены** по официальной документации AutoCAD .NET API для конкретной версии AutoCAD.
> 
> Перед написанием кода плагина необходимо:
> 1. Определить версию AutoCAD пользователя
> 2. Открыть официальную документацию AutoCAD .NET API для этой версии
> 3. Проверить доступность используемых классов и методов
> 4. Проверить целевой фреймворк (.NET Framework 4.8 или .NET 8.0)

---

## 📊 Версии AutoCAD и целевые фреймворки

| Версия AutoCAD | Год выпуска | .NET Framework | .NET Core/.NET | Примечания |
|----------------|-------------|----------------|----------------|------------|
| AutoCAD 2020 | 2019 | .NET Framework 4.7 | — | |
| AutoCAD 2021 | 2020 | .NET Framework 4.7 | — | |
| AutoCAD 2022 | 2021 | .NET Framework 4.8 | — | |
| AutoCAD 2023 | 2022 | .NET Framework 4.8 | — | |
| AutoCAD 2024 | 2023 | .NET Framework 4.8 | — | Последняя версия на .NET Framework |
| AutoCAD 2025 | 2024 | — | .NET 8.0 | Первая версия на .NET 8 |
| AutoCAD 2026 | 2025 | — | .NET 8.0 | |

**Критическое решение**:
- Если у пользователя AutoCAD 2024 и ниже → Plugin на `.NET Framework 4.8`
- Если у пользователя AutoCAD 2025+ → Plugin на `.NET 8.0`
- Contracts и Shared → `.NET Standard 2.0` (совместим с обоими)

**Как определить версию AutoCAD**:
```csharp
// В плагине можно получить версию AutoCAD
string acadVersion = Autodesk.AutoCAD.ApplicationServices.Application.Version.ToString();
// Пример: "24.3.0.0" для AutoCAD 2024
```

---

## 📁 Структура проекта AutoCAD Plugin

```
ExecutiveDocumentation.AutoCAD.Plugin/
│
├── ExecutiveDocumentation.AutoCAD.Plugin.csproj
│
├── PluginModule.cs              # Точка входа (IExtensionApplication)
│
├── Commands/                    # Команды AutoCAD
│   ├── AddMarkCommand.cs
│   ├── SelectObjectCommand.cs
│   ├── CalculateVolumeCommand.cs
│   ├── UpdateMarkCommand.cs
│   └── DeleteMarkCommand.cs
│
├── Geometry/                    # Чтение геометрии объектов
│   ├── GeometryReader.cs
│   ├── Solid3dReader.cs
│   ├── PolylineReader.cs
│   ├── CircleReader.cs
│   └── BlockReferenceReader.cs
│
├── VolumeProviders/             # Расчёт объёмов
│   ├── IVolumeProvider.cs       # Интерфейс из Domain
│   ├── Solid3dVolumeProvider.cs
│   ├── AreaVolumeProvider.cs
│   ├── LengthVolumeProvider.cs
│   ├── CountVolumeProvider.cs
│   ├── AttributeVolumeProvider.cs
│   └── ManualVolumeProvider.cs
│
├── MarkRenderer/                # Отрисовка графических меток
│   ├── MarkRenderer.cs
│   ├── MarkBlockDefinition.cs
│   └── MarkJig.cs
│
├── IpcClient/                   # Named Pipe клиент
│   ├── IpcClient.cs
│   ├── IpcMessageSerializer.cs
│   └── IpcReconnector.cs
│
├── Services/                    # Вспомогательные сервисы
│   ├── ObjectHandleService.cs
│   ├── DrawingInfoService.cs
│   └── LocalizationService.cs
│
└── Utils/                       # Утилиты
    ├── TransactionHelper.cs
    ├── ExceptionHandler.cs
    └── Logger.cs
```

---

## 🚪 Точка входа плагина

### IExtensionApplication

AutoCAD загружает плагин через класс, реализующий интерфейс `IExtensionApplication`.

```csharp
using Autodesk.AutoCAD.Runtime;
using Autodesk.AutoCAD.ApplicationServices;

[assembly: ExtensionApplication(typeof(ExecutiveDocumentation.AutoCAD.Plugin.PluginModule))]

namespace ExecutiveDocumentation.AutoCAD.Plugin
{
    public class PluginModule : IExtensionApplication
    {
        private IpcClient _ipcClient;
        
        public void Initialize()
        {
            // Вызывается при загрузке плагина
            try
            {
                // Инициализация IPC клиента
                _ipcClient = new IpcClient("ExecutiveDocumentation.IPC");
                _ipcClient.ConnectAsync().ContinueWith(t =>
                {
                    if (t.IsCompletedSuccessfully)
                    {
                        // Отправить событие подключения
                        _ipcClient.SendAsync(new IpcMessage
                        {
                            MessageType = "PluginConnectedEvent",
                            PayloadJson = "{}"
                        });
                    }
                });
                
                // Регистрация команд (если не через атрибуты)
                // ...
                
                Logger.Info("ExecutiveDocumentation Plugin initialized.");
            }
            catch (Exception ex)
            {
                Logger.Error("Failed to initialize plugin", ex);
            }
        }
        
        public void Terminate()
        {
            // Вызывается при выгрузке плагина
            try
            {
                // Отправить событие отключения
                _ipcClient?.SendAsync(new IpcMessage
                {
                    MessageType = "PluginDisconnectedEvent",
                    PayloadJson = "{}"
                }).Wait(TimeSpan.FromSeconds(2));
                
                _ipcClient?.Dispose();
                
                Logger.Info("ExecutiveDocumentation Plugin terminated.");
            }
            catch (Exception ex)
            {
                Logger.Error("Error during plugin termination", ex);
            }
        }
    }
}
```

### Загрузка плагина

Плагин можно загрузить несколькими способами:

1. **Команда NETLOAD**: Пользователь вручную загружает DLL через команду `NETLOAD`
2. **Реестр**: Автоматическая загрузка при старте AutoCAD
3. **Bundle**: Пакетная загрузка через Autodesk App Store

**Рекомендация**: На первом этапе использовать ручную загрузку через `NETLOAD`.

**Путь к плагину**: Должен быть настроен в `autocad.json` в основном приложении.

---

## ⌨️ Команды AutoCAD

### Регистрация команд

Команды регистрируются через атрибут `[CommandMethod]`.

```csharp
using Autodesk.AutoCAD.Runtime;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;

namespace ExecutiveDocumentation.AutoCAD.Plugin.Commands
{
    public class AddMarkCommand
    {
        [CommandMethod("EXECDOC_ADDMARK")]
        public void AddMark()
        {
            Document doc = Application.DocumentManager.MdiActiveDocument;
            if (doc == null) return;
            
            Editor ed = doc.Editor;
            
            try
            {
                ed.WriteMessage("\n[ExecDoc] Команда добавления метки запущена.");
                
                // Логика команды
                // ...
                
                ed.WriteMessage("\n[ExecDoc] Команда добавления метки завершена.");
            }
            catch (Exception ex)
            {
                ed.WriteMessage($"\n[ExecDoc] Ошибка: {ex.Message}");
                Logger.Error("Error in EXECDOC_ADDMARK", ex);
            }
        }
    }
}
```

### Список команд плагина

| Команда | Название | Назначение |
|---------|----------|-----------|
| `EXECDOC_ADDMARK` | Добавить метку | Выбор объекта и создание метки |
| `EXECDOC_SELECTOBJECT` | Выбрать объект | Выбор объекта для привязки |
| `EXECDOC_CALCVOLUME` | Рассчитать объём | Расчёт объёма выбранного объекта |
| `EXECDOC_UPDATEMARK` | Обновить метку | Обновление текста/позиции метки |
| `EXECDOC_DELETEMARK` | Удалить метку | Удаление метки с чертежа |
| `EXECDOC_INFO` | Информация | Показать информацию о плагине |
| `EXECDOC_RECONNECT` | Переподключить | Переподключение к основному приложению |

### Локализация команд

**ВАЖНО**: Имена команд должны быть **локализационно независимыми**.

```csharp
// ПРАВИЛЬНО: Английские имена команд
[CommandMethod("EXECDOC_ADDMARK")]

// НЕПРАВИЛЬНО: Русские имена команд
[CommandMethod("ДОБАВИТЬМЕТКУ")]  // ❌ Не использовать
```

**Причина**: Пользователь может использовать русскую или английскую версию AutoCAD. Имена команд на английском работают в обеих версиях.

**Для отображения пользователю** использовать локализованные строки:

```csharp
public static class Localization
{
    public static string GetCommandDescription(string commandName)
    {
        // Возвращает описание команды на языке пользователя
        return commandName switch
        {
            "EXECDOC_ADDMARK" => Resources.CommandAddMark,  // "Добавить метку" или "Add Mark"
            "EXECDOC_SELECTOBJECT" => Resources.CommandSelectObject,
            _ => commandName
        };
    }
}
```

---

## 🎯 Выбор объектов

### Простой выбор одного объекта

```csharp
public static Result<ObjectId> SelectSingleObject(Editor ed, string prompt)
{
    try
    {
        PromptEntityOptions options = new PromptEntityOptions($"\n{prompt}");
        
        // Можно ограничить типы объектов
        // options.SetRejectMessage("\nДопустимы только полилинии и 3D тела.");
        // options.AddAllowedClass(typeof(Polyline), true);
        // options.AddAllowedClass(typeof(Solid3d), true);
        
        PromptEntityResult result = ed.GetEntity(options);
        
        if (result.Status == PromptStatus.OK)
        {
            return Result<ObjectId>.Success(result.ObjectId);
        }
        else if (result.Status == PromptStatus.Cancel)
        {
            return Result<ObjectId>.Failure(Error.Cancelled("Выбор отменён пользователем."));
        }
        else
        {
            return Result<ObjectId>.Failure(Error.NotFound("Объект не выбран."));
        }
    }
    catch (Exception ex)
    {
        return Result<ObjectId>.Failure(Error.Infrastructure("Ошибка выбора объекта", ex));
    }
}
```

### Выбор нескольких объектов

```csharp
public static Result<ObjectId[]> SelectMultipleObjects(Editor ed, string prompt)
{
    try
    {
        PromptSelectionOptions options = new PromptSelectionOptions
        {
            MessageForAdding = $"\n{prompt}"
        };
        
        // Можно использовать фильтр
        // SelectionFilter filter = new SelectionFilter(new TypedValue[]
        // {
        //     new TypedValue((int)DxfCode.Operator, "<OR"),
        //     new TypedValue((int)DxfCode.LayerName, "WORK"),
        //     new TypedValue((int)DxfCode.LayerName, "MARKS"),
        //     new TypedValue((int)DxfCode.Operator, "OR>")
        // });
        
        PromptSelectionResult result = ed.GetSelection(options);
        
        if (result.Status == PromptStatus.OK && result.Value != null)
        {
            return Result<ObjectId[]>.Success(result.Value.GetObjectIds());
        }
        else
        {
            return Result<ObjectId[]>.Failure(Error.NotFound("Объекты не выбраны."));
        }
    }
    catch (Exception ex)
    {
        return Result<ObjectId[]>.Failure(Error.Infrastructure("Ошибка выбора объектов", ex));
    }
}
```

### Выбор с указанием точки

```csharp
public static Result<Point3d> SelectPoint(Editor ed, string prompt)
{
    try
    {
        PromptPointOptions options = new PromptPointOptions($"\n{prompt}");
        options.AllowNone = true;
        
        PromptPointResult result = ed.GetPoint(options);
        
        if (result.Status == PromptStatus.OK)
        {
            return Result<Point3d>.Success(result.Value);
        }
        else
        {
            return Result<Point3d>.Failure(Error.Cancelled("Выбор точки отменён."));
        }
    }
    catch (Exception ex)
    {
        return Result<Point3d>.Failure(Error.Infrastructure("Ошибка выбора точки", ex));
    }
}
```

---

## 🔑 Идентификация объектов: Handle vs ObjectId

### Проблема ObjectId

`ObjectId` — это **внутренний идентификатор объекта в текущей сессии AutoCAD**.

**Ограничения ObjectId**:
- ❌ Меняется при каждом открытии чертежа
- ❌ Не сохраняется в DWG-файле
- ❌ Не может быть использован для связи между сессиями
- ❌ Может стать невалидным после закрытия транзакции

### Решение: Handle

`Handle` — это **устойчивый идентификатор объекта**, сохраняемый в DWG-файле.

**Преимущества Handle**:
- ✅ Сохраняется в DWG-файле
- ✅ Не меняется при повторном открытии чертежа
- ✅ Может быть использован для связи между сессиями
- ✅ Уникален в пределах чертежа

### Получение Handle из ObjectId

```csharp
public static string GetHandleFromObjectId(Database db, ObjectId objectId)
{
    using (Transaction tr = db.TransactionManager.StartTransaction())
    {
        try
        {
            DBObject obj = tr.GetObject(objectId, OpenMode.ForRead);
            Handle handle = obj.Handle;
            string handleString = handle.ToString();  // Например: "1A4F"
            
            tr.Commit();
            return handleString;
        }
        finally
        {
            tr.Dispose();
        }
    }
}
```

### Получение ObjectId из Handle

```csharp
public static Result<ObjectId> GetObjectIdFromHandle(Database db, string handleString)
{
    try
    {
        // Handle хранится как шестнадцатеричная строка
        if (!long.TryParse(handleString, System.Globalization.NumberStyles.HexNumber, null, out long handleValue))
        {
            return Result<ObjectId>.Failure(Error.Validation($"Некорректный формат Handle: {handleString}"));
        }
        
        Handle handle = new Handle(handleValue);
        
        if (db.TryGetObjectId(handle, out ObjectId objectId))
        {
            return Result<ObjectId>.Success(objectId);
        }
        else
        {
            return Result<ObjectId>.Failure(Error.NotFound($"Объект с Handle {handleString} не найден в чертеже."));
        }
    }
    catch (Exception ex)
    {
        return Result<ObjectId>.Failure(Error.Infrastructure("Ошибка получения ObjectId из Handle", ex));
    }
}
```

### Проверка валидности ObjectId

```csharp
public static bool IsObjectIdValid(Database db, ObjectId objectId)
{
    try
    {
        if (objectId.IsNull || objectId.IsErased || objectId.IsValid)
        {
            return false;
        }
        
        using (Transaction tr = db.TransactionManager.StartTransaction())
        {
            DBObject obj = tr.GetObject(objectId, OpenMode.ForRead);
            tr.Commit();
            return obj != null;
        }
    }
    catch
    {
        return false;
    }
}
```

### Сохранение связи в Contracts

```csharp
// DTO для передачи между App и Plugin
public class AutoCADObjectInfo
{
    public string Handle { get; set; }        // Устойчивый идентификатор
    public string ObjectId { get; set; }      // Может быть null или невалидным
    public string DrawingPath { get; set; }   // Путь к DWG файлу
    public string ObjectType { get; set; }    // "Polyline", "Solid3d", "BlockReference"
    public string LayerName { get; set; }     // Имя слоя
    public string Color { get; set; }         // Цвет
    public string Linetype { get; set; }      // Тип линии
    public BoundingBoxInfo Bounds { get; set; }
    public Dictionary<string, string> Attributes { get; set; }
}

public class BoundingBoxInfo
{
    public double MinX { get; set; }
    public double MinY { get; set; }
    public double MinZ { get; set; }
    public double MaxX { get; set; }
    public double MaxY { get; set; }
    public double MaxZ { get; set; }
}
```

---

## 📐 Чтение геометрии объектов

### Получение Bounding Box

```csharp
public static BoundingBoxInfo GetBoundingBox(Entity entity)
{
    try
    {
        Extents3d extents = entity.GeometricExtents;
        
        return new BoundingBoxInfo
        {
            MinX = extents.MinPoint.X,
            MinY = extents.MinPoint.Y,
            MinZ = extents.MinPoint.Z,
            MaxX = extents.MaxPoint.X,
            MaxY = extents.MaxPoint.Y,
            MaxZ = extents.MaxPoint.Z
        };
    }
    catch
    {
        return null;
    }
}
```

### Чтение информации об объекте

```csharp
public static AutoCADObjectInfo ReadObjectInfo(Database db, ObjectId objectId)
{
    using (Transaction tr = db.TransactionManager.StartTransaction())
    {
        try
        {
            Entity entity = tr.GetObject(objectId, OpenMode.ForRead) as Entity;
            if (entity == null)
            {
                tr.Commit();
                return null;
            }
            
            var info = new AutoCADObjectInfo
            {
                Handle = entity.Handle.ToString(),
                ObjectId = objectId.ToString(),
                ObjectType = entity.GetType().Name,
                LayerName = entity.Layer,
                Color = entity.Color?.ColorName ?? "ByLayer",
                Linetype = entity.Linetype,
                Bounds = GetBoundingBox(entity),
                Attributes = new Dictionary<string, string>()
            };
            
            // Дополнительные атрибуты в зависимости от типа объекта
            if (entity is BlockReference blockRef)
            {
                info.Attributes["BlockName"] = blockRef.Name;
                // Чтение атрибутов блока
                foreach (ObjectId attrId in blockRef.AttributeCollection)
                {
                    AttributeReference attr = tr.GetObject(attrId, OpenMode.ForRead) as AttributeReference;
                    if (attr != null)
                    {
                        info.Attributes[$"Attr_{attr.Tag}"] = attr.TextString;
                    }
                }
            }
            
            tr.Commit();
            return info;
        }
        finally
        {
            tr.Dispose();
        }
    }
}
```

---

## 📏 Расчёт объёмов

### Интерфейс IVolumeProvider

```csharp
// В Domain проекте
public interface IVolumeProvider
{
    Task<Result<VolumeCalculation>> CalculateVolumeAsync(
        VolumeCalculationRequest request, 
        CancellationToken ct = default);
    
    bool CanCalculate(AutoCADObjectInfo objectInfo);
}

public class VolumeCalculationRequest
{
    public string DrawingPath { get; set; }
    public string ObjectHandle { get; set; }
    public string CalculationMethod { get; set; }  // "Solid3dVolume", "Area", "Length", etc.
    public string Unit { get; set; }
}

public class VolumeCalculation
{
    public double CalculatedQuantity { get; set; }
    public string Unit { get; set; }
    public string CalculationMethod { get; set; }
    public string CalculationDetailsJson { get; set; }
    public DateTime CalculatedAt { get; set; }
}
```

### Расчёт объёма 3D Solid

```csharp
public class Solid3dVolumeProvider : IVolumeProvider
{
    public bool CanCalculate(AutoCADObjectInfo objectInfo)
    {
        return objectInfo.ObjectType == "Solid3d";
    }
    
    public Task<Result<VolumeCalculation>> CalculateVolumeAsync(
        VolumeCalculationRequest request, 
        CancellationToken ct = default)
    {
        try
        {
            Document doc = Application.DocumentManager.MdiActiveDocument;
            if (doc == null)
            {
                return Task.FromResult(Result<VolumeCalculation>.Failure(
                    Error.NotFound("Активный документ не найден.")));
            }
            
            Database db = doc.Database;
            
            var objectIdResult = GetObjectIdFromHandle(db, request.ObjectHandle);
            if (objectIdResult.IsFailure)
            {
                return Task.FromResult(Result<VolumeCalculation>.Failure(objectIdResult.Error));
            }
            
            using (Transaction tr = db.TransactionManager.StartTransaction())
            {
                try
                {
                    Solid3d solid = tr.GetObject(objectIdResult.Value, OpenMode.ForRead) as Solid3d;
                    if (solid == null)
                    {
                        tr.Commit();
                        return Task.FromResult(Result<VolumeCalculation>.Failure(
                            Error.NotFound("Объект не является 3D Solid.")));
                    }
                    
                    double volume = solid.Volume;  // Объём в кубических единицах чертежа
                    
                    var calculation = new VolumeCalculation
                    {
                        CalculatedQuantity = volume,
                        Unit = request.Unit ?? "m3",
                        CalculationMethod = "Solid3dVolume",
                        CalculatedAt = DateTime.UtcNow
                    };
                    
                    tr.Commit();
                    return Task.FromResult(Result<VolumeCalculation>.Success(calculation));
                }
                finally
                {
                    tr.Dispose();
                }
            }
        }
        catch (Exception ex)
        {
            return Task.FromResult(Result<VolumeCalculation>.Failure(
                Error.Infrastructure("Ошибка расчёта объёма 3D Solid", ex)));
        }
    }
}
```

### Расчёт площади

```csharp
public class AreaVolumeProvider : IVolumeProvider
{
    public bool CanCalculate(AutoCADObjectInfo objectInfo)
    {
        return objectInfo.ObjectType == "Region" || 
               objectInfo.ObjectType == "Surface" ||
               objectInfo.ObjectType == "Polyline";
    }
    
    public Task<Result<VolumeCalculation>> CalculateVolumeAsync(
        VolumeCalculationRequest request, 
        CancellationToken ct = default)
    {
        try
        {
            Document doc = Application.DocumentManager.MdiActiveDocument;
            if (doc == null)
            {
                return Task.FromResult(Result<VolumeCalculation>.Failure(
                    Error.NotFound("Активный документ не найден.")));
            }
            
            Database db = doc.Database;
            
            var objectIdResult = GetObjectIdFromHandle(db, request.ObjectHandle);
            if (objectIdResult.IsFailure)
            {
                return Task.FromResult(Result<VolumeCalculation>.Failure(objectIdResult.Error));
            }
            
            using (Transaction tr = db.TransactionManager.StartTransaction())
            {
                try
                {
                    Entity entity = tr.GetObject(objectIdResult.Value, OpenMode.ForRead) as Entity;
                    if (entity == null)
                    {
                        tr.Commit();
                        return Task.FromResult(Result<VolumeCalculation>.Failure(
                            Error.NotFound("Объект не найден.")));
                    }
                    
                    double area = 0;
                    
                    if (entity is Region region)
                    {
                        area = region.Area;
                    }
                    else if (entity is Surface surface)
                    {
                        // Для поверхностей может потребоваться другой метод
                        // area = surface.GetArea();  // Проверить API для конкретной версии
                    }
                    else if (entity is Polyline polyline)
                    {
                        area = polyline.Area;
                    }
                    
                    var calculation = new VolumeCalculation
                    {
                        CalculatedQuantity = area,
                        Unit = request.Unit ?? "m2",
                        CalculationMethod = "Area",
                        CalculatedAt = DateTime.UtcNow
                    };
                    
                    tr.Commit();
                    return Task.FromResult(Result<VolumeCalculation>.Success(calculation));
                }
                finally
                {
                    tr.Dispose();
                }
            }
        }
        catch (Exception ex)
        {
            return Task.FromResult(Result<VolumeCalculation>.Failure(
                Error.Infrastructure("Ошибка расчёта площади", ex)));
        }
    }
}
```

### Расчёт длины

```csharp
public class LengthVolumeProvider : IVolumeProvider
{
    public bool CanCalculate(AutoCADObjectInfo objectInfo)
    {
        return objectInfo.ObjectType == "Line" || 
               objectInfo.ObjectType == "Polyline" ||
               objectInfo.ObjectType == "Arc" ||
               objectInfo.ObjectType == "Circle" ||
               objectInfo.ObjectType == "Spline";
    }
    
    public Task<Result<VolumeCalculation>> CalculateVolumeAsync(
        VolumeCalculationRequest request, 
        CancellationToken ct = default)
    {
        try
        {
            Document doc = Application.DocumentManager.MdiActiveDocument;
            if (doc == null)
            {
                return Task.FromResult(Result<VolumeCalculation>.Failure(
                    Error.NotFound("Активный документ не найден.")));
            }
            
            Database db = doc.Database;
            
            var objectIdResult = GetObjectIdFromHandle(db, request.ObjectHandle);
            if (objectIdResult.IsFailure)
            {
                return Task.FromResult(Result<VolumeCalculation>.Failure(objectIdResult.Error));
            }
            
            using (Transaction tr = db.TransactionManager.StartTransaction())
            {
                try
                {
                    Curve curve = tr.GetObject(objectIdResult.Value, OpenMode.ForRead) as Curve;
                    if (curve == null)
                    {
                        tr.Commit();
                        return Task.FromResult(Result<VolumeCalculation>.Failure(
                            Error.NotFound("Объект не является кривой.")));
                    }
                    
                    double length = curve.Length;
                    
                    var calculation = new VolumeCalculation
                    {
                        CalculatedQuantity = length,
                        Unit = request.Unit ?? "m",
                        CalculationMethod = "Length",
                        CalculatedAt = DateTime.UtcNow
                    };
                    
                    tr.Commit();
                    return Task.FromResult(Result<VolumeCalculation>.Success(calculation));
                }
                finally
                {
                    tr.Dispose();
                }
            }
        }
        catch (Exception ex)
        {
            return Task.FromResult(Result<VolumeCalculation>.Failure(
                Error.Infrastructure("Ошибка расчёта длины", ex)));
        }
    }
}
```

### Расчёт из атрибутов блока

```csharp
public class AttributeVolumeProvider : IVolumeProvider
{
    public bool CanCalculate(AutoCADObjectInfo objectInfo)
    {
        return objectInfo.ObjectType == "BlockReference";
    }
    
    public Task<Result<VolumeCalculation>> CalculateVolumeAsync(
        VolumeCalculationRequest request, 
        CancellationToken ct = default)
    {
        try
        {
            Document doc = Application.DocumentManager.MdiActiveDocument;
            if (doc == null)
            {
                return Task.FromResult(Result<VolumeCalculation>.Failure(
                    Error.NotFound("Активный документ не найден.")));
            }
            
            Database db = doc.Database;
            
            var objectIdResult = GetObjectIdFromHandle(db, request.ObjectHandle);
            if (objectIdResult.IsFailure)
            {
                return Task.FromResult(Result<VolumeCalculation>.Failure(objectIdResult.Error));
            }
            
            using (Transaction tr = db.TransactionManager.StartTransaction())
            {
                try
                {
                    BlockReference blockRef = tr.GetObject(objectIdResult.Value, OpenMode.ForRead) as BlockReference;
                    if (blockRef == null)
                    {
                        tr.Commit();
                        return Task.FromResult(Result<VolumeCalculation>.Failure(
                            Error.NotFound("Объект не является блоком.")));
                    }
                    
                    // Ищем атрибут с именем VOLUME (или другим заданным)
                    string attributeName = "VOLUME";  // Может быть настроен в volume-rules.json
                    
                    foreach (ObjectId attrId in blockRef.AttributeCollection)
                    {
                        AttributeReference attr = tr.GetObject(attrId, OpenMode.ForRead) as AttributeReference;
                        if (attr != null && attr.Tag == attributeName)
                        {
                            if (double.TryParse(attr.TextString, out double volume))
                            {
                                var calculation = new VolumeCalculation
                                {
                                    CalculatedQuantity = volume,
                                    Unit = request.Unit ?? "m3",
                                    CalculationMethod = "Attribute",
                                    CalculationDetailsJson = $"{{\"attributeName\":\"{attributeName}\"}}",
                                    CalculatedAt = DateTime.UtcNow
                                };
                                
                                tr.Commit();
                                return Task.FromResult(Result<VolumeCalculation>.Success(calculation));
                            }
                            else
                            {
                                tr.Commit();
                                return Task.FromResult(Result<VolumeCalculation>.Failure(
                                    Error.Validation($"Атрибут {attributeName} содержит нечисловое значение: {attr.TextString}")));
                            }
                        }
                    }
                    
                    tr.Commit();
                    return Task.FromResult(Result<VolumeCalculation>.Failure(
                        Error.NotFound($"Атрибут {attributeName} не найден в блоке.")));
                }
                finally
                {
                    tr.Dispose();
                }
            }
        }
        catch (Exception ex)
        {
            return Task.FromResult(Result<VolumeCalculation>.Failure(
                Error.Infrastructure("Ошибка расчёта из атрибута блока", ex)));
        }
    }
}
```

---

## 🏷️ Графические метки

### Концепция графической метки

Графическая метка — это визуальное представление связи между объектом AutoCAD и позицией сметы.

**Вид**:
```
┌───────────────────────────┐
│ ИД-000125                 │
│ Работа: 01-01-001-01     │
│ Объём: 125.40 м³         │
└───────────────────────────┘
             │
             ▼
          объект
```

**Важно**: Графическое представление отделено от бизнес-модели. Текст и оформление метки НЕ являются единственным источником информации.

### Варианты реализации графической метки

1. **MText** — многострочный текст с рамкой
2. **Block** — именованный блок с атрибутами
3. **Jig** — интерактивное размещение

**Рекомендация**: Использовать **Block с атрибутами**, так как:
- Легко обновлять
- Можно извлекать данные из атрибутов
- Выглядит профессионально
- Может быть перемещён без потери данных

### Создание определения блока

```csharp
public static ObjectId CreateMarkBlockDefinition(Database db, Transaction tr)
{
    try
    {
        // Проверяем, существует ли уже блок
        BlockTable blockTable = tr.GetObject(db.BlockTableId, OpenMode.ForRead) as BlockTable;
        if (blockTable.Has("EXECDOC_MARK"))
        {
            return blockTable["EXECDOC_MARK"];
        }
        
        // Создаём новый блок
        BlockTableRecord blockDef = new BlockTableRecord();
        blockDef.Name = "EXECDOC_MARK";
        blockDef.Origin = Point3d.Origin;
        
        // Добавляем в таблицу блоков
        blockTable.UpgradeOpen();
        ObjectId blockDefId = blockTable.Add(blockDef);
        tr.AddNewlyCreatedDBObject(blockDef, true);
        
        // Добавляем геометрию блока
        
        // Рамка (прямоугольник)
        double width = 100;   // Ширина рамки
        double height = 40;   // Высота рамки
        
        Polyline frame = new Polyline();
        frame.AddVertexAt(0, new Point2d(0, 0), 0, 0, 0);
        frame.AddVertexAt(1, new Point2d(width, 0), 0, 0, 0);
        frame.AddVertexAt(2, new Point2d(width, height), 0, 0, 0);
        frame.AddVertexAt(3, new Point2d(0, height), 0, 0, 0);
        frame.Closed = true;
        frame.Layer = "EXECDOC_MARKS";
        frame.ColorIndex = 1;  // Красный
        
        blockDef.AppendEntity(frame);
        tr.AddNewlyCreatedDBObject(frame, true);
        
        // Линия-выноска (от блока к объекту)
        Line leader = new Line(
            new Point3d(width / 2, 0, 0),
            new Point3d(width / 2, -20, 0));
        leader.Layer = "EXECDOC_MARKS";
        leader.ColorIndex = 1;
        
        blockDef.AppendEntity(leader);
        tr.AddNewlyCreatedDBObject(leader, true);
        
        // Атрибуты блока
        
        // Атрибут: MarkNumber
        AttributeDefinition markNumberAttr = new AttributeDefinition();
        markNumberAttr.Tag = "MARK_NUMBER";
        markNumberAttr.Prompt = "Номер метки";
        markNumberAttr.TextString = "ИД-000000";
        markNumberAttr.Position = new Point3d(5, height - 12, 0);
        markNumberAttr.Height = 8;
        markNumberAttr.Layer = "EXECDOC_MARKS";
        markNumberAttr.ColorIndex = 7;  // Белый/чёрный
        
        blockDef.AppendEntity(markNumberAttr);
        tr.AddNewlyCreatedDBObject(markNumberAttr, true);
        
        // Атрибут: WorkCode
        AttributeDefinition workCodeAttr = new AttributeDefinition();
        workCodeAttr.Tag = "WORK_CODE";
        workCodeAttr.Prompt = "Код работы";
        workCodeAttr.TextString = "";
        workCodeAttr.Position = new Point3d(5, height - 24, 0);
        workCodeAttr.Height = 6;
        workCodeAttr.Layer = "EXECDOC_MARKS";
        workCodeAttr.ColorIndex = 7;
        
        blockDef.AppendEntity(workCodeAttr);
        tr.AddNewlyCreatedDBObject(workCodeAttr, true);
        
        // Атрибут: Volume
        AttributeDefinition volumeAttr = new AttributeDefinition();
        volumeAttr.Tag = "VOLUME";
        volumeAttr.Prompt = "Объём";
        volumeAttr.TextString = "";
        volumeAttr.Position = new Point3d(5, height - 36, 0);
        volumeAttr.Height = 6;
        volumeAttr.Layer = "EXECDOC_MARKS";
        volumeAttr.ColorIndex = 7;
        
        blockDef.AppendEntity(volumeAttr);
        tr.AddNewlyCreatedDBObject(volumeAttr, true);
        
        return blockDefId;
    }
    catch (Exception ex)
    {
        Logger.Error("Error creating mark block definition", ex);
        throw;
    }
}
```

### Размещение метки на чертеже

```csharp
public static Result<ObjectId> PlaceMarkOnDrawing(
    Database db, 
    Transaction tr,
    ObjectId blockDefId,
    Point3d insertionPoint,
    string markNumber,
    string workCode,
    string volumeText)
{
    try
    {
        // Создаём ссылку на блок
        BlockReference blockRef = new BlockReference(insertionPoint, blockDefId);
        blockRef.Layer = "EXECDOC_MARKS";
        
        // Добавляем в model space
        BlockTable blockTable = tr.GetObject(db.BlockTableId, OpenMode.ForRead) as BlockTable;
        BlockTableRecord modelSpace = tr.GetObject(blockTable[BlockTableRecord.ModelSpace], OpenMode.ForWrite) as BlockTableRecord;
        
        modelSpace.AppendEntity(blockRef);
        tr.AddNewlyCreatedDBObject(blockRef, true);
        
        // Добавляем атрибуты к ссылке на блок
        BlockTableRecord blockDef = tr.GetObject(blockDefId, OpenMode.ForRead) as BlockTableRecord;
        
        foreach (ObjectId entId in blockDef)
        {
            Entity ent = tr.GetObject(entId, OpenMode.ForRead) as Entity;
            if (ent is AttributeDefinition attrDef)
            {
                AttributeReference attrRef = new AttributeReference();
                attrRef.SetAttributeFromBlock(attrDef, blockRef.BlockTransform);
                
                // Устанавливаем значения атрибутов
                switch (attrDef.Tag)
                {
                    case "MARK_NUMBER":
                        attrRef.TextString = markNumber;
                        break;
                    case "WORK_CODE":
                        attrRef.TextString = workCode;
                        break;
                    case "VOLUME":
                        attrRef.TextString = volumeText;
                        break;
                }
                
                blockRef.AttributeCollection.AppendAttribute(attrRef);
                tr.AddNewlyCreatedDBObject(attrRef, true);
            }
        }
        
        return Result<ObjectId>.Success(blockRef.ObjectId);
    }
    catch (Exception ex)
    {
        return Result<ObjectId>.Failure(Error.Infrastructure("Ошибка размещения метки", ex));
    }
}
```

### Обновление метки

```csharp
public static Result UpdateMarkAttributes(
    Database db,
    Transaction tr,
    ObjectId blockRefId,
    string markNumber,
    string workCode,
    string volumeText)
{
    try
    {
        BlockReference blockRef = tr.GetObject(blockRefId, OpenMode.ForWrite) as BlockReference;
        if (blockRef == null)
        {
            return Result.Failure(Error.NotFound("Метка не найдена."));
        }
        
        foreach (ObjectId attrId in blockRef.AttributeCollection)
        {
            AttributeReference attrRef = tr.GetObject(attrId, OpenMode.ForWrite) as AttributeReference;
            if (attrRef == null) continue;
            
            switch (attrRef.Tag)
            {
                case "MARK_NUMBER":
                    attrRef.TextString = markNumber;
                    break;
                case "WORK_CODE":
                    attrRef.TextString = workCode;
                    break;
                case "VOLUME":
                    attrRef.TextString = volumeText;
                    break;
            }
        }
        
        return Result.Success();
    }
    catch (Exception ex)
    {
        return Result.Failure(Error.Infrastructure("Ошибка обновления метки", ex));
    }
}
```

---

## 🌍 Локализация

### Принципы локализации

1. **Имена команд**: Английские, локализационно независимые
2. **Сообщения пользователю**: Локализованные строки из ресурсов
3. **Единицы измерения**: Настраиваемые
4. **Форматы чисел и дат**: Учитывать локаль пользователя

### Использование ресурсов

```csharp
// Resources.resx (по умолчанию - английский)
// CommandAddMark = "Add Mark"
// CommandSelectObject = "Select Object"
// ErrorObjectNotFound = "Object not found"

// Resources.ru-RU.resx (русский)
// CommandAddMark = "Добавить метку"
// CommandSelectObject = "Выбрать объект"
// ErrorObjectNotFound = "Объект не найден"

public static class LocalizationService
{
    public static string GetString(string key)
    {
        return Resources.ResourceManager.GetString(key, Resources.Culture);
    }
    
    public static void SetCulture(string cultureName)
    {
        Resources.Culture = new System.Globalization.CultureInfo(cultureName);
    }
}
```

### Форматирование чисел

```csharp
public static string FormatQuantity(double quantity, string unit)
{
    // Учитываем локаль пользователя
    var culture = System.Globalization.CultureInfo.CurrentCulture;
    
    string formatted = quantity.ToString("F2", culture);
    
    return $"{formatted} {unit}";
}
```

---

## ⚠️ Обработка ошибок

### Общие принципы

1. **Все исключения ловить** на уровне команд
2. **Писать в лог** технические детали
3. **Показывать пользователю** понятное сообщение
4. **НЕ прерывать** работу AutoCAD

### Обёртка для команд

```csharp
public static void ExecuteCommandSafely(Editor ed, string commandName, Action action)
{
    try
    {
        ed.WriteMessage($"\n[ExecDoc] Команда {commandName} запущена.");
        action();
        ed.WriteMessage($"\n[ExecDoc] Команда {commandName} завершена успешно.");
    }
    catch (Exception ex)
    {
        Logger.Error($"Error in command {commandName}", ex);
        ed.WriteMessage($"\n[ExecDoc] Ошибка в команде {commandName}: {ex.Message}");
        
        // Можно показать диалог с подробностями
        // Application.ShowAlertDialog($"Ошибка: {ex.Message}\n\n{ex.StackTrace}");
    }
}
```

### Использование в команде

```csharp
[CommandMethod("EXECDOC_ADDMARK")]
public void AddMark()
{
    Document doc = Application.DocumentManager.MdiActiveDocument;
    if (doc == null) return;
    
    Editor ed = doc.Editor;
    
    ExecuteCommandSafely(ed, "EXECDOC_ADDMARK", () =>
    {
        // Логика команды
    });
}
```

---

## 🐛 Отладка плагина

### Запуск отладки в Visual Studio

1. Открыть свойства проекта Plugin
2. Вкладка **Debug**
3. **Start external program**: Указать путь к `acad.exe`
   - Например: `C:\Program Files\Autodesk\AutoCAD 2024\acad.exe`
4. **Command line arguments**: Можно оставить пустыми
5. **Working directory**: Папка с AutoCAD

### Загрузка плагина при отладке

1. Запустить отладку (F5)
2. AutoCAD запустится
3. В AutoCAD выполнить команду `NETLOAD`
4. Выбрать DLL плагина
5. Плагин загрузится, можно тестировать команды

### Логирование в файл

```csharp
public static class Logger
{
    private static readonly string LogFilePath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "ExecutiveDocumentation",
        "Logs",
        "autocad-plugin.log");
    
    static Logger()
    {
        string dir = Path.GetDirectoryName(LogFilePath);
        if (!Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }
    }
    
    public static void Info(string message)
    {
        WriteLog("INFO", message, null);
    }
    
    public static void Warning(string message)
    {
        WriteLog("WARNING", message, null);
    }
    
    public static void Error(string message, Exception ex = null)
    {
        WriteLog("ERROR", message, ex);
    }
    
    private static void WriteLog(string level, string message, Exception ex)
    {
        try
        {
            string timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss.fff");
            string logEntry = $"[{timestamp}] [{level}] {message}";
            
            if (ex != null)
            {
                logEntry += $"\n  Exception: {ex.GetType().Name}: {ex.Message}";
                if (ex.StackTrace != null)
                {
                    logEntry += $"\n  StackTrace: {ex.StackTrace}";
                }
            }
            
            File.AppendAllText(LogFilePath, logEntry + Environment.NewLine);
        }
        catch
        {
            // Игнорируем ошибки логирования
        }
    }
}
```

---

## 🔗 IPC: Named Pipes клиент

### Подключение к основному приложению

```csharp
public class IpcClient : IDisposable
{
    private readonly string _pipeName;
    private NamedPipeClientStream _client;
    private StreamWriter _writer;
    private StreamReader _reader;
    private bool _isConnected;
    private readonly SemaphoreSlim _lock = new SemaphoreSlim(1, 1);
    
    public IpcClient(string pipeName)
    {
        _pipeName = pipeName;
    }
    
    public async Task<bool> ConnectAsync()
    {
        await _lock.WaitAsync();
        try
        {
            if (_isConnected) return true;
            
            try
            {
                _client = new NamedPipeClientStream(".", _pipeName, PipeDirection.InOut, PipeOptions.Asynchronous);
                await _client.ConnectAsync(5000);  // Таймаут 5 секунд
                
                _writer = new StreamWriter(_client) { AutoFlush = true };
                _reader = new StreamReader(_client);
                
                _isConnected = true;
                Logger.Info($"Connected to IPC pipe: {_pipeName}");
                
                // Запускаем цикл чтения сообщений
                _ = Task.Run(() => ReadMessagesAsync());
                
                return true;
            }
            catch (Exception ex)
            {
                Logger.Error($"Failed to connect to IPC pipe: {_pipeName}", ex);
                _isConnected = false;
                return false;
            }
        }
        finally
        {
            _lock.Release();
        }
    }
    
    public async Task SendAsync(IpcMessage message)
    {
        if (!_isConnected)
        {
            Logger.Warning("IPC client is not connected. Message not sent.");
            return;
        }
        
        await _lock.WaitAsync();
        try
        {
            string json = JsonSerializer.Serialize(message);
            await _writer.WriteLineAsync(json);
        }
        catch (Exception ex)
        {
            Logger.Error("Error sending IPC message", ex);
            _isConnected = false;
        }
        finally
        {
            _lock.Release();
        }
    }
    
    private async Task ReadMessagesAsync()
    {
        while (_isConnected)
        {
            try
            {
                string line = await _reader.ReadLineAsync();
                if (line == null)
                {
                    _isConnected = false;
                    break;
                }
                
                var message = JsonSerializer.Deserialize<IpcMessage>(line);
                if (message != null)
                {
                    HandleIncomingMessage(message);
                }
            }
            catch (Exception ex)
            {
                Logger.Error("Error reading IPC message", ex);
                _isConnected = false;
                break;
            }
        }
    }
    
    private void HandleIncomingMessage(IpcMessage message)
    {
        // Обработка входящих сообщений от основного приложения
        switch (message.MessageType)
        {
            case "SelectObjectCommand":
                // Обработка команды выбора объекта
                break;
            case "AddMarkCommand":
                // Обработка команды добавления метки
                break;
            case "CalculateVolumeCommand":
                // Обработка команды расчёта объёма
                break;
        }
    }
    
    public void Dispose()
    {
        _writer?.Dispose();
        _reader?.Dispose();
        _client?.Dispose();
        _lock?.Dispose();
    }
}
```

---

## 📚 Полезные ссылки и ресурсы

### Официальная документация

- **AutoCAD .NET API Reference**: https://help.autodesk.com/view/OARX/2024/ENU/
- **AutoCAD Developer Documentation**: https://www.autodesk.com/developer-network/platform-technologies/autocad
- **AutoCAD .NET API Forums**: https://forums.autodesk.com/t5/net/ct-p/152

### NuGet пакеты для AutoCAD

AutoCAD .NET API **НЕ распространяется через NuGet**. DLL-файлы необходимо ссылать напрямую из папки установки AutoCAD:

```
C:\Program Files\Autodesk\AutoCAD 2024\
├── AcMgd.dll          # Application services
├── AcDbMgd.dll        # Database services
├── AcCoreMgd.dll      # Core services
└── acdb24.dll         # Native (не используется напрямую)
```

### Настройка ссылок в .csproj

```xml
<!-- Для AutoCAD 2024 (.NET Framework 4.8) -->
<ItemGroup>
  <Reference Include="AcMgd">
    <HintPath>C:\Program Files\Autodesk\AutoCAD 2024\AcMgd.dll</HintPath>
    <Private>false</Private>
  </Reference>
  <Reference Include="AcDbMgd">
    <HintPath>C:\Program Files\Autodesk\AutoCAD 2024\AcDbMgd.dll</HintPath>
    <Private>false</Private>
  </Reference>
  <Reference Include="AcCoreMgd">
    <HintPath>C:\Program Files\Autodesk\AutoCAD 2024\AcCoreMgd.dll</HintPath>
    <Private>false</Private>
  </Reference>
</ItemGroup>
```

**ВАЖНО**: `Private` должен быть `false`, чтобы DLL не копировались в выходную папку (AutoCAD загружает свои DLL сам).

---

## ✅ Чек-лист готовности AutoCAD Plugin

Перед тем как считать AutoCAD Plugin готовым, необходимо:

- [ ] Версия AutoCAD пользователя определена
- [ ] Целевой фреймворк определён (.NET Framework 4.8 или .NET 8.0)
- [ ] Проект Plugin создан
- [ ] Точка входа (IExtensionApplication) реализована
- [ ] Команды зарегистрированы
- [ ] Выбор объектов работает
- [ ] Handle получается и сохраняется
- [ ] ObjectId восстанавливается из Handle
- [ ] Расчёт объёмов работает для основных типов объектов
- [ ] Графические метки создаются
- [ ] Графические метки обновляются
- [ ] IPC клиент подключается к основному приложению
- [ ] IPC сообщения отправляются и принимаются
- [ ] Обработка ошибок реализована
- [ ] Логирование работает
- [ ] Локализация учтена
- [ ] Плагин загружается через NETLOAD
- [ ] Плагин выгружается без ошибок
- [ ] Тесты написаны (для VolumeProviders)
- [ ] Документация обновлена
- [ ] CHANGELOG обновлён
