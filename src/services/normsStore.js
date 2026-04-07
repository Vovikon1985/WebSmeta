// src/services/normsStore.js
/**
 * Хранилище нормативных баз
 * Загружает оптимизированные JSON вместо парсинга XML
 */

class NormsStore {
  constructor() {
    this.norms = new Map(); // 👇 Map для быстрого доступа по имени базы
    this._nextId = 1;
  }

  /**
   * Загрузка норматива из оптимизированного JSON
   * @param {string} baseName - Имя базы (например, 'ГЭСНр')
   * @returns {Promise<Object>} Данные норматива
   */
  async loadNormFromJson(baseName) {
    console.log(`📥 Загрузка норматива: ${baseName}`);
    
    try {
      // 👇 Загружаем meta.json — структура дерева (2-5 MB)
      const metaResponse = await fetch(`/data/${baseName}/meta.json`);
      if (!metaResponse.ok) {
        throw new Error(`Не удалось загрузить meta.json: ${metaResponse.status}`);
      }
      const meta = await metaResponse.json();
      
      // 👇 Загружаем search.json — поисковый индекс (15-25 MB, можно лениво)
      // Пока загружаем сразу, потом можно сделать ленивую загрузку
      const searchResponse = await fetch(`/data/${baseName}/search.json`);
      const searchIndex = searchResponse.ok ? await searchResponse.json() : { works: [] };
      
      const normData = {
        id: `norm_${this._nextId++}`,
        fileName: `${baseName}.xml`, // Для совместимости
        meta: {
          name: meta.name,
          type: baseName,
          priceLevel: '01.01.2022', // Можно вынести в meta.json
          version: meta.generatedAt
        },
        hierarchy: {
          // 👇 Готовая структура дерева из meta.json
          resourceCategories: meta.tree || [],
          sections: [], // Не используется при загрузке из JSON
          tables: [],   // Не используется при загрузке из JSON
          works: []     // Не используется при загрузке из JSON
        },
        searchIndex: searchIndex.works || [], // 👇 Индекс для поиска
        loadedAt: new Date().toISOString()
      };
      
      console.log(`✅ Загружен: ${baseName} (${meta.tree?.length || 0} категорий)`);
      return normData;
      
    } catch (error) {
      console.error(`❌ Ошибка загрузки ${baseName}:`, error);
      throw error;
    }
  }

  /**
   * Загрузка данных конкретной таблицы (ленивая загрузка)
   * @param {string} baseName - Имя базы
   * @param {string} tableCode - Код таблицы (например, '51-01-001')
   * @returns {Promise<Object>} Данные таблицы с работами
   */
  async loadTableData(baseName, tableCode) {
    try {
      const response = await fetch(`/data/${baseName}/tables/${tableCode}.json`);
      if (!response.ok) {
        throw new Error(`Не удалось загрузить таблицу ${tableCode}: ${response.status}`);
      }
      const tableData = await response.json();
      
      console.log(`📊 Загружена таблица ${tableCode}: ${tableData.works?.length || 0} работ`);
      return tableData;
    } catch (error) {
      console.error(`❌ Ошибка загрузки таблицы ${tableCode}:`, error);
      throw error;
    }
  }

  /**
   * Поиск работ по индексу
   * @param {string} baseName - Имя базы
   * @param {string} query - Поисковый запрос
   * @returns {Array} Найденные работы
   */
  searchWorks(baseName, query) {
    const norm = this.norms.get(baseName);
    if (!norm?.searchIndex) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];
    
    return norm.searchIndex.filter(work => {
      const codeMatch = work.code?.toLowerCase().includes(lowerQuery);
      const nameMatch = work.name?.toLowerCase().includes(lowerQuery);
      const tableMatch = work.tableName?.toLowerCase().includes(lowerQuery);
      return codeMatch || nameMatch || tableMatch;
    });
  }

  /**
   * Добавление норматива в хранилище
   * @param {Object} normData - Данные норматива
   */
  addNorm(normData) {
    const baseName = normData.meta?.type || normData.fileName?.replace('.xml', '');
    if (!baseName) {
      console.error('❌ Не удалось определить имя базы');
      return;
    }
    
    this.norms.set(baseName, normData);
    console.log(`💾 Сохранено в хранилище: ${baseName}`);
  }

  /**
   * Получение всех нормативов
   * @returns {Array} Массив нормативов
   */
  getAllNorms() {
    return Array.from(this.norms.values());
  }

  /**
   * Получение норматива по имени
   * @param {string} baseName - Имя базы
   * @returns {Object|undefined} Норматив или undefined
   */
  getNorm(baseName) {
    return this.norms.get(baseName);
  }

  /**
   * Статистика по хранилищу
   * @returns {Object} Статистика
   */
  getStats() {
    const norms = this.getAllNorms();
    const worksCount = norms.reduce((sum, n) => {
      return sum + (n.searchIndex?.length || 0);
    }, 0);
    
    return {
      normsCount: norms.length,
      worksCount: worksCount,
      byType: norms.reduce((acc, n) => {
        const type = n.meta?.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * Очистка хранилища
   */
  clear() {
    this.norms.clear();
    this._nextId = 1;
    console.log('🗑️ Хранилище очищено');
  }
}

// 👇 Единый экземпляр хранилища
export const normsStore = new NormsStore();