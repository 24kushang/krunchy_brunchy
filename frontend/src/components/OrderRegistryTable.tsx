import React, { useState, useEffect } from 'react';
import { api, Order } from '../services/api';
import { ToastMessage } from './WhatsAppToast';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
  Button,
  Chip,
  IconButton,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  RefreshCw,
  DollarSign,
  Search,
  Eye,
  TrendingDown,
  TrendingUp,
  MessageSquare
} from 'lucide-react';

interface OrderRegistryTableProps {
  onWhatsAppTriggered: (toast: ToastMessage) => void;
}

type OrderOrderBy = 'id' | 'customer_name' | 'expected_delivery_date' | 'total_price' | 'status' | 'payment_status';
type OrderOrder = 'asc' | 'desc';

export const OrderRegistryTable: React.FC<OrderRegistryTableProps> = ({ onWhatsAppTriggered }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');

  // Sorting
  const [order, setOrder] = useState<OrderOrder>('desc');
  const [orderBy, setOrderBy] = useState<OrderOrderBy>('id');

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

  const handleRequestSort = (property: OrderOrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleUpdateStatus = async (orderId: number, status: Order['status']) => {
    try {
      const res = await api.updateOrderStatus(orderId, status);
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

  const getStatusChipColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Preparing': return 'primary';
      case 'Ready': return 'success';
      case 'Delivered': return 'secondary';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  // Sorting & Filtering Logic
  const filteredOrders = orders.filter((o) => {
    const matchName = o.customer_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      o.id?.toString().includes(searchText);
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    const matchPayment = paymentFilter === 'All' || o.payment_status === paymentFilter;
    return matchName && matchStatus && matchPayment;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let aVal: any = a[orderBy];
    let bVal: any = b[orderBy];

    // Handle string conversion or lowercasing if necessary
    if (orderBy === 'customer_name') {
      aVal = a.customer_name?.toLowerCase() || '';
      bVal = b.customer_name?.toLowerCase() || '';
    } else if (orderBy === 'expected_delivery_date') {
      aVal = new Date(a.expected_delivery_date).getTime();
      bVal = new Date(b.expected_delivery_date).getTime();
    } else if (orderBy === 'total_price') {
      aVal = Number(a.total_price);
      bVal = Number(b.total_price);
    }

    if (aVal < bVal) {
      return order === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return order === 'asc' ? 1 : -1;
    }
    return 0;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }} color="text.primary">Order Registry</Typography>
          <Typography variant="body2" color="text.secondary">
            Search, sort, filter, and modify your baker order records in a tabular view.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          onClick={loadOrders}
          disabled={loading}
          startIcon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
        >
          Refresh Registry
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ fontWeight: 600 }}>
          {error}
        </Typography>
      )}

      {/* Filter panel */}
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Search Customer or Order ID"
              placeholder="e.g. Aarav or 42"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: <Search size={18} style={{ marginRight: 8, opacity: 0.5 }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="order-status-filter-label">Order Status</InputLabel>
              <Select
                labelId="order-status-filter-label"
                id="order-status-filter"
                value={statusFilter}
                label="Order Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Preparing">Preparing</MenuItem>
                <MenuItem value="Ready">Ready to Deliver</MenuItem>
                <MenuItem value="Delivered">Delivered</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="payment-filter-label">Payment Status</InputLabel>
              <Select
                labelId="payment-filter-label"
                id="payment-filter"
                value={paymentFilter}
                label="Payment Status"
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <MenuItem value="All">All Payments</MenuItem>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Unpaid">Unpaid</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table Section */}
      <TableContainer component={Paper}>
        {loading && orders.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <Table aria-label="orders registry table">
            <TableHead>
              <TableRow>
                <TableCell sortDirection={orderBy === 'id' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'id'}
                    direction={orderBy === 'id' ? order : 'asc'}
                    onClick={() => handleRequestSort('id')}
                  >
                    Order ID
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'customer_name' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'customer_name'}
                    direction={orderBy === 'customer_name' ? order : 'asc'}
                    onClick={() => handleRequestSort('customer_name')}
                  >
                    Customer
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'expected_delivery_date' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'expected_delivery_date'}
                    direction={orderBy === 'expected_delivery_date' ? order : 'asc'}
                    onClick={() => handleRequestSort('expected_delivery_date')}
                  >
                    Expected Delivery
                  </TableSortLabel>
                </TableCell>
                <TableCell>Items Ordered</TableCell>
                <TableCell sortDirection={orderBy === 'total_price' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'total_price'}
                    direction={orderBy === 'total_price' ? order : 'asc'}
                    onClick={() => handleRequestSort('total_price')}
                  >
                    Total Price
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'payment_status' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'payment_status'}
                    direction={orderBy === 'payment_status' ? order : 'asc'}
                    onClick={() => handleRequestSort('payment_status')}
                  >
                    Payment
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === 'status' ? order : false}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No order records found matching the filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                sortedOrders.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>#{row.id}</TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{row.customer_name}</Typography>
                      <Typography variant="caption" color="text.secondary">{row.customer_contact}</Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(row.expected_delivery_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {row.expected_delivery_location}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.2 }}>
                        {row.items?.map((it) => (
                          <Typography key={it.id} variant="caption" display="block">
                            • {it.item_name} <Box component="span" sx={{ fontWeight: 600 }}>x{it.quantity}</Box>
                          </Typography>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                      Rs. {row.total_price}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<DollarSign size={12} />}
                        label={row.payment_status}
                        color={row.payment_status === 'Paid' ? 'success' : 'error'}
                        variant="outlined"
                        size="small"
                        onClick={() => handleTogglePayment(row.id!, row.payment_status)}
                        sx={{ cursor: 'pointer', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.status}
                        color={getStatusChipColor(row.status)}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <FormControl size="small" sx={{ minWidth: 110 }}>
                        <Select
                          value={row.status}
                          onChange={(e) => handleUpdateStatus(row.id!, e.target.value as Order['status'])}
                          size="small"
                          sx={{ fontSize: '0.8rem', height: '28px' }}
                        >
                          <MenuItem value="Pending">Pending</MenuItem>
                          <MenuItem value="Preparing">Preparing</MenuItem>
                          <MenuItem value="Ready">Ready</MenuItem>
                          <MenuItem value="Delivered">Delivered</MenuItem>
                          <MenuItem value="Cancelled">Cancelled</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};
export default OrderRegistryTable;
