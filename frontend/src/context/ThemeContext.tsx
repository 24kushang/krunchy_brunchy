import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeContextProvider');
  }
  return context;
};

export const ThemeContextProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('kb-theme-mode');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    localStorage.setItem('kb-theme-mode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: '#FF5A09', // Vibrant Snacking Orange
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#0A3BB0', // Royal Blue
        contrastText: '#FFFFFF',
      },
      background: {
        default: mode === 'light' ? '#FAF6F0' : '#11100F', // Warm food cream vs warm dark grey
        paper: mode === 'light' ? '#FFFFFF' : '#1A1918',
      },
      text: {
        primary: mode === 'light' ? '#221D1A' : '#FAF6F0',
        secondary: mode === 'light' ? '#6B5E57' : '#B8AFA9',
      },
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      h1: { fontFamily: '"Fredoka", sans-serif', fontWeight: 600 },
      h2: { fontFamily: '"Fredoka", sans-serif', fontWeight: 600 },
      h3: { fontFamily: '"Fredoka", sans-serif', fontWeight: 600 },
      h4: { fontFamily: '"Fredoka", sans-serif', fontWeight: 600 },
      h5: { fontFamily: '"Fredoka", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"Fredoka", sans-serif', fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 24, // Friendly pill-shaped buttons
            paddingLeft: 20,
            paddingRight: 20,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 4px 10px rgba(255, 90, 9, 0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16, // Rounded friendly corners
            boxShadow: mode === 'light' 
              ? '0px 8px 24px rgba(34, 29, 26, 0.04)' 
              : '0px 8px 24px rgba(0, 0, 0, 0.2)',
            border: mode === 'light' ? '1px solid #EFEAE4' : '1px solid #2C2A28',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
