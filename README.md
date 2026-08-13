# Executive Documentation System (EDS)

Desktop-приложение для автоматизации ведения исполнительной документации в строительстве.

## Features
- Импорт смет из Гранд-Смета (XML/Excel).
- Интеграция с AutoCAD (привязка объемов к геометрии).
- Генерация актов КС-2, КС-3.
- Локальное хранение данных (SQLite).

## Tech Stack
- C# (.NET 8 / .NET Framework 4.8)
- WinForms
- SQLite (Dapper + EF Core)
- AutoCAD .NET API
- Named Pipes (IPC)

## Structure
See `.ai/ARCHITECTURE.md` for detailed design.

## Getting Started
1. Open `ExecutiveDocumentation.sln` in Visual Studio 2022.
2. Restore NuGet packages.
3. Set `ExecutiveDocumentation.App` as startup project.

## Build Status
[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
