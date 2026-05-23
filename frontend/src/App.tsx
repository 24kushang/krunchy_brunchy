import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeContextProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Orders from './pages/Orders';
import Items from './pages/Items';
import Customers from './pages/Customers';
import SocialMedia from './pages/SocialMedia';
import WhatsappHub from './pages/WhatsappHub';
import NewOrder from './pages/NewOrder';

function App() {
  return (
    <ThemeContextProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/orders" replace />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/items" element={<Items />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/social-media" element={<SocialMedia />} />
            <Route path="/whatsapp" element={<WhatsappHub />} />
            <Route path="/new-order" element={<NewOrder />} />
            <Route path="*" element={<Navigate to="/orders" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeContextProvider>
  );
}

export default App;
