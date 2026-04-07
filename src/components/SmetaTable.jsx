// src/components/SmetaTable.jsx
import React from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableHead, TableRow, TableContainer
} from '@mui/material';

const SmetaTable = ({ smetaData }) => {
  // 👇 16 КОЛОНОК — увеличил ширину для Брутто
  const colWidths = [
    50,   // 1. № п.п.
    120,  // 2. Обоснование
    350,  // 3. Наименование
    80,   // 4. Ед. изм.
    70,   // 5. Количество (На ед.)
    70,   // 6. Количество (Коэффициенты)
    70,   // 7. Количество (Всего)
    70,   // 8. Стоимость баз. (На ед.)
    70,   // 9. Стоимость баз. (Всего)
    60,   // 10. Индекс
    70,   // 11. Стоимость тек. (На ед.)
    70,   // 12. Стоимость тек. (Всего)
    80,   // 13. Код индекса
    100,  // 14. Идентификатор
    100,  // 15. Номера позиций ВОР
    60,   // 16. Класс груза
    70,   // 17. Брутто (На ед. кг) — УВЕЛИЧИЛ
    70    // 18. Брутто (Общая т) — УВЕЛИЧИЛ
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

  if (!smetaData) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>Данные сметы не найдены</Typography>
      </Box>
    );
  }

  const positions = smetaData.positions || [];
  const meta = smetaData.meta || {};

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, gap: 2, overflow: 'hidden', width: '100%' }}>
      {/* Заголовок */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight={600}>{meta.name || 'Смета'}</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 1, fontSize: '0.875rem', color: 'text.secondary', flexWrap: 'wrap' }}>
          <span>Позиций: {positions.length}</span>
          <span>•</span>
          <span>Метод: {positions[0]?.isRim ? 'РИМ' : 'Базисный'}</span>
          <span>•</span>
          <span>Цены: Текущие</span>
        </Box>
      </Paper>

      {/* Таблица */}
      <Paper sx={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <TableContainer sx={{ maxHeight: '100%', width: '100%' }}>
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
                <TableCell rowSpan={3} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>№ п.п.</TableCell>
                <TableCell rowSpan={3} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Обоснование</TableCell>
                <TableCell rowSpan={3} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Наименование</TableCell>
                <TableCell rowSpan={3} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Ед. изм.</TableCell>
                <TableCell colSpan={3} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Количество</TableCell>
                <TableCell colSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Стоимость в баз. уровне цен</TableCell>
                <TableCell rowSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Индекс</TableCell>
                <TableCell colSpan={2} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Сметная стоимость в текущем уровне цен</TableCell>
                <TableCell rowSpan={3} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Код индекса</TableCell>
                <TableCell rowSpan={3} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Идентификатор</TableCell>
                <TableCell rowSpan={3} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Номера позиций ВОР</TableCell>
                <TableCell rowSpan={3} sx={{ ...cellSx, borderRight: '2px solid', bgcolor: '#e3f2fd' }}>Класс груза</TableCell>
                <TableCell colSpan={2} sx={{ ...cellSx, bgcolor: '#e3f2fd' }}>Брутто</TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>На ед.</TableCell>
                <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>Коэфф.</TableCell>
                <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>Всего</TableCell>
                <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>На ед.</TableCell>
                <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>Всего</TableCell>
                <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>На ед.</TableCell>
                <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>Всего</TableCell>
                <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}>На ед. кг</TableCell>
                <TableCell sx={{ ...cellSx }}>Общая т</TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {positions.map((position, idx) => {
                // 👇 ЗАЩИТА ОТ NaN
                const basePrice = position.pricePerUnit || 0;
                const baseTotal = position.totalPrice || 0;
                const index = position.index || 1;
                const currentPrice = basePrice * index;
                const currentTotal = baseTotal * index;
                
                return (
                  <TableRow key={idx} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem' }}>{idx + 1}</Typography></TableCell>
                    <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>{position.code || '-'}</Typography></TableCell>
                    <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.3, fontSize: '0.7rem' }}>{position.name || '-'}</Typography></TableCell>
                    <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem' }}>{position.unit || '-'}</Typography></TableCell>
                    <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem' }}>{position.quantity?.toFixed(2) || '-'}</Typography></TableCell>
                    <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography></TableCell>
                    <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem' }}>{position.quantity?.toFixed(2) || '-'}</Typography></TableCell>
                    <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem' }}>{basePrice.toFixed(2) || '-'}</Typography></TableCell>
                    <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem' }}>{baseTotal.toFixed(2) || '-'}</Typography></TableCell>
                    <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem' }}>{position.index || '-'}</Typography></TableCell>
                    <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem' }}>{currentPrice.toFixed(2) || '-'}</Typography></TableCell>
                    <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem' }}>{currentTotal.toFixed(2) || '-'}</Typography></TableCell>
                    <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography></TableCell>
                    <TableCell sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography></TableCell>
                    <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography></TableCell>
                    <TableCell align="center" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography></TableCell>
                    <TableCell align="right" sx={{ ...cellSx, borderRight: '2px solid' }}><Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography></TableCell>
                    <TableCell align="right" sx={{ ...cellSx }}><Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>-</Typography></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default SmetaTable;