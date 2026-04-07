// src/App.jsx
import './gridSetup.js';
import React, { useState, useRef, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Button, IconButton,
  Snackbar, Alert, Tooltip, Divider, CircularProgress,
  Container, CssBaseline, ThemeProvider, createTheme, Chip
} from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

// Services - 👇 ВАЖНО: расширения .js для Vite
import { normsStore } from './services/normsStore.js';
import { parseSmetaFile } from './services/smetaParser.js';
import { parseMultipleNormsFiles } from './services/normsParser.js';

// Components - 👇 расширения .jsx
import NormsTree from './components/NormsTree.jsx';
import NormTable from './components/NormTable.jsx';
import NormsPanel from './components/NormsPanel.jsx';
import SmetaTable from './components/SmetaTable.jsx'; 

// Тема MUI
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14
  },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none' } } },
    MuiTab: { styleOverrides: { root: { minHeight: 36, minWidth: 100 } } }
  }
});

function App() {
  // ===== Состояние вкладок =====
  const [activeTab, setActiveTab] = useState('home'); // 👈 Строка, не число!
  const [tabs, setTabs] = useState([
    { id: 'home', title: 'Главная', type: 'home', closable: false },
    { id: 'base', title: 'База', type: 'base', closable: false }
  ]);
  
  // ===== Состояние для смет =====
  const [smetas, setSmetas] = useState({});
  
  // ===== Состояние для нормативов =====
  const [openTables, setOpenTables] = useState({});
  
  // ===== UI состояние =====
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [loading, setLoading] = useState(false);
  
  // ===== Refs для input =====
  const fileInputRef = useRef(null);
  const normsInputRef = useRef(null);
  
  // ===== Инициализация =====
  useEffect(() => {
    console.log('🚀 App mounted');
    return () => console.log('🔚 App unmounted');
  }, []);
  
  // ===== Обработчики вкладок =====
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleCloseTab = (tabId, event) => {
    if (event) event.stopPropagation();
    
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId);
      if (activeTab === tabId && newTabs.length > 0) {
        const lastIndex = newTabs.length - 1;
        setActiveTab(newTabs[lastIndex].id);
      }
      return newTabs;
    });
    
    if (openTables[tabId]) {
      setOpenTables(prev => {
        const newOpen = { ...prev };
        delete newOpen[tabId];
        return newOpen;
      });
    }
    if (smetas[tabId]) {
      setSmetas(prev => {
        const newSmetas = { ...prev };
        delete newSmetas[tabId];
        return newSmetas;
      });
    }
  };
  
  const handleAddSmetaTab = (fileName, data) => {
    const tabId = `smeta_${Date.now()}`;
    const newTab = {
      id: tabId,
      title: fileName.substring(0, 20) + (fileName.length > 20 ? '...' : ''),
      type: 'smeta',
      closable: true,
      fileName,
      data
    };
    
    setTabs(prev => [...prev, newTab]);
    setSmetas(prev => ({ ...prev, [tabId]: data }));
    setActiveTab(tabId);
  };
  
  // ===== Загрузка файлов смет =====
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    setLoading(true);
    
    for (const file of files) {
      try {
        const result = await parseSmetaFile(file);
        if (result.success && result.data) {
          handleAddSmetaTab(result.fileName, result.data);
          showSnackbar(`✅ Загружена смета: ${result.fileName}`, 'success');
        } else {
          showSnackbar(`❌ Ошибка: ${result?.error || 'Неизвестная ошибка'}`, 'error');
        }
      } catch (err) {
        console.error('💥 Ошибка парсинга:', err);
        showSnackbar(`❌ Ошибка: ${err.message}`, 'error');
      }
    }
    
    setLoading(false);
    event.target.value = '';
  };
  
  // ===== Загрузка нормативов — 👇 ИСПРАВЛЕННАЯ ФУНКЦИЯ =====
const handleNormsUpload = async (event) => {
  console.log('📤 handleNormsUpload: ВЫЗОВ');
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  setLoading(true);
  
  try {
    console.log('🔍 Парсинг нормативов...');
    const result = await parseMultipleNormsFiles(files);
    
    console.log('✅ Парсер завершил:', {
      success: result.successCount,
      errors: result.errorCount,
      works: result.totalWorks,
      resultsCount: result.results?.length
    });
    
    // 👇 КЛЮЧЕВОЕ: Сохраняем каждый норматив в хранилище
    if (result.results?.length > 0) {
      console.log('💾 Сохранение в normsStore...');
      
      result.results.forEach((norm, idx) => {
        console.log(`  [${idx}] norm:`, {
          fileName: norm?.fileName,
          hasHierarchy: !!norm?.hierarchy,
          tables: norm?.hierarchy?.tables?.length,
          works: norm?.hierarchy?.works?.length
        });
        
        // 👇 ПРОВЕРЯЕМ hierarchy напрямую (не через data!)
        if (norm?.hierarchy) {
          console.log(`  [${idx}] ✅ Вызов addNorm`);
          normsStore.addNorm(norm);  // 👈 ПЕРЕДАЁМ norm напрямую!
          console.log(`  [${idx}] После addNorm: ${normsStore.getAllNorms().length} нормативов`);
        } else {
          console.warn(`  [${idx}] ⚠️ Пропущен (нет hierarchy)`);
        }
      });
      
      const saved = normsStore.getAllNorms().length;
      console.log('✅ Сохранено:', saved, 'нормативов');
      
      showSnackbar(
        `✅ Загружено: ${result.results.length}\n` +
        `📊 Работ: ${result.results.reduce((sum, n) => sum + (n.hierarchy?.works?.length || 0), 0)}\n` +
        `💾 Сохранено: ${saved}`,
        'success'
      );
    }
    
  } catch (err) {
    console.error('💥 Ошибка:', err);
    showSnackbar(`❌ ${err.message}`, 'error');
  } finally {
    setLoading(false);
    event.target.value = '';
  }
};
  
  // ===== Snackbar =====
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  // ===== Обработчик открытия таблицы норматива =====
  const handleOpenNormTable = (section, norm, breadcrumb) => {
    const tableId = `norm_${section.code || Date.now()}`;
    
    if (!tabs.find(t => t.id === tableId)) {
      const newTab = {
        id: tableId,
        title: `${section.code || 'Раздел'} - ${section.name?.substring(0, 20) || ''}`,
        type: 'normTable',
        closable: true,
        section,
        norm,
        breadcrumb
      };
      setTabs(prev => [...prev, newTab]);
      setOpenTables(prev => ({
        ...prev,
        [tableId]: { section, norm, breadcrumb }
      }));
    }
    setActiveTab(tableId);
  };
  
  // ===== Рендер контента вкладки =====
  const renderTabContent = (tab) => {
    switch (tab?.type) {
      case 'home': {
        return (
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflow: 'auto' }}>
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom fontWeight={600}>
                WebSmeta — Сметное дело онлайн
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Профессиональный инструмент для работы со сметами и нормативами
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  size="large"
                >
                  Загрузить смету
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FolderOpenIcon />}
                  onClick={() => normsInputRef.current?.click()}
                  size="large"
                >
                  Загрузить нормативы
                </Button>
              </Box>
            </Paper>
            
            {/* Статистика */}
            {normsStore.getStats && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  📊 Загруженные нормативы
                </Typography>
                {(() => {
                  const stats = normsStore.getStats();
                  return (
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <Chip label={`Всего: ${stats.normsCount || 0}`} color="primary" />
                      <Chip label={`Работ: ${stats.worksCount || 0}`} />
                      {Object.entries(stats.byType || {}).map(([type, data]) => (
                        <Chip 
                          key={type} 
                          label={`${type}: ${data.norms} норм., ${data.works} раб.`} 
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  );
                })()}
              </Paper>
            )}
            
            {/* Панель нормативов */}
            <NormsPanel onOpenTable={handleOpenNormTable} />
          </Box>
        );
      }
        
      case 'base': {
        const norms = normsStore.getAllNorms();
        console.log('🔍 NormsTree props:', {
          normsCount: norms.length,
          firstNorm: norms[0] ? {
            fileName: norms[0].fileName,
            hasHierarchy: !!norms[0].hierarchy,
            tablesCount: norms[0].hierarchy?.tables?.length,
            worksCount: norms[0].hierarchy?.works?.length
          } : null
        });
        return <NormsTree onOpenNormTable={handleOpenNormTable} />;
      }
        
      case 'smeta': {
        const smetaData = smetas[tab.id];
        if (!smetaData) return <Box sx={{ p: 3 }}>Данные сметы не найдены</Box>;
        
        return <SmetaTable smetaData={smetaData} />;  // 👇 ПРОСТОЙ ВЫЗОВ КОМПОНЕНТА
      }
        
      case 'normTable': {
        const tableData = openTables[tab.id];
        if (!tableData) return <Box sx={{ p: 3 }}>Данные таблицы не найдены</Box>;
        
        return (
          <NormTable
            section={tableData.section}
            norm={tableData.norm}
            breadcrumb={tableData.breadcrumb}
            setActiveTab={setActiveTab}  // 👈 ОБЯЗАТЕЛЬНО!
          />
        );
      }
        
      default:
        return <Box sx={{ p: 3 }}>Неизвестный тип вкладки</Box>;
    }
  };
  
  // ===== Основной рендер =====
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        bgcolor: 'background.default'
      }}>
        {/* Скрытые input для загрузки */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".xml,.gsfx"
          multiple
          onChange={handleFileUpload}
        />
        <input
          type="file"
          ref={normsInputRef}
          style={{ display: 'none' }}
          accept=".xml"
          multiple
          onChange={handleNormsUpload}
        />
        
        {/* Header */}
        <Paper sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mr: 2 }}>WebSmeta</Typography>
          
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
            sx={{ flex: 1 }}
          >
            {tabs.map(tab => (
              <Tab
                key={tab.id}
                value={tab.id}  // 👈 value={tab.id} — строка!
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tab
                      value={tab.id}
                      label={tab.title}
                      sx={{ minWidth: 'auto', textTransform: 'none' }}
                    />
                    {tab.closable && (
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTab(tab.id, e);
                        }}
                        sx={{ ml: 0.5, mr: 1 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Загрузить смету">
              <IconButton 
                color="primary"
                onClick={() => fileInputRef.current?.click()}
                size="small"
              >
                <UploadFileIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Загрузить нормативы">
              <IconButton 
                color="secondary"
                onClick={() => normsInputRef.current?.click()}
                size="small"
              >
                <FolderOpenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
        
        {/* Loading overlay */}
        {loading && (
          <Box sx={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Загрузка...</Typography>
          </Box>
        )}
        
        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {renderTabContent(tabs.find(t => t.id === activeTab) || tabs[0])}
        </Box>
        
        {/* Footer */}
        <Paper sx={{ px: 2, py: 0.5, borderTop: 1, borderColor: 'divider', fontSize: '0.75rem', color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
          <span>WebSmeta v1.0</span>
          <span>Нормативы: {normsStore.getStats?.()?.normsCount || 0} | Работ: {normsStore.getStats?.()?.worksCount || 0}</span>
        </Paper>
        
        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;