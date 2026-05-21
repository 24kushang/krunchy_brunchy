import React, { useState, useEffect } from 'react';
import { api, Order } from '../services/api';
import { 
  Loader, 
  RefreshCw, 
  Calendar, 
  MapPin, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  PackageCheck
} from 'lucide-react';
import { ToastMessage } from './WhatsAppToast';

interface OrderDashboardProps {
  onWhatsAppTriggered: (toast: ToastMessage) => void;
}

export const OrderDashboard: React.FC<OrderDashboardProps> = ({ onWhatsAppTriggered }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getOrders();
      setOrders(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (orderId: number, status: Order['status']) => {
    try {
      const res = await api.updateOrderStatus(orderId, status);
      
      // Update local state
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: res.order.status } : o));
      
      if (res.whatsapp) {
        onWhatsAppTriggered({
          id: Math.random().toString(),
          recipient: res.whatsapp.recipient,
          message: res.whatsapp.status === 'Sent' || res.whatsapp.status === 'Simulated'
            ? `Your order status was updated to ${status}. Notification dispatched.`
            : `Order status updated to ${status}. WhatsApp notification failed.`,
          templateType: 'OrderReady',
          status: res.whatsapp.status,
          timestamp: new Date()
        });
      }
    } catch (err: any) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  const handleTogglePayment = async (orderId: number, currentPaymentStatus: Order['payment_status']) => {
    const nextStatus: Order['payment_status'] = currentPaymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      const res = await api.updateOrderPaymentStatus(orderId, nextStatus);
      
      // Update local state
      setOrders(orders.map(o => o.id === orderId ? { ...o, payment_status: res.order.payment_status } : o));
      
      if (res.whatsapp) {
        onWhatsAppTriggered({
          id: Math.random().toString(),
          recipient: res.whatsapp.recipient,
          message: `Payment confirmation sent: Thank you for payment of Rs. ${res.order.total_price}.`,
          templateType: 'PaymentSuccess',
          status: res.whatsapp.status,
          timestamp: new Date()
        });
      }
    } catch (err: any) {
      alert(`Error updating payment: ${err.message}`);
    }
  };

  const columns: { status: Order['status']; title: string; color: string }[] = [
    { status: 'Pending', title: 'Pending', color: 'var(--status-pending)' },
    { status: 'Preparing', title: 'Preparing', color: 'var(--status-preparing)' },
    { status: 'Ready', title: 'Ready to Deliver', color: 'var(--status-ready)' },
    { status: 'Delivered', title: 'Delivered', color: 'var(--status-delivered)' },
    { status: 'Cancelled', title: 'Cancelled', color: 'var(--status-cancelled)' }
  ];

  const getStatusBadgeClass = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'badge badge-pending';
      case 'Preparing': return 'badge badge-preparing';
      case 'Ready': return 'badge badge-ready';
      case 'Delivered': return 'badge badge-delivered';
      case 'Cancelled': return 'badge badge-cancelled';
      default: return 'badge';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Order Tracker</h2>
          <p className="subtitle" style={{ margin: 0 }}>Monitor status flows, update payments, and trace notifications.</p>
        </div>
        <button className="btn btn-secondary" onClick={loadOrders} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Board</span>
        </button>
      </div>

      {error && <div style={{ color: 'var(--status-cancelled)', fontWeight: 600 }}>{error}</div>}

      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader className="animate-spin" size={32} style={{ color: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div className="kanban-board">
          {columns.map(col => {
            const colOrders = orders.filter(o => o.status === col.status);
            return (
              <div key={col.status} className="kanban-column">
                <div className="kanban-column-title" style={{ borderBottomColor: col.color }}>
                  <span>{col.title}</span>
                  <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '50px', fontSize: '0.8rem' }}>
                    {colOrders.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {colOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-dark)', padding: '2rem 0', fontSize: '0.8rem' }}>
                      No orders
                    </div>
                  ) : (
                    colOrders.map(order => (
                      <div key={order.id} className="order-card">
                        <div className="order-card-header">
                          <span>#{order.id} via {order.source}</span>
                          <span className={getStatusBadgeClass(order.status)}>{order.status}</span>
                        </div>

                        <div className="order-card-cust">{order.customer_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                          {order.customer_contact}
                        </div>

                        <div className="order-card-items">
                          {order.items?.map(it => (
                            <div key={it.id}>
                              • {it.item_name} <span style={{ color: 'white' }}>x{it.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0', fontSize: '0.85rem' }}>
                          <span className="order-card-price">Rs. {order.total_price}</span>
                          <span 
                            className={`badge ${order.payment_status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}`}
                            onClick={() => handleTogglePayment(order.id!, order.payment_status)}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Click to toggle payment"
                          >
                            <DollarSign size={10} />
                            {order.payment_status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.5rem', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            <span>{new Date(order.expected_delivery_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} />
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                              {order.expected_delivery_location}
                            </span>
                          </div>
                        </div>

                        {/* Order pipeline progression actions */}
                        <div className="order-card-actions">
                          {order.status === 'Pending' && (
                            <>
                              <button 
                                className="card-action-btn"
                                onClick={() => handleUpdateStatus(order.id!, 'Preparing')}
                                style={{ flex: 1 }}
                              >
                                Prepare
                              </button>
                              <button 
                                className="card-action-btn"
                                onClick={() => handleUpdateStatus(order.id!, 'Cancelled')}
                                style={{ borderColor: 'var(--status-cancelled)', color: 'var(--status-cancelled)' }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {order.status === 'Preparing' && (
                            <>
                              <button 
                                className="card-action-btn"
                                onClick={() => handleUpdateStatus(order.id!, 'Ready')}
                                style={{ flex: 1, color: 'var(--status-ready)', borderColor: 'var(--status-ready)' }}
                              >
                                <Truck size={12} style={{ marginRight: '4px' }} />
                                Ready
                              </button>
                              <button 
                                className="card-action-btn"
                                onClick={() => handleUpdateStatus(order.id!, 'Cancelled')}
                                style={{ color: 'var(--status-cancelled)' }}
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {order.status === 'Ready' && (
                            <button 
                              className="card-action-btn"
                              onClick={() => handleUpdateStatus(order.id!, 'Delivered')}
                              style={{ flex: 1, color: 'var(--status-delivered)', borderColor: 'var(--status-delivered)' }}
                            >
                              <PackageCheck size={12} style={{ marginRight: '4px' }} />
                              Complete Delivery
                            </button>
                          )}
                          {order.status === 'Delivered' && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--status-ready)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <CheckCircle2 size={12} /> Delivered
                            </div>
                          )}
                          {order.status === 'Cancelled' && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--status-cancelled)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <XCircle size={12} /> Cancelled
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default OrderDashboard;
