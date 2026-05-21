import React, { useState, useEffect } from 'react';
import { api, Customer, CustomerAnalytics } from '../services/api';
import { 
  Users, 
  MapPin, 
  UserSquare2, 
  MessageSquareShare, 
  Loader, 
  Search, 
  Check, 
  Send,
  X
} from 'lucide-react';
import { ToastMessage } from './WhatsAppToast';

interface CustomerDashboardProps {
  onWhatsAppTriggered: (toast: ToastMessage) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onWhatsAppTriggered }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analytics, setAnalytics] = useState<CustomerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  
  // Promotion Modal States
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [sendingPromo, setSendingPromo] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const custRes = await api.getCustomers();
      setCustomers(custRes);
      const analyticRes = await api.getCustomerAnalytics();
      setAnalytics(analyticRes);
    } catch (err) {
      console.error('Failed to load CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectToggle = (contact: string) => {
    if (selectedContacts.includes(contact)) {
      setSelectedContacts(selectedContacts.filter(c => c !== contact));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const handleSelectAll = (filteredCusts: Customer[]) => {
    const allFilteredContacts = filteredCusts.map(c => c.contact);
    const areAllSelected = allFilteredContacts.every(c => selectedContacts.includes(c));
    
    if (areAllSelected) {
      // Unselect all filtered
      setSelectedContacts(selectedContacts.filter(c => !allFilteredContacts.includes(c)));
    } else {
      // Select all filtered (without duplicating)
      const merged = Array.from(new Set([...selectedContacts, ...allFilteredContacts]));
      setSelectedContacts(merged);
    }
  };

  const handleSendPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedContacts.length === 0 || !promoMessage) {
      alert('Please select recipients and compose a message.');
      return;
    }

    setSendingPromo(true);
    try {
      const response = await api.sendWhatsAppPromotion(selectedContacts, promoMessage);
      
      if (response.success) {
        // Trigger simulation toast showing dispatch message details
        onWhatsAppTriggered({
          id: Math.random().toString(),
          recipient: `${selectedContacts.length} recipients`,
          message: `Campaign Message:\n"${promoMessage}"`,
          templateType: 'Promotion',
          status: 'Simulated',
          timestamp: new Date()
        });

        alert(`Promotion blast dispatched successfully to ${selectedContacts.length} recipients!`);
        setSelectedContacts([]);
        setPromoMessage('');
        setShowPromoModal(false);
      }
    } catch (err: any) {
      alert(`Blast failed: ${err.message}`);
    } finally {
      setSendingPromo(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact.includes(searchQuery) ||
    c.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Customer CRM & Analytics</h2>
          <p className="subtitle" style={{ margin: 0 }}>Understand demographics, track top patrons, and broadcast promotional campaigns.</p>
        </div>
        
        {selectedContacts.length > 0 && (
          <button 
            className="btn btn-primary" 
            onClick={() => setShowPromoModal(true)}
            style={{ backgroundColor: '#25d366', color: 'white' }}
          >
            <MessageSquareShare size={16} />
            <span>Send Promotion ({selectedContacts.length})</span>
          </button>
        )}
      </div>

      {loading && !analytics ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <>
          {/* Charts/Analytics Panel */}
          {analytics && (
            <div className="analytics-grid">
              {/* Total Summary CRM Panel */}
              <div className="glass-panel" style={{ margin: 0, gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid var(--border-color)', paddingRight: '2rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Total Registered Customers</span>
                  <span className="metric-value" style={{ fontSize: '3.5rem' }}>{analytics.totalCustomers}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-primary)' }}>Top Spending Patrons</h3>
                  <div className="data-table-wrapper">
                    <table className="data-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Contact</th>
                          <th>Orders</th>
                          <th>Total Spent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.topCustomers?.length === 0 ? (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-dark)' }}>No orders logged yet</td>
                          </tr>
                        ) : (
                          analytics.topCustomers?.map((tc, idx) => (
                            <tr key={idx}>
                              <td>{tc.name}</td>
                              <td>{tc.contact}</td>
                              <td>{tc.order_count}</td>
                              <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Rs. {parseFloat(tc.total_spent as any).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Geographic Analytics Chart */}
              <div className="glass-panel" style={{ margin: 0 }}>
                <h3>Location Demographics</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {analytics.locations?.map((loc, idx) => {
                    const percentage = analytics.totalCustomers > 0 ? (loc.value / analytics.totalCustomers) * 100 : 0;
                    return (
                      <div key={idx} className="bar-chart-row">
                        <div className="bar-chart-labels">
                          <span>{loc.label}</span>
                          <span style={{ fontWeight: 600 }}>{loc.value} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="bar-chart-outer">
                          <div className="bar-chart-inner" style={{ width: `${percentage}%`, backgroundColor: '#3b82f6' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gender Representation Panel */}
              <div className="glass-panel" style={{ margin: 0 }}>
                <h3>Gender Splits</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {analytics.genders?.map((gen, idx) => {
                    const percentage = analytics.totalCustomers > 0 ? (gen.value / analytics.totalCustomers) * 100 : 0;
                    return (
                      <div key={idx} className="bar-chart-row">
                        <div className="bar-chart-labels">
                          <span>{gen.label}</span>
                          <span style={{ fontWeight: 600 }}>{gen.value} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="bar-chart-outer">
                          <div className="bar-chart-inner" style={{ width: `${percentage}%`, backgroundColor: '#f59e0b' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CRM List View */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <h3>Customer CRM Registry</h3>
              
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '300px' }}>
                <input
                  type="text"
                  placeholder="Filter by name, phone, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '1rem' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-dark)' }} />
              </div>
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        checked={filteredCustomers.length > 0 && filteredCustomers.every(c => selectedContacts.includes(c.contact))}
                        onChange={() => handleSelectAll(filteredCustomers)}
                      />
                    </th>
                    <th>Client Profile</th>
                    <th>Contact Info</th>
                    <th>Gender</th>
                    <th>City / Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-dark)', padding: '2rem' }}>
                        No customers matched filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => (
                      <tr key={cust.id} style={{ backgroundColor: selectedContacts.includes(cust.contact) ? 'rgba(37, 211, 102, 0.03)' : '' }}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(cust.contact)}
                            onChange={() => handleSelectToggle(cust.contact)}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Users size={16} color="var(--color-primary)" />
                            </div>
                            <span style={{ fontWeight: 600 }}>{cust.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{cust.contact}</td>
                        <td>{cust.gender}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                            <MapPin size={14} color="var(--color-text-dark)" />
                            <span>{cust.location}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Promotion Blast Modal */}
      {showPromoModal && (
        <div className="modal-overlay" onClick={() => setShowPromoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPromoModal(false)}>
              <X size={20} />
            </button>
            
            <h2>WhatsApp Promotion Blast</h2>
            <p className="subtitle">Send custom notifications, launch promotions, or broadcast campaign deals.</p>

            <form onSubmit={handleSendPromotion}>
              <div className="form-grid">
                <div className="form-group full-width" style={{ backgroundColor: 'rgba(37, 211, 102, 0.05)', border: '1px solid rgba(37, 211, 102, 0.2)', padding: '1rem', borderRadius: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#25d366' }}>Campaign targets: {selectedContacts.length} Recipients selected</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '0.5rem', maxHeight: '80px', overflowY: 'auto' }}>
                    {selectedContacts.map((contact, idx) => (
                      <span key={idx} style={{ fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>{contact}</span>
                    ))}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="promo-message">WhatsApp Broadcast Body *</label>
                  <textarea
                    id="promo-message"
                    rows={6}
                    placeholder="Hi {Name},\n\nCheck out our weekend special: Buy 2 cookies, get 1 classic biscuit free! 🍪\nUse code KRUNCHY🍪"
                    value={promoMessage}
                    onChange={(e) => setPromoMessage(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group full-width" style={{ marginTop: '0.5rem' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', justifyContent: 'center', backgroundColor: '#25d366', color: 'white' }}
                    disabled={sendingPromo}
                  >
                    {sendingPromo ? (
                      <>
                        <Loader className="animate-spin" size={18} />
                        <span>Broadcasting Campaign...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Dispatch Broadcast Message</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CustomerDashboard;
