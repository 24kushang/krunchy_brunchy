import React from 'react';
import { 
  ShoppingBag, 
  Users, 
  Cookie, 
  Calendar, 
  MessageSquare,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'orders', label: 'Order Hub', icon: ShoppingBag },
    { id: 'customers', label: 'Customer CRM', icon: Users },
    { id: 'items', label: 'Item Catalog', icon: Cookie },
    { id: 'social', label: 'Social Calendar', icon: Calendar },
    { id: 'whatsapp', label: 'WhatsApp Logs', icon: MessageSquare },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-section">
        <span className="brand-emoji">🍪</span>
        <div>
          <span style={{ display: 'block', lineHeight: 1.1 }}>Krunchy</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Admin Portal
          </span>
        </div>
      </div>

      <nav className="nav-links">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <IconComponent size={20} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
          <Sparkles size={12} color="var(--color-primary)" />
          <span>Krunchy Admin</span>
        </div>
        <span>v1.0.0 • Production</span>
      </div>
    </aside>
  );
};
export default Sidebar;
