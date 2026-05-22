import { createTheme } from '@mui/material/styles';

export const getCustomTheme = (mode: 'light' | 'dark') => {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'dark' ? '#f59e0b' : '#d97706', // Amber 500 vs Amber 600
        contrastText: mode === 'dark' ? '#0f172a' : '#ffffff',
      },
      secondary: {
        main: mode === 'dark' ? '#10b981' : '#059669', // Emerald 500 vs Emerald 600
      },
      background: {
        default: mode === 'dark' ? '#0b0f19' : '#f8fafc',
        paper: mode === 'dark' ? '#131b2e' : '#ffffff',
      },
      text: {
        primary: mode === 'dark' ? '#f8fafc' : '#0f172a',
        secondary: mode === 'dark' ? '#94a3b8' : '#475569',
      },
      divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.08)',
      error: {
        main: '#ef4444',
      },
      success: {
        main: '#10b981',
      },
      warning: {
        main: '#f59e0b',
      },
      info: {
        main: '#3b82f6',
      },
    },
    typography: {
      fontFamily: `'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
      h1: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontWeight: 700,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: '0.95rem',
            transition: 'all 0.2s ease-in-out',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
              transform: 'translateY(-1px)',
            },
          },
          containedPrimary: {
            '&:hover': {
              backgroundColor: mode === 'dark' ? '#d97706' : '#b45309',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: mode === 'dark' 
              ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)' 
              : '0 8px 24px 0 rgba(148, 163, 184, 0.12)',
            border: mode === 'dark' 
              ? '1px solid rgba(255, 255, 255, 0.07)' 
              : '1px solid rgba(15, 23, 42, 0.06)',
            transition: 'background-color 0.3s, border-color 0.3s',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
          variant: 'outlined',
        },
      },
      MuiSelect: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(15, 23, 42, 0.02)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 600,
            color: mode === 'dark' ? '#94a3b8' : '#475569',
          },
          root: {
            borderBottomColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.06)',
          },
        },
      },
    },
  });
};
