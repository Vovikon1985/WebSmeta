// src/services/smetaParser.js
import JSZip from 'jszip';

export const parseSmetaFile = async (file) => {
  console.log('🔍 Начинаем парсинг файла:', file.name);
  
  try {
    let xmlContent = '';

    if (file.name.toLowerCase().endsWith('.gsfx')) {
      console.log('📦 Распаковываем .gsfx архив...');
      xmlContent = await extractXmlFromGsfx(file);
    } else if (file.name.toLowerCase().endsWith('.xml')) {
      console.log('📄 Читаем XML файл...');
      const arrayBuffer = await file.arrayBuffer();
      const decoder = new TextDecoder('windows-1251');
      xmlContent = decoder.decode(arrayBuffer);
    } else {
      throw new Error('Неподдерживаемый формат. Используйте .xml или .gsfx');
    }

    console.log('📄 Длина XML:', xmlContent.length, 'символов');
    
    console.log('🔧 Парсим XML содержимое...');
    const smetaData = parseXmlContent(xmlContent);

    const positions = smetaData?.positions || [];
    console.log('✅ Парсинг завершён. Найдено позиций:', positions.length);
    
    if (positions.length > 0) {
      console.log('📊 Пример первой позиции:', positions[0]);
    }
    
    return {
      success: true,
      data: smetaData,
      fileName: file.name
    };

  } catch (error) {
    console.error('❌ Ошибка парсинга:', error);
    return {
      success: false,
      error: error.message || 'Неизвестная ошибка'
    };
  }
};

// Распаковка .gsfx
const extractXmlFromGsfx = async (file) => {
  const zip = await JSZip.loadAsync(file);
  console.log('📦 Файлы в архиве:', Object.keys(zip.files));
  
  const xmlFile = Object.values(zip.files).find(f => 
    f.name.toLowerCase().endsWith('.xml') && !f.name.startsWith('__MACOSX')
  );
  
  if (!xmlFile) {
    throw new Error('В архиве .gsfx не найден XML-файл');
  }
  
  console.log('📄 Найден XML файл:', xmlFile.name);
  
  const uint8array = await xmlFile.async('uint8array');
  const decoder = new TextDecoder('windows-1251');
  const content = decoder.decode(uint8array);
  
  console.log('📄 Размер распакованного XML:', content.length, 'символов');
  return content;
};

// Парсинг XML
const parseXmlContent = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    console.error('❌ Parser error:', parserError);
    throw new Error('XML повреждён или имеет неверную структуру');
  }

  const docElement = xmlDoc.querySelector('Document');
  if (!docElement) {
    throw new Error('Не найден корневой элемент Document');
  }

  // Извлекаем метаданные из Properties (АТРИБУТЫ!)
  const properties = docElement.querySelector('Properties');
  const meta = {
    locNum: properties?.getAttribute('LocNum') || '',
    regNum: properties?.getAttribute('RegNum') || '',
    name: properties?.getAttribute('Description') || 'Без названия',
    construction: properties?.getAttribute('Constr') || '',
    stage: properties?.getAttribute('Stage') || '',
    object: properties?.getAttribute('Object') || '',
    comment: properties?.getAttribute('Comment') || '',
    approvalDoc: properties?.getAttribute('ApprovalDoc') || ''
  };

  console.log('📋 Метаданные:', meta);

  // Извлекаем позиции из разделов
  const positions = [];
  const chapters = docElement.querySelectorAll('Chapters > Chapter');
  console.log('📁 Найдено разделов:', chapters.length);
  
  chapters.forEach((chapter, chapterIndex) => {
    const chapterCaption = chapter.getAttribute('Caption') || `Раздел ${chapterIndex + 1}`;
    const chapterSysID = chapter.getAttribute('SysID') || '';
    const positionNodes = chapter.querySelectorAll('Position');
    
    console.log(`📁 Раздел ${chapterIndex + 1} (${chapterCaption}): ${positionNodes.length} позиций`);
    
    positionNodes.forEach((pos, index) => {
      const position = parsePosition(pos, chapterCaption, chapterSysID, index);
      if (position) {
        positions.push(position);
      }
    });
  });

  // Если позиции не найдены в Chapters, ищем напрямую
  if (positions.length === 0) {
    console.log('⚠️ Позиции не найдены в Chapters, ищем напрямую...');
    const directPositions = docElement.querySelectorAll('Document > Position');
    directPositions.forEach((pos, index) => {
      const position = parsePosition(pos, 'Основной раздел', '', index);
      if (position) {
        positions.push(position);
      }
    });
  }

  // Параметры расчета
  const parameters = docElement.querySelector('Parameters');
  const params = {
    method: parameters?.getAttribute('Mode2020Order') || '2020',
    basePrices: parameters?.getAttribute('BasePrices') || '2001',
    rounding: 2,
    options: parameters?.getAttribute('Options') || ''
  };

  return {
    meta: meta || {},
    positions: positions || [],
    parameters: params || {}
  };
};

// Парсинг позиции
const parsePosition = (posElement, chapterName, chapterSysID, index) => {
  try {
    // АТРИБУТЫ позиции согласно схеме
    const sysID = posElement.getAttribute('SysID') || `pos_${index}`;
    const number = posElement.getAttribute('Number') || '';
    const code = posElement.getAttribute('Code') || '';
    const caption = posElement.getAttribute('Caption') || 'Без названия';
    const units = posElement.getAttribute('Units') || '';
    const priceLevel = posElement.getAttribute('PriceLevel') || 'Curr';
    const indexCode = posElement.getAttribute('IndexCode') || '';
    const cargo = posElement.getAttribute('Cargo') || '';
    const mass = posElement.getAttribute('Mass') || '';
    const workVolPosNums = posElement.getAttribute('WorkVolPosNums') || '';
    const options = posElement.getAttribute('Options') || '';
    const slaveRow = posElement.getAttribute('SlaveRow') || '';
    const identifier = posElement.getAttribute('Identifier') || '';
    const comment = posElement.getAttribute('Comment') || '';
    const colorIndex = posElement.getAttribute('ColorIndex') || '';
    const vr2001 = posElement.getAttribute('Vr2001') || '';
    
    // Quantity - ИЗМЕНЕНО: берём из атрибута Result элемента Quantity
    let quantity = 0;
    const quantityEl = posElement.querySelector('Quantity');
    if (quantityEl) {
      quantity = parseFloat(quantityEl.getAttribute('Result') || '0') || 0;
    } else {
      quantity = parseFloat(posElement.getAttribute('Quantity') || '0') || 0;
    }
    
    // PriceBase - элемент с атрибутами PZ, OZ, EM, ZM, MT
    let priceBase = 0;
    let priceBaseOZ = 0;
    let priceBaseEM = 0;
    let priceBaseZM = 0;
    let priceBaseMT = 0;
    const priceBaseEl = posElement.querySelector('PriceBase');
    if (priceBaseEl) {
      priceBase = parseFloat(priceBaseEl.getAttribute('PZ') || '0') || 0;
      priceBaseOZ = parseFloat(priceBaseEl.getAttribute('OZ') || '0') || 0;
      priceBaseEM = parseFloat(priceBaseEl.getAttribute('EM') || '0') || 0;
      priceBaseZM = parseFloat(priceBaseEl.getAttribute('ZM') || '0') || 0;
      priceBaseMT = parseFloat(priceBaseEl.getAttribute('MT') || '0') || 0;
    }
    
    // PriceCurr - ИЗМЕНЕНО: берём из атрибута MT (не PZ!)
    let priceCurr = 0;
    let priceCurrOZ = 0;
    let priceCurrEM = 0;
    let priceCurrZM = 0;
    let priceCurrMT = 0;
    const priceCurrEl = posElement.querySelector('PriceCurr');
    if (priceCurrEl) {
      // Для РИМ цена в атрибуте MT
      priceCurrMT = parseFloat(priceCurrEl.getAttribute('MT') || '0') || 0;
      priceCurr = priceCurrMT; // Основная цена
      
      // Также пробуем другие атрибуты
      priceCurrOZ = parseFloat(priceCurrEl.getAttribute('OZ') || '0') || 0;
      priceCurrEM = parseFloat(priceCurrEl.getAttribute('EM') || '0') || 0;
      priceCurrZM = parseFloat(priceCurrEl.getAttribute('ZM') || '0') || 0;
    }
    
    // Если цена не найдена в PriceCurr, пробуем MarketAnalysisDocLink
    if (priceCurr === 0) {
      const marketLink = posElement.querySelector('MarketAnalysisDocLink');
      if (marketLink) {
        priceCurr = parseFloat(marketLink.getAttribute('Total') || '0') || 0;
      }
    }
    
    // Вычисляем общую стоимость
    const total = quantity * priceCurr;
    
    // Проверяем признак РИМ
    const isRim = options.includes('2020Mode') || priceLevel === 'Curr';
    
    // ИЗМЕНЕНО: Парсим ресурсы для получения индекса
    const resourcesEl = posElement.querySelector('Resources');
    const resources = resourcesEl ? parseResources(resourcesEl) : [];
    
    // Получаем индекс из первого материала с индексом
    let resourceIndexCode = indexCode;
    if (!resourceIndexCode && resources.length > 0) {
      const matWithIndex = resources.find(r => r.type === 'material' && r.indexCode);
      if (matWithIndex) {
        resourceIndexCode = matWithIndex.indexCode;
      }
    }
    
    // Коэффициенты к позиции
    const koefficients = [];
    const koeffEl = posElement.querySelector('Koefficients');
    if (koeffEl) {
      const kItems = koeffEl.querySelectorAll('K');
      kItems.forEach(k => {
        koefficients.push({
          caption: k.getAttribute('Caption') || '',
          valuePZ: k.getAttribute('Value_PZ') || '1',
          valueOZ: k.getAttribute('Value_OZ') || '1',
          valueEM: k.getAttribute('Value_EM') || '1',
          valueZM: k.getAttribute('Value_ZM') || '1',
          valueMT: k.getAttribute('Value_MT') || '1',
          code: k.getAttribute('Code') || '',
          level: k.getAttribute('Level') || ''
        });
      });
    }
    
    return {
      id: sysID,
      number,
      code,
      name: caption,
      unit: units,
      quantity,
      priceBase,
      priceBaseDetail: {
        oz: priceBaseOZ,
        em: priceBaseEM,
        zm: priceBaseZM,
        mt: priceBaseMT
      },
      priceCurr,
      priceCurrDetail: {
        oz: priceCurrOZ,
        em: priceCurrEM,
        zm: priceCurrZM,
        mt: priceCurrMT
      },
      total,
      priceLevel,
      isRim,
      chapter: chapterName,
      chapterSysID,
      indexCode: resourceIndexCode, // Используем индекс из ресурсов если есть
      cargo,
      mass,
      workVolPosNums,
      options,
      slaveRow,
      identifier,
      comment,
      colorIndex,
      vr2001,
      koefficients,
      resources
    };
  } catch (error) {
    console.error('❌ Ошибка парсинга позиции:', error, posElement);
    return null;
  }
};

// Парсинг ресурсов
const parseResources = (resourcesEl) => {
  if (!resourcesEl) return [];
  
  const resources = [];
  const types = {
    'Tzr': 'labor',        // Затраты труда рабочих
    'Tzm': 'operator',     // Затраты труда машинистов
    'Mch': 'machine',      // Машины и механизмы
    'Mat': 'material'      // Материалы
  };
  
  Object.entries(types).forEach(([tagName, type]) => {
    const items = resourcesEl.querySelectorAll(tagName);
    items.forEach((res, idx) => {
      try {
        // АТРИБУТЫ ресурса
        const code = res.getAttribute('Code') || '';
        const caption = res.getAttribute('Caption') || '';
        const units = res.getAttribute('Units') || '';
        const quantity = parseFloat(res.getAttribute('Quantity') || '0') || 0;
        const attribs = res.getAttribute('Attribs') || '';
        const options = res.getAttribute('Options') || '';
        const identifier = res.getAttribute('Identifier') || '';
        const indexCode = res.getAttribute('IndexCode') || ''; // ИЗМЕНЕНО: добавили индекс
        const cargo = res.getAttribute('Cargo') || '';
        const mass = res.getAttribute('Mass') || '';
        const groupId = res.getAttribute('GroupId') || '';
        const priceLevel = res.getAttribute('PriceLevel') || '';
        const workClass = res.getAttribute('WorkClass') || ''; // Только для Tzr
        
        // PriceBase - элемент с атрибутом Value
        let priceBase = 0;
        let priceBaseZM = 0;
        let priceBaseComment = '';
        const priceBaseEl = res.querySelector('PriceBase');
        if (priceBaseEl) {
          priceBase = parseFloat(priceBaseEl.getAttribute('Value') || '0') || 0;
          priceBaseZM = parseFloat(priceBaseEl.getAttribute('ZM') || '0') || 0;
          priceBaseComment = priceBaseEl.getAttribute('Comment') || '';
        }
        
        // PriceCurr - элемент с атрибутом Value
        let priceCurr = 0;
        let priceCurrZM = 0;
        let priceCurrComment = '';
        const priceCurrEl = res.querySelector('PriceCurr');
        if (priceCurrEl) {
          priceCurr = parseFloat(priceCurrEl.getAttribute('Value') || '0') || 0;
          priceCurrZM = parseFloat(priceCurrEl.getAttribute('ZM') || '0') || 0;
          priceCurrComment = priceCurrEl.getAttribute('Comment') || '';
        }
        
        // Проверяем атрибуты ресурса
        const isRim = options.includes('ForcedResIdx') || 
                      attribs.includes('Added') || 
                      attribs.includes('Replaced');
        
        const isDeleted = attribs.includes('Deleted');
        const isAdded = attribs.includes('Added');
        const isReplaced = attribs.includes('Replaced');
        const isSnipSet = attribs.includes('SnipSet');
        const isNotCount = options.includes('NotCount');
        const isOwnerMat = options.includes('OwnerMat');
        
        resources.push({
          id: `${type}_${idx}`,
          type,
          code,
          name: caption,
          unit: units,
          quantity,
          priceBase,
          priceBaseZM,
          priceBaseComment,
          priceCurr,
          priceCurrZM,
          priceCurrComment,
          isRim,
          attribs,
          options,
          identifier,
          indexCode, // ИЗМЕНЕНО: добавили индекс
          cargo,
          mass,
          groupId,
          priceLevel,
          workClass,
          isDeleted,
          isAdded,
          isReplaced,
          isSnipSet,
          isNotCount,
          isOwnerMat
        });
      } catch (error) {
        console.error(`❌ Ошибка парсинга ресурса ${tagName}[${idx}]:`, error);
      }
    });
  });
  
  console.log(`📦 Найдено ресурсов: ${resources.length}`);
  return resources;
};
/**
 * Связать позицию сметы с нормативом
 * @param {Object} position - позиция сметы
 * @param {Object} norm - норматив из хранилища
 * @returns {Object} - обновленная позиция с ресурсами
 */
export const linkPositionWithNorm = (position, norm) => {
  if (!norm) return position;
  
  return {
    ...position,
    normCode: norm.code,
    normName: norm.name,
    normResources: norm.resources,
    // Если в позиции нет ресурсов, берем из норматива
    resources: position.resources?.length > 0 
      ? position.resources 
      : norm.resources.map((res, idx) => ({
          ...res,
          id: `res_${idx}`
        }))
  };
};

/**
 * Найти и связать все позиции с нормативами
 * @param {Array} positions - позиции сметы
 * @param {Object} normsStore - хранилище нормативов
 * @returns {Array} - позиции со связанными нормативами
 */
export const linkAllPositionsWithNorms = (positions, normsStore) => {
  return positions.map(pos => {
    const norm = normsStore.findWorkByCode(pos.code);
    return linkPositionWithNorm(pos, norm);
  });
};