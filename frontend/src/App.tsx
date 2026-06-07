import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeContextProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Orders from './pages/Orders';
import Items from './pages/Items';
import Customers from './pages/Customers';
import SocialMedia from './pages/SocialMedia';
import WhatsappHub from './pages/WhatsappHub';
import NewOrder from './pages/NewOrder';
import OrderSources from './pages/OrderSources';
import InventoryPlanner from './pages/InventoryPlanner';
import RevenueDashboard from './pages/RevenueDashboard';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import AuthGuard from './components/AuthGuard';

function ProtectedLayout() {
  return (
    <AuthGuard>
      <Layout>
        <Outlet />
      </Layout>
    </AuthGuard>
  );
}

function AppContent() {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes utilizing Layout Route (Outlet) */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/items" element={<Items />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/social-media" element={<SocialMedia />} />
        <Route path="/whatsapp" element={<WhatsappHub />} />
        <Route path="/new-order" element={<NewOrder />} />
        <Route path="/order-sources" element={<OrderSources />} />
        <Route path="/inventory" element={<InventoryPlanner />} />
        <Route path="/revenue" element={<RevenueDashboard />} />
        
        {/* User Management Route (Only accessible to SuperAdmin) */}
        <Route 
          path="/users" 
          element={
            <AuthGuard allowedRoles={['SuperAdmin']}>
              <UserManagement />
            </AuthGuard>
          } 
        />
      </Route>

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeContextProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ThemeContextProvider>
    </AuthProvider>
  );
}

export default App;
