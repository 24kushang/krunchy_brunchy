import React from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton
} from '@mui/material';
import {
  ShoppingBag,
  Users,
  Cookie,
  Calendar,
  MessageSquare,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  themeMode,
  toggleTheme
}) => {
  const navItems = [
    { id: 'orders', label: 'Order Hub', icon: ShoppingBag },
    { id: 'customers', label: 'Customer CRM', icon: Users },
    { id: 'items', label: 'Item Catalog', icon: Cookie },
    { id: 'social', label: 'Social Calendar', icon: Calendar },
    { id: 'whatsapp', label: 'WhatsApp Logs', icon: MessageSquare },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        p: 3,
      }}
    >
      {/* Brand logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 5 }}>
        <Typography variant="h4" component="span" sx={{ fontSize: '2rem' }}>
          🍪
        </Typography>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Krunchy Brunchy
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'primary.main',
              textTransform: 'uppercase',
              letterSpacing: '0.12em'
            }}
          >
            Admin Portal
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <List component="nav" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <ListItemButton
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              selected={isActive}
              sx={{
                borderRadius: 2,
                px: 2,
                py: 1.25,
                color: isActive ? 'primary.main' : 'text.secondary',
                borderLeft: isActive ? '3px solid' : '3px solid transparent',
                borderColor: 'primary.main',
                backgroundColor: isActive ? 'action.selected' : 'transparent',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'action.hover',
                },
                '&.Mui-selected': {
                  backgroundColor: themeMode === 'dark' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                  '&:hover': {
                    backgroundColor: themeMode === 'dark' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                  }
                }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                <IconComponent size={20} />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.95rem'
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Footer Section */}
      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>

        {/* Light / Dark Mode Toggle */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            p: 1,
            borderRadius: 2,
            backgroundColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.secondary', ml: 1 }}>
            {themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </Typography>
          <IconButton onClick={toggleTheme} color="primary" size="small">
            {themeMode === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </IconButton>
        </Box>

        <Divider sx={{ width: '100%' }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.75rem', color: 'text.secondary' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Sparkles size={12} style={{ color: '#f59e0b' }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Krunchy Admin</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">v1.0.0 • Production</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Sidebar;
