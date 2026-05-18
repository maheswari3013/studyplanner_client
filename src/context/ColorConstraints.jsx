import { createContext, useContext, useState, useEffect } from 'react';

const ColorContext = createContext(null);

export const useColors = () => {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error('useColors must be used within ColorProvider');
  }
  return context;
};

// Design system constraints - matches your 25 feature requirements
const THEME_TOKENS = {
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    500: '#667eea',
    600: '#5a67d8',
    700: '#4c51bf',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981',
    600: '#059669',
    gradient: 'linear-gradient(135deg, #10b981, #059669)'
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
  },
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444',
    600: '#dc2626',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)'
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)'
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a'
  }
};

const BLOCK_TYPES = {
  Study: { color: THEME_TOKENS.info[500], bg: THEME_TOKENS.info[50], label: 'Study' },
  Review: { color: THEME_TOKENS.warning[500], bg: THEME_TOKENS.warning[50], label: 'Review' },
  Practice: { color: THEME_TOKENS.primary[500], bg: THEME_TOKENS.primary[50], label: 'Practice' },
  Break: { color: THEME_TOKENS.neutral[400], bg: THEME_TOKENS.neutral[100], label: 'Break' },
  Completed: { color: THEME_TOKENS.success[500], bg: THEME_TOKENS.success[50], label: 'Done' },
  Missed: { color: THEME_TOKENS.danger[500], bg: THEME_TOKENS.danger[50], label: 'Missed' }
};

const DIFFICULTY_COLORS = {
  1: { color: THEME_TOKENS.success[500], bg: THEME_TOKENS.success[100], label: 'Very Easy' },
  2: { color: THEME_TOKENS.success[600], bg: THEME_TOKENS.success[50], label: 'Easy' },
  3: { color: THEME_TOKENS.warning[500], bg: THEME_TOKENS.warning[100], label: 'Medium' },
  4: { color: THEME_TOKENS.warning[600], bg: THEME_TOKENS.warning[50], label: 'Hard' },
  5: { color: THEME_TOKENS.danger[500], bg: THEME_TOKENS.danger[100], label: 'Very Hard' }
};

const PRIORITY_COLORS = {
  Low: { color: THEME_TOKENS.success[500], bg: THEME_TOKENS.success[50] },
  Medium: { color: THEME_TOKENS.warning[500], bg: THEME_TOKENS.warning[50] },
  High: { color: THEME_TOKENS.danger[500], bg: THEME_TOKENS.danger[50] }
};

export function ColorProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Inject CSS variables into root on mount
    const root = document.documentElement;
    Object.entries(THEME_TOKENS.primary).forEach(([key, value]) => {
      if (key!== 'gradient') root.style.setProperty(`--color-primary-${key}`, value);
    });
    root.style.setProperty('--gradient-primary', THEME_TOKENS.primary.gradient);
    root.style.setProperty('--gradient-success', THEME_TOKENS.success.gradient);
    root.style.setProperty('--gradient-warning', THEME_TOKENS.warning.gradient);
    root.style.setProperty('--gradient-danger', THEME_TOKENS.danger.gradient);
    root.style.setProperty('--gradient-info', THEME_TOKENS.info.gradient);
  }, []);

  const getBlockTypeColor = (type, status = null) => {
    if (status === 'missed') return BLOCK_TYPES.Missed;
    if (status === 'completed') return BLOCK_TYPES.Completed;
    return BLOCK_TYPES[type] || BLOCK_TYPES.Study;
  };

  const getDifficultyColor = (level) => {
    return DIFFICULTY_COLORS[level] || DIFFICULTY_COLORS[3];
  };

  const getPriorityColor = (priority) => {
    return PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return THEME_TOKENS.success[500];
    if (percentage >= 50) return THEME_TOKENS.warning[500];
    return THEME_TOKENS.danger[500];
  };

  const getProgressGradient = (percentage) => {
    if (percentage >= 80) return THEME_TOKENS.success.gradient;
    if (percentage >= 50) return THEME_TOKENS.warning.gradient;
    return THEME_TOKENS.danger.gradient;
  };

  const value = {
    theme,
    setTheme,
    tokens: THEME_TOKENS,
    getBlockTypeColor,
    getDifficultyColor,
    getPriorityColor,
    getProgressColor,
    getProgressGradient,
    BLOCK_TYPES,
    DIFFICULTY_COLORS,
    PRIORITY_COLORS
  };

  return (
    <ColorContext.Provider value={value}>
      {children}
    </ColorContext.Provider>
  );
}