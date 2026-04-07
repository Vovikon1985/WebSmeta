// src/components/NormsTree.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, CircularProgress, Divider, List, ListItem, ListItemText } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { normsStore } from '../services/normsStore.js';

const NormsTree = ({ onOpenNormTable }) => {
  const [expandedItems, setExpandedItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableBases, setAvailableBases] = useState([]);

  // 👇 Загрузка конкретной базы (обёрнуто в useCallback для стабильной ссылки)
  const loadBase = useCallback(async (baseName) => {
    // Если база уже загружена — выходим
    if (normsStore.getNorm(baseName)) {
      console.log(`✅ ${baseName} уже загружен`);
      return;
    }
    
    setLoading(true);
    try {
      const normData = await normsStore.loadNormFromJson(baseName);
      normsStore.addNorm(normData);
      
      // 👇 Перестраиваем дерево после загрузки
      buildTree();
    } catch (error) {
      console.error(`❌ Ошибка загрузки ${baseName}:`, error);
    } finally {
      setLoading(false);
    }
  }, []); // 👇 Пустой массив — функция не зависит от пропсов/стейта

  // 👇 Получаем список доступных баз при монтировании
  useEffect(() => {
    const fetchAvailableBases = async () => {
      try {
        // 👇 Хардкод для тестирования (позже заменим на versions.json)
        const bases = ['ГЭСНр', 'ГЭСН', 'ГЭСНм', 'ГЭСНмр', 'ГЭСНп'];
        setAvailableBases(bases);
        
        // 👇 Автозагрузка первой базы если хранилище пустое
        if (bases.length > 0 && normsStore.getAllNorms().length === 0) {
          await loadBase(bases[0]);
        }
      } catch (error) {
        console.error('❌ Ошибка получения списка баз:', error);
      }
    };
    
    fetchAvailableBases();
  }, [loadBase]); // 👇 loadBase в зависимостях — warning исчезнет

  // 👇 Построение дерева из meta.json
  const buildTree = () => {
    console.log('🔨 buildTree: Начало');
    
    const allNorms = normsStore.getAllNorms();
    if (allNorms.length === 0) {
      setTreeData([]);
      return;
    }
    
    // 👇 УРОВЕНЬ 1: ПАПКИ БАЗ (ГЭСНр, ГЭСН, ...)
    const baseNodes = allNorms.map(norm => {
      const baseName = norm.meta?.type || norm.fileName?.replace('.xml', '');
      
      return {
        id: `base_${baseName}`,
        name: baseName,
        type: 'base',
        children: [],
        norm: norm
      };
    });
    
    // 👇 УРОВЕНЬ 2-4: Категории → Сборники → Разделы (из meta.tree)
    allNorms.forEach(norm => {
      const baseNode = baseNodes.find(n => n.norm === norm);
      if (!baseNode || !norm.hierarchy?.resourceCategories) return;
      
      norm.hierarchy.resourceCategories.forEach((cat, catIdx) => {
        const catId = `cat_${baseNode.id}_${catIdx}`;
        const categoryNode = {
          id: catId,
          name: cat.name || 'Категория',
          type: 'category',
          children: [],
          norm: norm
        };
        
        // 👇 Сборники внутри категории
        (cat.collections || []).forEach((collection, colIdx) => {
          const colId = `col_${catId}_${colIdx}`;
          const collectionNode = {
            id: colId,
            name: `${collection.name} (${collection.code})`,
            type: 'collection',
            code: collection.code,
            children: [],
            norm: norm,
            divisions: collection.divisions || [] // 👇 Сохраняем разделы для ленивой загрузки
          };
          
          // 👇 Разделы внутри сборника (пока только коды для ленивой загрузки)
          collectionNode.children = (collection.divisions || []).map((div, divIdx) => ({
            id: `div_${colId}_${divIdx}`,
            name: `${div.name} (${div.code})`,
            type: 'division',
            code: div.code,
            tableCodes: div.tables || [], // 👇 Коды таблиц для загрузки по клику
            norm: norm
          }));
          
          categoryNode.children.push(collectionNode);
        });
        
        baseNode.children.push(categoryNode);
      });
    });
    
    console.log('📁 Построено дерево:', {
      bases: baseNodes.length,
      categories: baseNodes.reduce((s, b) => s + b.children.length, 0),
      collections: baseNodes.reduce((s, b) => s + b.children.reduce((ss, c) => ss + c.children.length, 0), 0)
    });
    
    setTreeData(baseNodes);
  };

  const findNodeById = (nodes, id) => {
    if (!nodes || !Array.isArray(nodes)) return null;
    for (const node of nodes) {
      if (node?.id === id) return node;
      if (node?.children?.length) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleSelect = async (event, itemIds) => {
    const itemId = Array.isArray(itemIds) ? itemIds[0] : itemIds;
    if (!itemId) return;
    
    setSelectedItems([String(itemId)]);
    
    const selectedItem = findNodeById(treeData, String(itemId));
    if (!selectedItem) return;
    
    console.log('🎯 Выбран:', selectedItem);
    
    // 👇 КЛИК ПО РАЗДЕЛУ — загружаем таблицы этого раздела
    if (selectedItem.type === 'division') {
      console.log('📁 Раздел выбран:', selectedItem.name);
      
      const { norm, code: divisionCode, tableCodes } = selectedItem;
      const baseName = norm.meta?.type;
      
      if (!tableCodes || tableCodes.length === 0) {
        setSelectedSection({
          type: 'division',
          name: selectedItem.name,
          code: divisionCode,
          items: [],
          norm: norm
        });
        return;
      }
      
      // 👇 Ленивая загрузка данных таблиц
      setLoading(true);
      try {
        const tables = await Promise.all(
          tableCodes.map(async (tableCode) => {
            try {
              const tableData = await normsStore.loadTableData(baseName, tableCode);
              return {
                id: `table_${tableCode}`,
                code: tableData.code,
                name: tableData.name,
                type: 'table',
                works: tableData.works || []
              };
            } catch (e) {
              console.warn(`⚠️ Не загружена таблица ${tableCode}:`, e.message);
              return {
                id: `table_${tableCode}`,
                code: tableCode,
                name: `Ошибка загрузки: ${tableCode}`,
                type: 'table',
                works: []
              };
            }
          })
        );
        
        console.log(`✅ Загружено таблиц: ${tables.length}`);
        
        setSelectedSection({
          type: 'tables',
          name: selectedItem.name,
          code: divisionCode,
          items: tables,
          norm: norm
        });
      } catch (error) {
        console.error('❌ Ошибка загрузки таблиц:', error);
      } finally {
        setLoading(false);
      }
    }
    // 👇 КЛИК ПО СБОРНИКУ — показываем разделы
    else if (selectedItem.type === 'collection') {
      setSelectedSection({
        type: 'collection',
        name: selectedItem.name,
        code: selectedItem.code,
        items: selectedItem.children || [],
        norm: selectedItem.norm
      });
    }
    // 👇 КЛИК ПО КАТЕГОРИИ
    else if (selectedItem.type === 'category') {
      setSelectedSection({
        type: 'category',
        name: selectedItem.name,
        items: selectedItem.children || []
      });
    }
    // 👇 КЛИК ПО БАЗЕ
    else if (selectedItem.type === 'base') {
      setSelectedSection({
        type: 'base',
        name: selectedItem.name,
        items: selectedItem.children || []
      });
    }
  };

  // 👇 ДВОЙНОЙ КЛИК ПО ТАБЛИЦЕ — открываем норматив
  const handleTableDoubleClick = (table) => {
    console.log('📄 Таблица:', table.name);
    
    if (onOpenNormTable && selectedSection?.norm) {
      // 👇 Устанавливаем selectedWorkCode на первую работу для подсветки
      const firstWorkCode = table.works?.[0]?.code || null;
      
      onOpenNormTable({
        code: table.code,
        name: table.name,
        works: table.works || [],
        selectedWorkCode: firstWorkCode
      }, selectedSection.norm, [selectedSection?.name, table.name]);
    }
  };

  const renderTree = (nodes) => {
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return null;
    
    return nodes.map((node, idx) => {
      if (!node) return null;
      const nodeId = node.id || `node_${idx}`;
      
      const getIcon = () => {
        switch (node.type) {
          case 'base': return <FolderOpenIcon color="primary" fontSize="small" />;
          case 'category': return <FolderIcon fontSize="small" />;
          case 'collection': return <FolderIcon fontSize="small" />;
          case 'division': return <DescriptionIcon fontSize="small" color="action" />;
          case 'table': return <DescriptionIcon fontSize="small" color="primary" />;
          default: return <FolderIcon fontSize="small" />;
        }
      };
      
      return (
        <TreeItem
          key={nodeId}
          itemId={nodeId}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
              {getIcon()}
              <Typography variant="body2" sx={{ flex: 1, fontSize: '0.9rem' }}>
                {node.name || 'Без названия'}
              </Typography>
              {node.type === 'table' && node.works?.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {node.works.length}
                </Typography>
              )}
            </Box>
          }
        >
          {node.children?.length > 0 ? renderTree(node.children) : null}
        </TreeItem>
      );
    });
  };

  if (loading && !treeData.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={24} />
        <Typography sx={{ ml: 2 }}>Загрузка нормативов...</Typography>
      </Box>
    );
  }

  if (!treeData || treeData.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
        <FolderOpenIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
        <Typography variant="h6" color="text.secondary">Нет загруженных нормативов</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
          Доступные базы: {availableBases.join(', ') || '—'}<br/>
          Нажмите на базу слева для загрузки
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          {availableBases.map(base => (
            <button
              key={base}
              onClick={() => loadBase(base)}
              style={{
                padding: '6px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: '#f5f5f5',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              Загрузить {base}
            </button>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* 👇 ЛЕВАЯ ПАНЕЛЬ: ДЕРЕВО */}
      <Paper sx={{ width: '320px', minWidth: '320px', borderRight: 1, borderColor: 'divider', overflow: 'auto', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={600}>База нормативов</Typography>
          <Typography variant="caption" color="text.secondary">
            {normsStore.getStats?.()?.worksCount || 0} работ в {normsStore.getStats?.()?.normsCount || 0} базах
          </Typography>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          <SimpleTreeView
            expandedItems={expandedItems}
            onExpandedItemsChange={(e, ids) => setExpandedItems(ids || [])}
            selectedItems={selectedItems}
            onSelectedItemsChange={handleSelect}
            slots={{ collapseIcon: ExpandMoreIcon, expandIcon: ChevronRightIcon }}
          >
            {renderTree(treeData)}
          </SimpleTreeView>
        </Box>
      </Paper>

      {/* 👇 ПРАВАЯ ПАНЕЛЬ: КОНТЕНТ */}
      <Box sx={{ flex: 1, p: 2, overflow: 'auto', minWidth: 0 }}>
        {selectedSection ? (
          <>
            <Typography variant="h6" gutterBottom>{selectedSection.name}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {selectedSection.type === 'tables' 
                ? `Таблиц: ${selectedSection.items?.length || 0}`
                : `Элементов: ${selectedSection.items?.length || 0}`
              }
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List dense>
                {selectedSection.items?.length > 0 ? (
                  selectedSection.items.map((item, idx) => (
                    <ListItem
                      key={item?.id || idx}
                      component="div"  // 👇 ИСПРАВЛЕНО: нет button prop (убирает warning)
                      onClick={() => {
                        if (item.type === 'division') {
                          handleSelect(null, [item.id]);
                        } else {
                          setSelectedItems([item?.id]);
                        }
                      }}
                      onDoubleClick={() => {
                        if (item.type === 'table') {
                          handleTableDoubleClick(item);
                        }
                      }}
                      sx={{
                        '&:hover': { bgcolor: 'action.hover' },
                        borderRadius: 1,
                        cursor: 'pointer',
                        pl: item?.type === 'division' ? 2 : item?.type === 'table' ? 4 : 2
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item?.type === 'table' ? `${item.code || ''}. ` : ''}{item.name || 'Без названия'}
                          </Typography>
                        }
                        secondary={
                          item?.type === 'table' ? (
                            <Typography variant="caption" color="text.secondary">
                              Работ: {item.works?.length || 0}
                            </Typography>
                          ) : item?.type === 'division' ? (
                            <Typography variant="caption" color="text.secondary">
                              Таблиц: {item.tableCodes?.length || 0}
                            </Typography>
                          ) : null
                        }
                      />
                    </ListItem>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    {selectedSection.type === 'tables' 
                      ? 'Нет таблиц в этом разделе' 
                      : 'Нет элементов для отображения'
                    }
                  </Typography>
                )}
              </List>
            )}
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary', textAlign: 'center' }}>
            <Box>
              <DescriptionIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6">Выберите элемент в дереве слева</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                • База → Категория → Сборник → Раздел → Таблица → Работы
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default NormsTree;