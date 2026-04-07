// src/components/NormTable.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Box, Typography, Paper, Button, Divider, Breadcrumbs, Link,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const NormTable = ({ section, norm, breadcrumb, setActiveTab }) => {
  const [expandedRows, setExpandedRows] = useState({});
  const [expandedContent, setExpandedContent] = useState({});
  const tableRef = useRef(null);

  const decreeName = norm?.meta?.name || 'ГЭСНр';
  const priceLevel = norm?.meta?.priceLevel || '01.01.2022';

  // 👇 selectedWorkCode из props для подсветки
  const selectedWorkCode = section?.selectedWorkCode || null;

  const handleBackToBase = () => {
    if (setActiveTab) setActiveTab('base');
  };

  const toggleRow = (code) => {
    setExpandedRows(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const toggleContent = (code) => {
    setExpandedContent(prev => ({ ...prev, [code]: !prev[code] }));
  };

  // 👇 Подсветка выбранной работы
  useEffect(() => {
    if (selectedWorkCode && tableRef.current) {
      const element = document.getElementById(`work-${selectedWorkCode}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.style.backgroundColor = 'rgba(25, 118, 210, 0.2)';
        setTimeout(() => {
          element.style.backgroundColor = '';
        }, 2000);
      }
    }
  }, [selectedWorkCode]);

  // 👇 Все работы из всех таблиц раздела (с правильной мемоизацией)
  const allWorks = useMemo(() => {
    // 👇 Проверяем section.works (прямой массив работ)
    if (section?.works && Array.isArray(section.works)) {
      return section.works.map(work => ({
        ...work,
        tableCode: work.tableCode || section?.code,
        tableName: work.tableName || section?.name
      }));
    }
    
    // 👇 Или section.tables (вложенная структура)
    const tables = section?.tables;
    if (tables && Array.isArray(tables)) {
      const works = [];
      tables.forEach(table => {
        if (table.works && Array.isArray(table.works)) {
          table.works.forEach(work => {
            works.push({
              ...work,
              tableCode: table.code,
              tableName: table.name
            });
          });
        }
      });
      return works;
    }
    
    return [];
  }, [section]);  // 👇 ЕДИНСТВЕННАЯ зависимость: весь объект section

  // 👇 Ширина колонок (14 колонок)
  const colWidths = [
    120,  // 1. Номер расценки
    350,  // 2. Наименование работ
    80,   // 3. Ед. измерения
    80,   // 4. Расход ресурсов
    80,   // 5. Затраты труда
    60,   // 6. Стоимость на ед.
    60,   // 7. Стоимость Всего
    60,   // 8. З.п. мех. на ед.
    60,   // 9. З.п. мех. Всего
    50,   // 10. Ср. разр.
    60,   // 11. ТЗМ
    60,   // 12. Группа ресурсов код
    130,  // 13. Группа ресурсов наименование
    80    // 14. Код тех. группы
  ];

  const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);

  const cellSx = {
    border: '1px solid',
    borderColor: 'divider',
    py: 0.5,
    px: 1,
    fontSize: '0.7rem',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    verticalAlign: 'top'
  };

  if (!section) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>Данные не найдены</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, gap: 2, overflow: 'hidden', width: '100%' }}>
      {/* Заголовок */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button onClick={handleBackToBase} startIcon={<ArrowBackIcon />} variant="outlined" size="small">
            К дереву нормативов
          </Button>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>{section?.name || 'Таблица норматива'}</Typography>
            {breadcrumb && breadcrumb.length > 0 && (
              <Breadcrumbs separator="›" sx={{ mt: 1 }}>
                {breadcrumb.map((item, idx) => (
                  <Link key={idx} color="text.secondary" sx={{ fontSize: '0.875rem' }}>{item}</Link>
                ))}
              </Breadcrumbs>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, fontSize: '0.875rem', color: 'text.secondary', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FolderIcon fontSize="small" /><span>Работ: {allWorks.length}</span>
          </Box>
          <span>•</span>
          <span>Норматив: {decreeName}</span>
          <span>•</span>
          <span>Уровень цен: {priceLevel}</span>
        </Box>
      </Paper>

      {/* Таблица */}
      <Paper sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <TableContainer sx={{ maxHeight: '100%', width: '100%' }} ref={tableRef}>
          <Table stickyHeader size="small" sx={{ 
            tableLayout: 'fixed',
            width: `${totalWidth}px`,
            '& .MuiTableCell-root': { ...cellSx },
            '& .MuiTableHead-root .MuiTableCell-root': {
              fontWeight: 600, bgcolor: '#e3f2fd', color: 'text.primary',
              fontSize: '0.65rem', lineHeight: 1.1, textAlign: 'center', py: 1
            }
          }}>
            <colgroup>
              {colWidths.map((width, idx) => (<col key={idx} style={{ width: `${width}px` }} />))}
            </colgroup>

            <TableHead>
              <TableRow>
                <TableCell rowSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    Номер расценки<br/>Обоснование
                  </Typography>
                </TableCell>
                <TableCell sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    {decreeName}
                  </Typography>
                </TableCell>
                <TableCell rowSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    Единица<br/>измерения
                  </Typography>
                </TableCell>
                <TableCell rowSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    Расход<br/>ресурсов
                  </Typography>
                </TableCell>
                <TableCell rowSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    Затраты труда<br/>рабочих
                  </Typography>
                </TableCell>
                <TableCell colSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    Стоимость в БЦ,<br/>руб.
                  </Typography>
                </TableCell>
                <TableCell colSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    З.п. мех. в БЦ,<br/>руб./маш.-ч
                  </Typography>
                </TableCell>
                <TableCell colSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    Машинисты
                  </Typography>
                </TableCell>
                <TableCell colSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    Группа однородных<br/>ресурсов
                  </Typography>
                </TableCell>
                <TableCell rowSpan={2} sx={{ ...cellSx, bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    Код тех.<br/>группы
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>
                  <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.65rem' }}>
                    Наименование и характеристика<br/>строительных работ и конструкций
                  </Typography>
                </TableCell>
                <TableCell sx={{ ...cellSx }}>на ед.</TableCell>
                <TableCell sx={{ ...cellSx }}>Всего</TableCell>
                <TableCell sx={{ ...cellSx }}>на ед.</TableCell>
                <TableCell sx={{ ...cellSx }}>Всего</TableCell>
                <TableCell sx={{ ...cellSx }}>Ср. разр.</TableCell>
                <TableCell sx={{ ...cellSx }}>ТЗМ,<br/>чел.-ч</TableCell>
                <TableCell sx={{ ...cellSx }}>код</TableCell>
                <TableCell sx={{ ...cellSx }}>наименование</TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {allWorks.length > 0 ? allWorks.map((work, idx) => {
                const isExpanded = expandedRows[work.code];
                const isContentExpanded = expandedContent[work.code];
                const hasResources = work.resources && work.resources.length > 0;
                const hasContent = work.content && work.content.length > 0;
                
                const laborResource = work.resources?.find(r => r.code?.startsWith('1-'));
                const laborQuantity = laborResource?.quantity || 0;
                
                const machineResources = work.resources?.filter(r => 
                  r.code?.startsWith('91.') || r.code?.startsWith('4-')
                ) || [];
                const machineHours = machineResources.reduce((sum, r) => sum + (r.quantity || 0), 0);
                
                const isSelected = selectedWorkCode === work.code;
                
                // 👇 УНИКАЛЬНЫЙ КЛЮЧ: код работы + код таблицы
                const uniqueKey = `${work.code}_${work.tableCode || idx}`;
                
                return (
                  <React.Fragment key={uniqueKey}>
                    {/* Основная строка работы */}
                    <TableRow 
                      id={`work-${work.code}`}
                      hover 
                      sx={{ 
                        bgcolor: isSelected ? 'action.selected' : (isExpanded || isContentExpanded ? 'action.selected' : 'inherit'),
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                          {hasResources && (
                            <Button 
                              size="small" 
                              color="primary" 
                              onClick={(e) => { e.stopPropagation(); toggleRow(work.code); }} 
                              sx={{ minWidth: 24, p: 0 }}
                            >
                              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </Button>
                          )}
                          {hasContent && (
                            <Button 
                              size="small" 
                              color="secondary" 
                              onClick={(e) => { e.stopPropagation(); toggleContent(work.code); }} 
                              sx={{ minWidth: 24, p: 0 }}
                            >
                              {isContentExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </Button>
                          )}
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.65rem' }}>{work.code}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>
                        <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.3, fontSize: '0.7rem' }}>
                          {work.name || work.originalName || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}>
                        <Typography sx={{ fontSize: '0.65rem' }}>{work.measureUnit || '-'}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>
                        <Typography sx={{ fontSize: '0.65rem' }}>{laborQuantity > 0 ? laborQuantity.toFixed(2) : '-'}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                      <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                      <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                      <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                      <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                      <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>
                        <Typography sx={{ fontSize: '0.65rem' }}>{machineHours > 0 ? machineHours.toFixed(2) : '-'}</Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                      <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                      <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}>
                        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography>
                      </TableCell>
                      {/* 👇 14-я колонка: Код тех. группы (с границей) */}
                      <TableCell align="center" sx={{ ...cellSx }}>
                        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography>
                      </TableCell>
                    </TableRow>
                    
                    {/* Ресурсы */}
                    {hasResources && isExpanded && work.resources.map((res, resIdx) => (
                      <TableRow 
                        key={`${work.code}-res-${resIdx}`} 
                        hover 
                        sx={{ 
                          bgcolor: 'rgba(25, 118, 210, 0.05)',
                          '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.1)' }
                        }}
                      >
                        <TableCell sx={{ ...cellSx, borderRight: '2px solid', pl: 3 }}>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.6rem' }}>{res.code || '-'}</Typography>
                        </TableCell>
                        <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>
                          <Typography sx={{ fontSize: '0.65rem' }}>{res.name || res.endName || '-'}</Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}>
                          <Typography sx={{ fontSize: '0.65rem' }}>{res.unit || '-'}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>
                          <Typography sx={{ fontSize: '0.65rem' }}>{res.quantity?.toFixed(3) || '0'}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>
                          <Typography sx={{ fontSize: '0.65rem' }}>{res.price ? `${res.price.toFixed(2)}` : '-'}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>
                          <Typography sx={{ fontSize: '0.65rem' }}>{res.total ? `${res.total.toFixed(2)}` : '-'}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                        <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                        <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                        <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                        <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                        <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                        <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}>-</TableCell>
                        <TableCell align="center" sx={{ ...cellSx }}>
                          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Состав работ */}
                    {hasContent && isContentExpanded && work.content.map((item, cIdx) => (
                      <TableRow 
                        key={`${work.code}-content-${cIdx}`} 
                        sx={{ bgcolor: 'rgba(156, 39, 176, 0.05)' }}
                      >
                        <TableCell colSpan={13} sx={{ ...cellSx, pl: 3, borderRight: '2px solid' }}>
                          <Typography sx={{ fontSize: '0.65rem' }}>
                            {cIdx + 1}. {item.text || item.Text || item}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ ...cellSx }}>
                          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={14} sx={{ py: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      Нет работ для отображения
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default NormTable;