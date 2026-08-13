# Backlog & Future Improvements

## Long-term Ideas
1. **Multi-user Mode**: Реализация сетевого режима через SQLite WAL mode + файловая блокировка или переход на PostgreSQL для командной работы.
2. **Cloud Sync**: Опциональная синхронизация проекта с облачным хранилищем (OneDrive/Dropbox) для бэкапа.
3. **BIM Integration**: Прямая работа с IFC моделями через Revit API или Forge (удаленно).
4. **Smart Templates**: Шаблоны актов для разных типов работ (земляные, монолит, отделка).
5. **Mobile Viewer**: Приложение для планшета прораба (просмотр актов и объемов на объекте).

## Technical Debts to Watch
- Версионирование форматов DWG.
- Производительность при загрузке смет > 10,000 позиций.
- Стабильность Named Pipes при зависании AutoCAD.
