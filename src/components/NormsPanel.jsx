// src/components/NormsPanel.jsx
import React, { useState } from 'react';
import { 
  Box, Paper, Typography, TextField, Button, List, ListItem, 
  ListItemText, ListItemSecondaryAction, IconButton, Divider,
  Chip, LinearProgress, Tooltip
} from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { normsStore } from '../services/normsStore.js';
import { parseMultipleNormsFiles } from '../services/normsParser';

const NormsPanel = ({ onAddWorkToSmeta }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(() => {
    try {
        return normsStore.getStats?.() || { normsCount: 0, worksCount: 0, norms: [] };
    } catch {
        return { normsCount: 0, worksCount: 0, norms: [] };
    }
    });
  
  // Обработка загрузки файлов нормативов
  const handleLoadNorms = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    setLoading(true);
    try {
        const result = await parseMultipleNormsFiles(files);
        normsStore.loadNorms(result.results);
        
        // 👇 Безопасное обновление stats
        try {
        setStats(normsStore.getStats());
        } catch (e) {
        console.warn('⚠️ Ошибка получения статистики:', e);
        setStats({ normsCount: normsStore.norms?.length || 0, worksCount: 0, norms: [] });
        }
        
        alert(`✅ Загружено нормативов: ${result.successCount}\n` +
            `❌ Ошибок: ${result.errorCount}\n` +
            `📊 Всего работ: ${result.totalWorks}`);
    } catch (error) {
        alert(`❌ Ошибка загрузки: ${error.message}`);
    } finally {
        setLoading(false);
        event.target.value = '';
    }
    };
  
  // Поиск работ
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = normsStore.search(searchQuery, 100);
    setSearchResults(results);
  };
  
  // Добавление работы в смету
  const handleAddWork = (work) => {
    if (onAddWorkToSmeta) {
      onAddWorkToSmeta(work);
    }
  };
  
  // Очистка хранилища
  const handleClear = () => {
    if (window.confirm('Очистить все загруженные нормативы?')) {
      normsStore.clear();
      setStats(normsStore.getStats());
      setSearchResults([]);
    }
  };
  
  // Настройки таблицы результатов поиска
  const [columnDefs] = useState([
    { field: 'code', headerName: 'Шифр', width: 150, pinned: 'left' },
    { field: 'name', headerName: 'Наименование', flex: 1 },
    { field: 'unit', headerName: 'Ед. изм.', width: 100 },
    { 
      field: 'resourcesCount', 
      headerName: 'Ресурсов', 
      width: 100,
      valueGetter: params => params.data.resources?.length || 0
    },
    {
      headerName: 'Действия',
      width: 100,
      cellRenderer: params => (
        <Button
          size="small"
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleAddWork(params.data)}
        >
          Добавить
        </Button>
      )
    }
  ]);
  
  return (
    <Paper sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        📚 Нормативная база
      </Typography>
      
      {/* Статистика */}
      <Box sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
        <Typography variant="body2">
          Загружено нормативов: <strong>{stats.normsCount}</strong>
        </Typography>
        <Typography variant="body2">
          Всего работ: <strong>{stats.worksCount}</strong>
        </Typography>
      </Box>
      
      {/* Кнопки управления */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <input
          type="file"
          id="norms-upload"
          multiple
          accept=".xml"
          style={{ display: 'none' }}
          onChange={handleLoadNorms}
        />
        
        <Button
          variant="outlined"
          color="primary"
          startIcon={<FolderOpenIcon />}
          onClick={() => document.getElementById('norms-upload').click()}
          disabled={loading}
        >
          Загрузить нормативы
        </Button>
        
        {stats.normsCount > 0 && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<ClearIcon />}
            onClick={handleClear}
          >
            Очистить
          </Button>
        )}
      </Box>
      
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      
      {/* Поиск */}
      {stats.normsCount > 0 && (
        <>
          <Box sx={{ mb: 2 }}>
            <TextField
                fullWidth
                placeholder="Поиск: 01-01-022-08 или 'земляные работы'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                helperText="💡 Вводите код без префикса: 01-01-022-08 (не ГЭСН01-01-022-08)"
                InputProps={{
                    endAdornment: (
                    <IconButton onClick={handleSearch}>
                        <SearchIcon />
                    </IconButton>
                    )
                }}
                />
          </Box>
          
          {/* Результаты поиска */}
          {searchResults.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Найдено: {searchResults.length}
              </Typography>
              
              <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
                <AgGridReact
                rowData={searchResults}
                columnDefs={columnDefs}
                theme="legacy"
                defaultColDef={{
                    sortable: true,
                    filter: true,
                    resizable: true
                }}
                rowHeight={60}
                domLayout="autoHeight"
                />
              </div>
            </Box>
          )}
          
          {searchQuery && searchResults.length === 0 && (
            <Typography color="textSecondary" align="center">
              Ничего не найдено
            </Typography>
          )}
        </>
      )}
      
      {stats.normsCount === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <Typography variant="body2">
            Загрузите файлы нормативов (ГЭСН, ФЕР и др.) для поиска и добавления работ
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default NormsPanel;