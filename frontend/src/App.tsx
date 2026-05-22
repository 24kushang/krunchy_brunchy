import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Sidebar from './components/Sidebar';
import OrderDashboard from './components/OrderDashboard';
import OrderRegistryTable from './components/OrderRegistryTable';
import OrderForm from './components/OrderForm';
import CustomerDashboard from './components/CustomerDashboard';
import CustomerForm from './components/CustomerForm';
import ItemDashboard from './components/ItemDashboard';
import ItemForm from './components/ItemForm';
import SocialDashboard from './components/SocialDashboard';
import WhatsAppLogs from './components/WhatsAppLogs';
import { WhatsAppToast, ToastMessage } from './components/WhatsAppToast';
import { ShoppingBag, Users, Cookie, TableProperties, Menu, Sun, Moon } from 'lucide-react';
import { getCustomTheme } from './theme';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sub-tabs configuration
  const [orderSubTab, setOrderSubTab] = useState<'board' | 'registry' | 'create'>('board');
  const [customerSubTab, setCustomerSubTab] = useState<'crm' | 'add'>('crm');
  const [itemSubTab, setItemSubTab] = useState<'catalog' | 'add'>('catalog');

  // WhatsApp Alert Toasts State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addWhatsAppToast = (toast?: ToastMessage) => {
    if (toast) {
      setToasts(prev => [...prev, toast]);
    }
  };

  const removeWhatsAppToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleTheme = () => {
    setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const theme = getCustomTheme(themeMode);

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
              <Button
                variant={orderSubTab === 'board' ? 'contained' : 'outlined'}
                onClick={() => setOrderSubTab('board')}
                startIcon={<ShoppingBag size={16} />}
              >
                Kanban Board
              </Button>
              <Button
                variant={orderSubTab === 'registry' ? 'contained' : 'outlined'}
                onClick={() => setOrderSubTab('registry')}
                startIcon={<TableProperties size={16} />}
              >
                Order Registry
              </Button>
              <Button
                variant={orderSubTab === 'create' ? 'contained' : 'outlined'}
                onClick={() => setOrderSubTab('create')}
                startIcon={<ShoppingBag size={16} />}
              >
                Create New Order
              </Button>
            </Box>
            {orderSubTab === 'board' && (
              <OrderDashboard onWhatsAppTriggered={addWhatsAppToast} />
            )}
            {orderSubTab === 'registry' && (
              <OrderRegistryTable onWhatsAppTriggered={addWhatsAppToast} />
            )}
            {orderSubTab === 'create' && (
              <OrderForm onOrderCreated={(newToast) => {
                addWhatsAppToast(newToast);
                setOrderSubTab('board'); // Redirect back to board
              }} />
            )}
          </Box>
        );

      case 'customers':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
              <Button
                variant={customerSubTab === 'crm' ? 'contained' : 'outlined'}
                onClick={() => setCustomerSubTab('crm')}
                startIcon={<Users size={16} />}
              >
                CRM & Analytics
              </Button>
              <Button
                variant={customerSubTab === 'add' ? 'contained' : 'outlined'}
                onClick={() => setCustomerSubTab('add')}
                startIcon={<Users size={16} />}
              >
                Register Customer
              </Button>
            </Box>
            {customerSubTab === 'crm' ? (
              <CustomerDashboard onWhatsAppTriggered={addWhatsAppToast} />
            ) : (
              <CustomerForm onSuccess={() => setCustomerSubTab('crm')} />
            )}
          </Box>
        );

      case 'items':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
              <Button
                variant={itemSubTab === 'catalog' ? 'contained' : 'outlined'}
                onClick={() => setItemSubTab('catalog')}
                startIcon={<Cookie size={16} />}
              >
                Product Manager
              </Button>
              <Button
                variant={itemSubTab === 'add' ? 'contained' : 'outlined'}
                onClick={() => setItemSubTab('add')}
                startIcon={<Cookie size={16} />}
              >
                Define New Product
              </Button>
            </Box>
            {itemSubTab === 'catalog' ? (
              <ItemDashboard />
            ) : (
              <ItemForm onSuccess={() => setItemSubTab('catalog')} />
            )}
          </Box>
        );

      case 'social':
        return <SocialDashboard />;

      case 'whatsapp':
        return <WhatsAppLogs />;

      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'background.default', transition: 'background-color 0.3s' }}>

        {/* Mobile Header Bar */}
        <Box
          component="header"
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: 90,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              color="inherit"
              onClick={() => setMobileOpen(true)}
              edge="start"
              aria-label="open drawer"
            >
              <Menu size={24} />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              🍪 Krunchy Brunchy
            </Typography>
          </Box>
          <IconButton onClick={toggleTheme} color="primary" size="small">
            {themeMode === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          {/* Responsive Sidebar Drawer for Mobile */}
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: 280,
                backgroundColor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setOrderSubTab('board');
                setCustomerSubTab('crm');
                setItemSubTab('catalog');
                setMobileOpen(false); // Close mobile drawer
              }}
              themeMode={themeMode}
              toggleTheme={toggleTheme}
            />
          </Drawer>

          {/* Desktop Fixed Sidebar Container */}
          <Box
            component="nav"
            sx={{
              width: 280,
              flexShrink: 0,
              display: { xs: 'none', md: 'block' },
            }}
          >
            <Box
              sx={{
                width: 280,
                backgroundColor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider',
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: 0,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                transition: 'background-color 0.3s, border-color 0.3s',
              }}
            >
              <Sidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                  setActiveTab(tab);
                  setOrderSubTab('board');
                  setCustomerSubTab('crm');
                  setItemSubTab('catalog');
                }}
                themeMode={themeMode}
                toggleTheme={toggleTheme}
              />
            </Box>
          </Box>

          {/* Main Content Area */}
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: { xs: 2.5, md: 4 },
              minHeight: '100vh',
              overflowY: 'auto'
            }}
          >
            {renderContent()}
          </Box>
        </Box>

        {/* Floating WhatsApp Notifications Container */}
        <div className="toast-container">
          {toasts.map(toast => (
            <WhatsAppToast
              key={toast.id}
              toast={toast}
              onClose={removeWhatsAppToast}
            />
          ))}
        </div>
      </Box>
    </ThemeProvider>
  );
};

export default App;
