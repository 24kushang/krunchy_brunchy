import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import OrderDashboard from './components/OrderDashboard';
import OrderForm from './components/OrderForm';
import CustomerDashboard from './components/CustomerDashboard';
import CustomerForm from './components/CustomerForm';
import ItemDashboard from './components/ItemDashboard';
import ItemForm from './components/ItemForm';
import SocialDashboard from './components/SocialDashboard';
import WhatsAppLogs from './components/WhatsAppLogs';
import { WhatsAppToast, ToastMessage } from './components/WhatsAppToast';
import { ShoppingBag, Users, Cookie } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('orders');
  
  // Sub-tabs configuration
  const [orderSubTab, setOrderSubTab] = useState<'board' | 'create'>('board');
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

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="sub-navigation" style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <button 
                className={`btn ${orderSubTab === 'board' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setOrderSubTab('board')}
              >
                <ShoppingBag size={16} />
                <span>Kanban Order Board</span>
              </button>
              <button 
                className={`btn ${orderSubTab === 'create' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setOrderSubTab('create')}
              >
                <ShoppingBag size={16} />
                <span>Create New Order</span>
              </button>
            </div>
            {orderSubTab === 'board' ? (
              <OrderDashboard onWhatsAppTriggered={addWhatsAppToast} />
            ) : (
              <OrderForm onOrderCreated={(newToast) => {
                addWhatsAppToast(newToast);
                setOrderSubTab('board'); // Redirect back to board
              }} />
            )}
          </div>
        );

      case 'customers':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="sub-navigation" style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <button 
                className={`btn ${customerSubTab === 'crm' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCustomerSubTab('crm')}
              >
                <Users size={16} />
                <span>CRM & Analytics</span>
              </button>
              <button 
                className={`btn ${customerSubTab === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCustomerSubTab('add')}
              >
                <Users size={16} />
                <span>Register Customer</span>
              </button>
            </div>
            {customerSubTab === 'crm' ? (
              <CustomerDashboard onWhatsAppTriggered={addWhatsAppToast} />
            ) : (
              <CustomerForm onSuccess={() => setCustomerSubTab('crm')} />
            )}
          </div>
        );

      case 'items':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="sub-navigation" style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <button 
                className={`btn ${itemSubTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setItemSubTab('catalog')}
              >
                <Cookie size={16} />
                <span>Product Manager</span>
              </button>
              <button 
                className={`btn ${itemSubTab === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setItemSubTab('add')}
              >
                <Cookie size={16} />
                <span>Define New Product</span>
              </button>
            </div>
            {itemSubTab === 'catalog' ? (
              <ItemDashboard />
            ) : (
              <ItemForm onSuccess={() => setItemSubTab('catalog')} />
            )}
          </div>
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
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => {
        setActiveTab(tab);
        // Reset subtabs when switching main categories
        setOrderSubTab('board');
        setCustomerSubTab('crm');
        setItemSubTab('catalog');
      }} />

      {/* Main Content Area */}
      <main className="content-area">
        {renderContent()}
      </main>

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
    </div>
  );
};

export default App;
