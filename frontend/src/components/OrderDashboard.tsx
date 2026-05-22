import React, { useState, useEffect } from 'react';
import { api, Order } from '../services/api';
import {
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
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

  const columns: { status: Order['status']; title: string; colorKey: 'warning' | 'info' | 'success' | 'secondary' | 'error' }[] = [
    { status: 'Pending', title: 'Pending', colorKey: 'warning' },
    { status: 'Preparing', title: 'Preparing', colorKey: 'info' },
    { status: 'Ready', title: 'Ready to Deliver', colorKey: 'success' },
    { status: 'Delivered', title: 'Delivered', colorKey: 'secondary' },
    { status: 'Cancelled', title: 'Cancelled', colorKey: 'error' }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }} color="text.primary">
            Order Tracker
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor status flows, update payments, and trace notifications.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          onClick={loadOrders}
          disabled={loading}
          startIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
        >
          Refresh Board
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ fontWeight: 600 }}>
          {error}
        </Typography>
      )}

      {loading && orders.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress size={36} color="primary" />
        </Box>
      ) : (
        <Grid container spacing={2.5} sx={{ overflowX: 'auto', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          {columns.map(col => {
            const colOrders = orders.filter(o => o.status === col.status);
            return (
              <Grid
                item
                key={col.status}
                xs={12}
                md={2.4}
                sx={{
                  minWidth: { xs: '100%', sm: 260 },
                  flexShrink: 0
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    height: '100%',
                    minHeight: '70vh',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.015)',
                    borderTop: '4px solid',
                    borderColor: `${col.colorKey}.main`
                  }}
                >
                  {/* Column Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {col.title}
                    </Typography>
                    <Chip
                      label={colOrders.length}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        height: 20,
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                      }}
                    />
                  </Box>

                  {/* Cards Container */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flexGrow: 1, overflowY: 'auto' }}>
                    {colOrders.length === 0 ? (
                      <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                        <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
                          No orders
                        </Typography>
                      </Box>
                    ) : (
                      colOrders.map(order => (
                        <Card
                          key={order.id}
                          elevation={2}
                          sx={{
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            overflow: 'visible',
                            transition: 'transform 0.2s',
                            '&:hover': {
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                            {/* Card Top */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                #{order.id} via {order.source}
                              </Typography>
                              <Chip
                                label={order.status}
                                size="small"
                                color={col.colorKey}
                                sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700 }}
                              />
                            </Box>

                            {/* Customer Details */}
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                {order.customer_name}
                              </Typography>
                              <Typography variant="caption" color="primary.main" sx={{ fontWeight: 650 }}>
                                {order.customer_contact}
                              </Typography>
                            </Box>

                            {/* Item List */}
                            <Box sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                              py: 0.75,
                              borderTop: '1px solid',
                              borderBottom: '1px solid',
                              borderColor: 'divider'
                            }}>
                              {order.items?.map(it => (
                                <Typography key={it.id} variant="caption" sx={{ color: 'text.secondary', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>• {it.item_name}</span>
                                  <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>x{it.quantity}</Box>
                                </Typography>
                              ))}
                            </Box>

                            {/* Price and Payment Toggle */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                                Rs. {order.total_price}
                              </Typography>
                              <Chip
                                icon={<DollarSign size={10} style={{ marginRight: -2 }} />}
                                label={order.payment_status}
                                color={order.payment_status === 'Paid' ? 'success' : 'error'}
                                size="small"
                                onClick={() => handleTogglePayment(order.id!, order.payment_status)}
                                sx={{ cursor: 'pointer', height: 20, fontSize: '0.75rem', fontWeight: 700 }}
                                title="Click to toggle payment"
                              />
                            </Box>

                            {/* Expected Delivery details */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Calendar size={12} />
                                <Box component="span">
                                  {new Date(order.expected_delivery_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </Box>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <MapPin size={12} />
                                <Box
                                  component="span"
                                  sx={{
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '150px'
                                  }}
                                  title={order.expected_delivery_location}
                                >
                                  {order.expected_delivery_location}
                                </Box>
                              </Box>
                            </Box>

                            {/* Progression actions */}
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              {order.status === 'Pending' && (
                                <>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    color="primary"
                                    onClick={() => handleUpdateStatus(order.id!, 'Preparing')}
                                    sx={{ flexGrow: 1, py: 0.25, fontSize: '0.75rem' }}
                                  >
                                    Prepare
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    onClick={() => handleUpdateStatus(order.id!, 'Cancelled')}
                                    sx={{ py: 0.25, fontSize: '0.75rem' }}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {order.status === 'Preparing' && (
                                <>
                                  <Button
                                    variant="contained"
                                    size="small"
                                    color="success"
                                    onClick={() => handleUpdateStatus(order.id!, 'Ready')}
                                    startIcon={<Truck size={10} />}
                                    sx={{ flexGrow: 1, py: 0.25, fontSize: '0.75rem' }}
                                  >
                                    Ready
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    onClick={() => handleUpdateStatus(order.id!, 'Cancelled')}
                                    sx={{ py: 0.25, fontSize: '0.75rem' }}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              )}
                              {order.status === 'Ready' && (
                                <Button
                                  variant="contained"
                                  size="small"
                                  color="secondary"
                                  onClick={() => handleUpdateStatus(order.id!, 'Delivered')}
                                  startIcon={<PackageCheck size={10} />}
                                  sx={{ flexGrow: 1, py: 0.25, fontSize: '0.75rem' }}
                                >
                                  Complete Delivery
                                </Button>
                              )}
                              {order.status === 'Delivered' && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main', fontWeight: 700, fontSize: '0.75rem' }}>
                                  <CheckCircle2 size={12} /> Delivered
                                </Box>
                              )}
                              {order.status === 'Cancelled' && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'error.main', fontWeight: 700, fontSize: '0.75rem' }}>
                                  <XCircle size={12} /> Cancelled
                                </Box>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default OrderDashboard;
