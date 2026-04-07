import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  
  // 👇 Конфигурация №1: Для React компонентов в src/ (браузер)
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['scripts/**'],  // 👈 Явно исключаем scripts/ из этой конфигурации
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  
  // 👇 Конфигурация №2: Для скриптов в scripts/ (Node.js)
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        // 👈 Явно перечисляем переменные Node.js (на случай если globals.node не сработает)
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        ...globals.node,  // 👈 Дополнительно подключаем все переменные из globals.node
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'commonjs',  // 👈 CommonJS для require()
      },
    },
    rules: {
      'no-undef': 'off',  // 👈 Полностью отключаем проверку no-undef для скриптов
      'no-unused-vars': 'off',  // 👈 Отключаем unused-vars для скриптов
    },
  },
])