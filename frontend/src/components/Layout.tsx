import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  Chip,
  Divider,
  Avatar
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import OrdersIcon from '@mui/icons-material/ShoppingCart';
import ItemsIcon from '@mui/icons-material/Fastfood';
import CustomersIcon from '@mui/icons-material/People';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import WhatsappIcon from '@mui/icons-material/WhatsApp';
import NewOrderIcon from '@mui/icons-material/AddCircleOutlined';
import DarkModeIcon from '@mui/icons-material/Brightness4';
import LightModeIcon from '@mui/icons-material/Brightness7';
import ActiveIcon from '@mui/icons-material/RadioButtonChecked';
import { useAppTheme } from '../context/ThemeContext';

const drawerWidth = 260;

export default function Layout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useAppTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { text: 'Create Order', icon: <NewOrderIcon />, path: '/new-order' },
    { text: 'Orders Dashboard', icon: <OrdersIcon />, path: '/orders' },
    { text: 'Snack Catalog', icon: <ItemsIcon />, path: '/items' },
    { text: 'Customer Insights', icon: <CustomersIcon />, path: '/customers' },
    { text: 'Content Calendar', icon: <CalendarIcon />, path: '/social-media' },
    { text: 'WhatsApp Hub', icon: <WhatsappIcon />, path: '/whatsapp' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: mode === 'light' ? '#FFFFFF' : '#1A1918' }}>
      {/* Brand Header */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '12px',
            bgcolor: '#FF5A09',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0px 4px 12px rgba(255, 90, 9, 0.25)'
          }}
        >
          <Typography sx={{ fontFamily: '"Fredoka", sans-serif', color: '#FFF', fontWeight: 'bold', fontSize: 24, mt: -0.2 }}>
            K
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Fredoka", sans-serif',
              fontWeight: 700,
              color: '#FF5A09',
              lineHeight: 1.1,
              letterSpacing: 0.5
            }}
          >
            KRUNCHY
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"Fredoka", sans-serif',
              fontWeight: 600,
              color: mode === 'light' ? '#0A3BB0' : '#4C7BF4',
              letterSpacing: 1.5,
              lineHeight: 1
            }}
          >
            BRUNCHY
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mx: 2, borderColor: mode === 'light' ? '#F0EBE5' : '#2D2B29' }} />

      {/* Navigation List */}
      <List sx={{ px: 2, py: 3, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 3,
                  py: 1.2,
                  px: 2,
                  bgcolor: isActive
                    ? isActive && item.path === '/new-order' ? 'rgba(255, 90, 9, 0.08)' : 'rgba(10, 59, 176, 0.06)'
                    : 'transparent',
                  color: isActive
                    ? item.path === '/new-order' ? '#FF5A09' : '#0A3BB0'
                    : mode === 'light' ? '#6B5E57' : '#B8AFA9',
                  '&:hover': {
                    bgcolor: isActive
                      ? item.path === '/new-order' ? 'rgba(255, 90, 9, 0.12)' : 'rgba(10, 59, 176, 0.1)'
                      : mode === 'light' ? '#F7F3EE' : '#252321',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive
                      ? item.path === '/new-order' ? '#FF5A09' : '#0A3BB0'
                      : mode === 'light' ? '#8F8279' : '#8A8077',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  slotProps={{
                    primary: {
                      sx: {
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.95rem',
                        fontFamily: isActive ? '"Fredoka", sans-serif' : 'inherit',
                      }
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer / System Status */}
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: mode === 'light' ? '#FAF6F0' : '#222120',
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ActiveIcon sx={{ color: '#4CAF50', fontSize: 16 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
              OMS Server Online
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary">
            Version 1.0.0 (Admin Only)
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: theme.palette.background.default }}>
      {/* Top Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: theme.palette.background.default,
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${mode === 'light' ? '#EFEAE4' : '#2C2A28'}`,
          backdropFilter: 'blur(8px)',
          backgroundImage: 'none'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h5"
            sx={{
              fontFamily: '"Fredoka", sans-serif',
              fontWeight: 700,
              color: mode === 'light' ? '#221D1A' : '#FAF6F0',
            }}
          >
            {menuItems.find((item) => item.path === location.pathname)?.text || 'Krunchy Brunchy Operations'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label="Admin Terminal"
              size="small"
              sx={{
                bgcolor: 'rgba(255, 90, 9, 0.1)',
                color: '#FF5A09',
                fontWeight: 700,
                border: '1px solid rgba(255, 90, 9, 0.2)'
              }}
            />

            <IconButton onClick={toggleTheme} color="inherit" sx={{ bgcolor: mode === 'light' ? '#FFFFFF' : '#222120', border: `1px solid ${mode === 'light' ? '#EFEAE4' : '#2C2A28'}` }}>
              {mode === 'dark' ? <LightModeIcon sx={{ color: '#FFA726' }} /> : <DarkModeIcon sx={{ color: '#0A3BB0' }} />}
            </IconButton>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: mode === 'light' ? '#EFEAE4' : '#2C2A28' }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  bgcolor: '#0A3BB0',
                  color: '#FFFFFF',
                  width: 36,
                  height: 36,
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  fontFamily: '"Fredoka", sans-serif'
                }}
              >
                KB
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                  Operational Admin
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Superuser
                </Typography>
              </Box>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer for Desktop & Mobile */}
      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: `1px solid ${mode === 'light' ? '#EFEAE4' : '#2C2A28'}`,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Pane */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          overflowX: 'hidden'
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
