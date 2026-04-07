// src/services/normsParser.js
/**
 * Парсер нормативных файлов ГЭСН/ГЭСНр/ГЭСНмр/ГЭСНп/ГЭСНм
 * Преобразует XML в структурированные данные для приложения
 */

console.log('🔧 normsParser.js: Загрузка модуля');

/**
 * Основной класс парсера
 */
export class NormsParser {
  constructor() {
    console.log('📦 NormsParser: Создание экземпляра');
    this.parser = new DOMParser();
  }

  /**
   * Парсит файл норматива и возвращает структурированные данные
   * @param {File} file - XML файл норматива
   * @returns {Promise<Object>} - Объект с данными норматива
   */
  async parseFile(file) {
    console.log('🔍 Парсинг нормативного файла:', file.name);
    
    try {
      // Чтение файла
      const xmlContent = await this._readFile(file);
      console.log('📄 Длина XML:', xmlContent.length, 'символов');
      
      // Парсинг XML
      const xmlDoc = this.parser.parseFromString(xmlContent, 'application/xml');
      
      // Проверка на ошибки парсинга
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('Ошибка парсинга XML: ' + parseError.textContent);
      }
      
      // Извлечение метаданных
      const meta = this._extractMeta(xmlDoc, file.name);
      console.log('📋 Метаданные норматива:', meta);
      
      // Извлечение иерархии
      const hierarchy = this._extractHierarchy(xmlDoc, meta.type);
      
      console.log('✅ Загружено работ:', hierarchy.works?.length || 0);
      console.log('✅ Загружено таблиц:', hierarchy.tables?.length || 0);
      
      return {
        success: true,
        fileName: file.name,
        data: {
          fileName: file.name,
          meta,
          hierarchy,
          loadedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('💥 parseFile ошибка:', error);
      console.error('  - Stack:', error.stack);
      return {
        success: false,
        fileName: file.name,
        error: error.message
      };
    }
  }

  /**
   * Читает содержимое файла
   * @param {File} file 
   * @returns {Promise<string>}
   */
  _readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target.result;
        console.log('📄 Использована кодировка: utf-8');
        console.log('🔍 Начало:', content.substring(0, 100).replace(/\s+/g, ' '));
        resolve(content);
      };
      
      reader.onerror = (e) => reject(e);
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * Извлекает метаданные из XML
   * @param {XMLDocument} xmlDoc 
   * @param {string} fileName 
   * @returns {Object}
   */
  _extractMeta(xmlDoc, fileName) {
    const base = xmlDoc.querySelector('base');
    
    // 👇 ЯВНОЕ ОПРЕДЕЛЕНИЕ ТИПА ПО ИМЕНИ ФАЙЛА
    let type = 'ГЭСН';
    if (fileName.includes('ГЭСНмр')) {
      type = 'ГЭСНмр';
    } else if (fileName.includes('ГЭСНр')) {
      type = 'ГЭСНр';
    } else if (fileName.includes('ГЭСНм')) {
      type = 'ГЭСНм';
    } else if (fileName.includes('ГЭСНп')) {
      type = 'ГЭСНп';
    } else if (fileName.includes('ФЕР')) {
      type = 'ФЕР';
    } else if (fileName.includes('ТЕР')) {
      type = 'ТЕР';
    }
    
    return {
      name: `${type} от ${new Date().toLocaleString('ru-RU')}`,
      type,
      version: base?.getAttribute('Version') || '',
      priceLevel: base?.getAttribute('PriceLevel') || '01.01.2022',
      fileName
    };
  }

  /**
   * Извлекает иерархическую структуру из XML
   * @param {XMLDocument} xmlDoc 
   * @param {string} baseType - Тип норматива (ГЭСН, ГЭСНр, ГЭСНмр, ГЭСНп, ГЭСНм)
   * @returns {Object}
   */
/**
 * Извлекает иерархическую структуру из XML
 */
/**
 * Извлекает иерархическую структуру из XML
 */
_extractHierarchy(xmlDoc, baseType) {
  console.log('🔧 _extractHierarchy: начало', { baseType });
  
  const result = {
    resourceCategories: [],
    sections: [],
    tables: [],
    works: []
  };
  
  // 1. Извлекаем категории ресурсов
  const categories = xmlDoc.querySelectorAll('ResourceCategory');
  console.log('📁 ResourceCategory найдено:', categories.length);
  
  categories.forEach((cat, catIdx) => {
    const categoryData = {
      type: cat.getAttribute('Type') || 'ОСНОВНЫЕ РАБОТЫ',
      codePrefix: cat.getAttribute('CodePrefix') || ''
    };
    
    result.resourceCategories.push(categoryData);
    console.log(`  📂 Категория [${catIdx}]:`, categoryData);
    
    // 2. Извлекаем Sections внутри категории
    const categorySections = cat.querySelectorAll('Section');
    console.log(`    📋 Section внутри категории: ${categorySections.length}`);
    
    categorySections.forEach((section, sectionIdx) => {
      const sectionCode = section.getAttribute('Code') || '';
      const sectionName = section.getAttribute('Name') || '';
      const sectionType = section.getAttribute('Type') || '';
      
      console.log(`      🔹 Section [${sectionIdx}]:`, {
        code: sectionCode,
        name: sectionName?.substring(0, 50),
        type: sectionType,
        typeLength: sectionType?.length,
        typeCode: sectionType?.split('').map(c => c.charCodeAt(0))
      });
      
      const sectionItem = {
        code: sectionCode,
        name: sectionName,
        type: sectionType,
        sections: [],
        tables: [],
        works: []
      };
      
      // 3. Извлекаем вложенные Sections
      const nestedSections = section.querySelectorAll('Section');
      console.log(`        📁 Вложенные Section: ${nestedSections.length}`);
      
      nestedSections.forEach((nested, nestedIdx) => {
        const nestedCode = nested.getAttribute('Code') || '';
        const nestedName = nested.getAttribute('Name') || '';
        const nestedType = nested.getAttribute('Type') || '';
        
        console.log(`          🔸 Nested Section [${nestedIdx}]:`, {
          code: nestedCode,
          name: nestedName?.substring(0, 50),
          type: nestedType,
          typeLength: nestedType?.length,
          typeCode: nestedType?.split('').map(c => c.charCodeAt(0)),
          isTable: nestedType === 'Таблица',
          isTableTrimmed: nestedType?.trim() === 'Таблица'
        });
        
        const nestedItem = {
          code: nestedCode,
          name: nestedName,
          type: nestedType,
          tables: [],
          works: []
        };
        
        // 4. Извлекаем Works из NameGroup
        const nameGroups = nested.querySelectorAll('NameGroup');
        console.log(`            📝 NameGroup: ${nameGroups.length}`);
        
        let worksInThisSection = 0;
        
        nameGroups.forEach((ng, ngIdx) => {
          const beginName = ng.getAttribute('BeginName') || '';
          const workElements = ng.querySelectorAll('Work');
          
          console.log(`              📝 NameGroup [${ngIdx}]: Work=${workElements.length}`);
          
          workElements.forEach((workEl) => {
            const workItem = this._parseWork(workEl, beginName, nestedCode, nestedName);
            if (workItem) {
              nestedItem.works.push(workItem);
              result.works.push(workItem);
              worksInThisSection++;
              
              console.log(`                ✅ Работа: ${workItem.code}, nestedType="${nestedType}"`);
              
              // 👇 ГЛАВНОЕ: Проверяем тип Section
              const trimmedType = nestedType?.trim();
              console.log(`                📊 Проверка: nestedType="${nestedType}", trimmed="${trimmedType}", equals="Таблица": ${trimmedType === 'Таблица'}`);
              
              if (trimmedType === 'Таблица') {
                result.tables.push({
                  code: nestedCode,
                  name: nestedName,
                  type: 'Таблица',
                  works: [workItem]
                });
                console.log(`                  📊 ДОБАВЛЕНО В TABLES! Всего таблиц: ${result.tables.length}`);
              } else {
                console.log(`                  ❌ НЕ добавлено в TABLES (type="${nestedType}")`);
              }
            }
          });
        });
        
        console.log(`          ✅ Вложенная секция: ${worksInThisSection} работ, tables=${result.tables.length}`);
        
        if (nestedItem.works.length > 0) {
          sectionItem.sections.push(nestedItem);
        }
      });
      
      // 5. Если нет вложенных Sections, извлекаем Works напрямую
      if (nestedSections.length === 0) {
        const nameGroups = section.querySelectorAll('NameGroup');
        console.log(`        📝 NameGroup (прямые): ${nameGroups.length}`);
        
        let worksInThisSection = 0;
        
        nameGroups.forEach((ng, ngIdx) => {
          const beginName = ng.getAttribute('BeginName') || '';
          const workElements = ng.querySelectorAll('Work');
          
          console.log(`          📝 NameGroup [${ngIdx}]: Work=${workElements.length}`);
          
          workElements.forEach((workEl) => {
            const workItem = this._parseWork(workEl, beginName, sectionCode, sectionName);
            if (workItem) {
              sectionItem.works.push(workItem);
              result.works.push(workItem);
              worksInThisSection++;
              
              console.log(`            ✅ Работа: ${workItem.code}, sectionType="${sectionType}"`);
              
              // 👇 Проверяем тип Section
              const trimmedType = sectionType?.trim();
              console.log(`              📊 Проверка: sectionType="${sectionType}", trimmed="${trimmedType}", equals="Таблица": ${trimmedType === 'Таблица'}`);
              
              if (trimmedType === 'Таблица') {
                result.tables.push({
                  code: sectionCode,
                  name: sectionName,
                  type: 'Таблица',
                  works: [workItem]
                });
                console.log(`                📊 ДОБАВЛЕНО В TABLES! Всего таблиц: ${result.tables.length}`);
              } else {
                console.log(`                ❌ НЕ добавлено в TABLES (type="${sectionType}")`);
              }
            }
          });
        });
        
        console.log(`        ✅ Секция: ${worksInThisSection} работ, tables=${result.tables.length}`);
      }
      
      if (sectionItem.works.length > 0 || sectionItem.sections.length > 0) {
        result.sections.push(sectionItem);
      }
    });
  });
  
  console.log('✅ _extractHierarchy: итог', {
    tables: result.tables.length,
    works: result.works.length,
    sections: result.sections.length,
    categories: result.resourceCategories.length
  });
  
  // 👇 ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА
  if (result.works.length > 0 && result.tables.length === 0) {
    console.error('❌ ОШИБКА: Работы есть, но таблиц нет!');
    console.error('  - Проверьте что Section type="Таблица" правильно извлекается');
    console.error('  - Проверьте что условие if (nestedType === "Таблица") выполняется');
    console.error('  - Возможная причина: пробелы или encoding в атрибуте Type');
  }
  
  return result;
}

  /**
   * Парсит таблицу из XML элемента
   * @param {Element} tableEl 
   * @param {number} idx 
   * @param {string} baseType 
   * @returns {Object|null}
   */
  _parseTable(tableEl) {
    const code = tableEl.getAttribute('Code') || '';
    const name = tableEl.getAttribute('Name') || '';
    
    if (!code && !name) return null;
    
    console.log(`    📊 Таблица "${name}": Code=${code}`);
    
    // Извлекаем работы из таблицы
    const works = [];
    const workElements = tableEl.querySelectorAll('Work');
    
    workElements.forEach((workEl) => {
      const workItem = this._parseWork(workEl, '', code, name);
      if (workItem) {
        works.push(workItem);
      }
    });
    
    console.log(`      ✅ Работ в таблице: ${works.length}`);
    
    return {
      code,
      name,
      works,
      originalName: name
    };
  }

  /**
   * Парсит работу из XML элемента
   * @param {Element} workEl 
   * @param {string} beginName 
   * @param {string} tableCode 
   * @param {string} tableName 
   * @returns {Object|null}
   */
  _parseWork(workEl, beginName, tableCode, tableName) {
    const code = workEl.getAttribute('Code');
    const endName = workEl.getAttribute('EndName');
    const measureUnit = workEl.getAttribute('MeasureUnit');
    
    if (!code || !endName) return null;
    
    // Формируем полное название работы
    const fullName = beginName 
      ? `${beginName.trim()} ${endName.trim()}`.replace(/\s+/g, ' ').trim()
      : endName.trim();
    
    // 👇 ИЗВЛЕЧЕНИЕ РЕСУРСОВ
    const resources = [];
    const resourcesEl = workEl.querySelector('Resources');
    
    if (resourcesEl) {
      resourcesEl.querySelectorAll('Resource').forEach(res => {
        const quantity = parseFloat(res.getAttribute('Quantity')) || 0;
        const price = parseFloat(res.getAttribute('Price')) || 0;
        
        if (!res.getAttribute('Code') && !res.getAttribute('EndName')) return;
        
        resources.push({
          code: res.getAttribute('Code') || '',
          name: res.getAttribute('EndName') || res.getAttribute('Name') || '',
          endName: res.getAttribute('EndName') || '',
          unit: res.getAttribute('MeasureUnit') || res.getAttribute('Unit') || '',
          quantity,
          price,
          total: quantity * price
        });
      });
    }
    
    // 👇 ИЗВЛЕЧЕНИЕ <Content> — СОСТАВ РАБОТ
    const content = [];
    const contentEl = workEl.querySelector('Content');
    
    if (contentEl) {
      const items = contentEl.querySelectorAll('Item');
      console.log(`      📝 Content: ${items.length} элементов`);
      
      items.forEach(item => {
        const text = item.getAttribute('Text') || '';
        if (text) {
          content.push({ text });
        }
      });
    }
    
    // Извлекаем НР и СП
    const nrSp = workEl.querySelector('NrSp');
    const nr = nrSp?.querySelector('ReasonItem')?.getAttribute('Nr') || '';
    const sp = nrSp?.querySelector('ReasonItem')?.getAttribute('Sp') || '';
    
    return {
      code,
      name: fullName,
      originalName: endName,
      beginName: beginName || '',
      tableCode,
      tableName,
      measureUnit: measureUnit || '',
      resources,
      content,  // 👇 СОСТАВ РАБОТ
      nr,
      sp,
      // Вычисляемые поля
      laborCost: this._calculateLaborCost(resources),
      materialCost: this._calculateMaterialCost(resources),
      machineCost: this._calculateMachineCost(resources)
    };
  }

  /**
   * Вычисляет затраты на оплату труда
   * @param {Array} resources 
   * @returns {number}
   */
  _calculateLaborCost(resources) {
    return resources
      .filter(r => r.code?.startsWith('1-') || r.name?.includes('разряд'))
      .reduce((sum, r) => sum + (r.total || 0), 0);
  }

  /**
   * Вычисляет затраты на материалы
   * @param {Array} resources 
   * @returns {number}
   */
  _calculateMaterialCost(resources) {
    return resources
      .filter(r => r.code?.startsWith('01.') || r.code?.startsWith('2-') || r.code?.startsWith('3-'))
      .reduce((sum, r) => sum + (r.total || 0), 0);
  }

  /**
   * Вычисляет затраты на машины
   * @param {Array} resources 
   * @returns {number}
   */
  _calculateMachineCost(resources) {
    return resources
      .filter(r => r.code?.startsWith('91.') || r.code?.startsWith('4-'))
      .reduce((sum, r) => sum + (r.total || 0), 0);
  }

  /**
   * Парсит несколько файлов
   * @param {FileList|Array<File>} files 
   * @returns {Promise<Array<Object>>}
   */
  async parseFiles(files) {
    const fileArray = Array.from(files);
    console.log(`📚 parseFiles: ${fileArray.length} файлов`);
    
    const results = [];
    const errors = [];
    
    for (const file of fileArray) {
      try {
        const result = await this.parseFile(file);
        if (result.success) {
          results.push(result);
          console.log(`✅ Загружен: ${file.name} (${result.data?.hierarchy?.works?.length || 0} работ)`);
        } else {
          errors.push({ file: file.name, error: result.error });
          console.error(`❌ Ошибка загрузки ${file.name}:`, result.error);
        }
      } catch (error) {
        errors.push({ file: file.name, error: error.message });
        console.error(`❌ Ошибка загрузки ${file.name}:`, error.message);
      }
    }
    
    const totalWorks = results.reduce((sum, r) => sum + (r.data?.hierarchy?.works?.length || 0), 0);
    
    console.log('✅ parseFiles завершён:', {
      success: results.length,
      errors: errors.length,
      totalWorks
    });
    
    return {
      results: results.map(r => r.data),
      errors,
      successCount: results.length,
      errorCount: errors.length,
      totalWorks
    };
  }
}

// 👇 СОЗДАНИЕ ЭКЗЕМПЛЯРА
const normsParser = new NormsParser();

// 👇 ЭКСПОРТЫ
export { normsParser };
export default normsParser;

// 👇 АЛИАСЫ ДЛЯ СОВМЕСТИМОСТИ
export async function parseNormFile(file) {
  return normsParser.parseFile(file);
}

export async function parseNormFiles(files) {
  return normsParser.parseFiles(files);
}

export const parseMultipleNormsFiles = parseNormFiles;

console.log('✅ normsParser.js: Экспорты готовы');
console.log('  - normsParser:', typeof normsParser);
console.log('  - parseNormFile:', typeof parseNormFile);
console.log('  - parseNormFiles:', typeof parseNormFiles);
console.log('  - parseMultipleNormsFiles:', typeof parseMultipleNormsFiles);