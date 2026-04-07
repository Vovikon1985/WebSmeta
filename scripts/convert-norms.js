// scripts/convert-norms.js
// Пакетная конвертация нормативных баз (ГЭСН, ГЭСНм, ГЭСНмр, ГЭСНп, ГЭСНр)

import fs from 'fs-extra';
import path from 'path';
import { DOMParser } from '@xmldom/xmldom';
import { fileURLToPath } from 'url';

// 👇 Настройки путей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');

// 👇 Список баз, которые нужно конвертировать
const TARGET_BASES = ['ГЭСН', 'ГЭСНм', 'ГЭСНмр', 'ГЭСНп', 'ГЭСНр'];

/**
 * Основная функция конвертации одного файла
 */
async function convertNorms(fileName) {
  const xmlPath = path.join(UPLOADS_DIR, fileName);
  const baseName = path.parse(fileName).name;
  const outputBaseDir = path.join(DATA_DIR, baseName);
  const tablesDir = path.join(outputBaseDir, 'tables');

  console.log(`   📂 Исходный: ${fileName}`);
  console.log(`   📂 Вывод: public/data/${baseName}`);

  try {
    // 1. Чтение и очистка XML
    let xmlContent = await fs.readFile(xmlPath, 'utf-8');
    
    // Очистка от BOM и лишних символов перед <?xml
    if (xmlContent.charCodeAt(0) === 0xFEFF) {
      xmlContent = xmlContent.slice(1);
    }
    
    const xmlStartIndex = xmlContent.indexOf('<?xml');
    if (xmlStartIndex > 0) {
      xmlContent = xmlContent.slice(xmlStartIndex);
    }
    
    if (!xmlContent.trim().startsWith('<?xml')) {
      throw new Error('Неверный формат XML: файл должен начинаться с <?xml');
    }

    // 2. Парсинг XML
    let parseError = null;
    const parser = new DOMParser({
      onError: (level, msg) => {
        if (level === 'fatalError') parseError = new Error(`XML Fatal: ${msg}`);
        else if (level === 'error') console.error('   ❌ XML Error:', msg);
        else if (level === 'warning') console.warn('   ⚠️ XML Warning:', msg);
      }
    });

    const xmlDoc = parser.parseFromString(xmlContent.trim(), 'text/xml');

    if (parseError) throw parseError;

    const parseErrors = xmlDoc.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
      throw new Error(`Ошибка парсинга XML: ${parseErrors[0].textContent}`);
    }

    console.log('   ✅ XML распарсен');
    await fs.ensureDir(tablesDir);

    // 3. Обход XML и сбор данных
    const treeStructure = []; 
    const searchIndex = [];
    const categories = xmlDoc.getElementsByTagName('ResourceCategory');

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      const catName = cat.getAttribute('Type');
      if (!catName) continue;

      const collections = [];
      const sections = cat.getElementsByTagName('Section');

      for (let j = 0; j < sections.length; j++) {
        const section = sections[j];
        const sectionCode = section.getAttribute('Code');
        const sectionName = section.getAttribute('Name');
        const sectionType = section.getAttribute('Type');

        if (sectionType !== 'Сборник') continue;
        if (!sectionCode) continue;

        const collection = { code: sectionCode, name: sectionName, divisions: [] };
        const nestedSections = section.getElementsByTagName('Section');

        for (let k = 0; k < nestedSections.length; k++) {
          const division = nestedSections[k];
          const divCode = division.getAttribute('Code');
          const divName = division.getAttribute('Name');
          const divType = division.getAttribute('Type');

          if (divType !== 'Раздел') continue;
          if (!divCode) continue;

          const divisionObj = { code: divCode, name: divName, tables: [] };

          // Вариант А: Прямые <Table>
          const tables = division.getElementsByTagName('Table');
          for (let t = 0; t < tables.length; t++) {
            await processTable(tables[t], divisionObj, tablesDir, searchIndex);
          }

          // Вариант Б: <Section type="Таблица">
          const tableSections = division.getElementsByTagName('Section');
          for (let s = 0; s < tableSections.length; s++) {
            const tSection = tableSections[s];
            if (tSection.getAttribute('Type') === 'Таблица') {
              const fakeTable = {
                getAttribute: (attr) => {
                  if (attr === 'Code') return tSection.getAttribute('Code');
                  if (attr === 'Name') return tSection.getAttribute('Name');
                  if (attr === 'Num') return tSection.getAttribute('Num');
                  if (attr === 'Caption') return tSection.getAttribute('Caption');
                  return null;
                },
                getElementsByTagName: (tag) => {
                  if (tag === 'NameGroup') return tSection.getElementsByTagName('NameGroup');
                  return [];
                }
              };
              await processTable(fakeTable, divisionObj, tablesDir, searchIndex);
            }
          }

          if (divisionObj.tables.length > 0) {
            collection.divisions.push(divisionObj);
          }
        }

        if (collection.divisions.length > 0) collections.push(collection);
      }

      if (collections.length > 0) {
        treeStructure.push({ name: catName, collections });
      }
    }

    // 4. Сохранение
    await fs.writeJson(path.join(outputBaseDir, 'meta.json'), {
      name: baseName,
      tree: treeStructure,
      generatedAt: new Date().toISOString()
    }, { spaces: 2 });

    await fs.writeJson(path.join(outputBaseDir, 'search.json'), {
      works: searchIndex,
      generatedAt: new Date().toISOString()
    }, { spaces: 2 });

    console.log(`   📊 Работ: ${searchIndex.length}`);
    console.log(`   💾 Сохранено: ${outputBaseDir}`);

  } catch (error) {
    console.error(`   ❌ Ошибка конвертации ${fileName}:`, error.message);
    throw error;
  }
}

/**
 * Обработка одной таблицы
 */
async function processTable(tableNode, divisionObj, tablesDir, searchIndex) {
  const tableCode = tableNode.getAttribute('Code') || tableNode.getAttribute('Num') || 'unknown';
  const tableName = tableNode.getAttribute('Name') || tableNode.getAttribute('Caption') || '';

  if (!divisionObj.tables.includes(tableCode)) divisionObj.tables.push(tableCode);

  const works = [];
  const nameGroups = tableNode.getElementsByTagName('NameGroup');

  for (let i = 0; i < nameGroups.length; i++) {
    const group = nameGroups[i];
    const beginName = group.getAttribute('BeginName') || '';
    const worksNodes = group.getElementsByTagName('Work');

    for (let j = 0; j < worksNodes.length; j++) {
      const work = worksNodes[j];
      const workCode = work.getAttribute('Code');
      if (!workCode) continue;

      const workName = work.getAttribute('Name') || work.getAttribute('Text') || '';
      const measureUnit = work.getAttribute('MeasureUnit') || '';
      const fullName = beginName ? `${beginName} ${workName}`.trim() : workName;

      searchIndex.push({ code: workCode, name: fullName, tableCode, tableName, measureUnit });
      works.push({ code: workCode, name: fullName, measureUnit });
    }
  }

  if (works.length > 0) {
    await fs.writeJson(path.join(tablesDir, `${tableCode}.json`), {
      code: tableCode, name: tableName, works
    }, { spaces: 2 });
  }
}

/**
 * Главная функция запуска пакетной обработки
 */
async function runBatchConversion() {
  console.log('🚀 ЗАПУСК ПАКЕТНОЙ КОНВЕРТАЦИИ\n');

  // Проверка наличия папки uploads
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error('❌ Папка uploads не найдена!');
    return;
  }

  const allFiles = fs.readdirSync(UPLOADS_DIR);
  
  // Фильтруем только XML файлы
  const xmlFiles = allFiles.filter(f => f.toLowerCase().endsWith('.xml'));

  if (xmlFiles.length === 0) {
    console.log('⚠️ В папке uploads нет XML файлов.');
    return;
  }

  console.log(`📂 Найдено файлов: ${xmlFiles.length}`);
  console.log('----------------------------------------');

  let successCount = 0;
  let errorCount = 0;

  // Перебираем файлы
  for (const file of xmlFiles) {
    const fileNameWithoutExt = path.parse(file).name;

    // Проверяем, есть ли файл в списке целевых баз
    if (TARGET_BASES.includes(fileNameWithoutExt)) {
      try {
        await convertNorms(file);
        successCount++;
      } catch (e) {
        errorCount++;
      }
      console.log('----------------------------------------');
    } else {
      // Для отладки можно раскомментировать, чтобы видеть пропущенные файлы
      // console.log(`⏭️ Пропуск: ${file} (не в списке целевых баз)`);
    }
  }

  console.log('\n🏁 РЕЗУЛЬТАТ:');
  console.log(`✅ Успешно: ${successCount}`);
  console.log(`❌ Ошибки: ${errorCount}`);
  console.log(`📂 Данные сохранены в: public/data/`);
}

// Запуск
runBatchConversion().catch(err => console.error('Критическая ошибка:', err));