import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Stack,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  useTheme
} from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridSortModel,
  type GridPaginationModel
} from '@mui/x-data-grid';
import LedgerIcon from '@mui/icons-material/ListAlt';
import KanbanIcon from '@mui/icons-material/ViewKanban';
import MoveRightIcon from '@mui/icons-material/ChevronRight';
import MoveLeftIcon from '@mui/icons-material/ChevronLeft';
import RefreshIcon from '@mui/icons-material/Refresh';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import api from '../utils/api';

const OrderStatus = {
  PENDING: 'Pending',
  PREPARING: 'Preparing',
  READY_TO_DELIVER: 'Ready to Deliver',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled' } as const;

type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  source?: { id: string; name: string } | string;
  expectedDeliveryDate?: string;
  deliveryLocation?: string;
  paymentStatus?: string;
  paymentMode?: string;
  cashCollectionDetails?: string;
  paymentUpdatedAt?: string;
  customer: {
    name: string;
    contact: string;
    location: string;
  };
  items: {
    id: string;
    quantity: number;
    priceAtOrder: number;
    item: {
      name: string;
    };
  }[];
}

export default function Orders() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0); // 0 = Kanban, 1 = Ledger
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters (shared & Ledger Specific)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Server-side DataGrid states
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [sortModel, setSortModel] = useState<GridSortModel>([]);

  // Detailed Modal view
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [openDetail, setOpenDetail] = useState(false);

  // Payment status updating states
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid'>('Unpaid');
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Cash' | 'Card' | 'Net Banking'>('UPI');
  const [cashDetails, setCashDetails] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Fetch orders (Ledger vs Kanban)
  const fetchOrders = (silent = false) => {
    if (!silent) setLoading(true);

    // Ledger: Server-side pagination/sorting/filtering
    if (activeTab === 1) {
      const page = paginationModel.page + 1;
      const limit = paginationModel.pageSize;

      let sortBy = 'createdAt';
      let sortOrder = 'DESC';
      if (sortModel.length > 0) {
        sortBy = sortModel[0].field;
        sortOrder = (sortModel[0].sort || 'desc').toUpperCase();
      }

      const params: Record<string, any> = {
        page,
        limit,
        sortBy,
        sortOrder };

      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      api.get('/api/orders', { params })
        .then((res) => {
          setOrders(res.data.data);
          setTotalRows(res.data.total);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    } else {
      // Kanban: Load all active orders (unpaginated, simple filtering)
      const params: Record<string, any> = {};
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      api.get('/api/orders', { params: { ...params, limit: 100 } })
        .then((res) => {
          setOrders(res.data.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, paginationModel, sortModel, statusFilter, startDate, endDate]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOrders();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Update order status PATCH
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    // Optimistic state update in local state for immediate response
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, updatedAt: new Date().toISOString() } : o)),
    );
    try {
      await api.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      fetchOrders(true); // silent background reload to verify
      if (selectedOrder && selectedOrder.id === orderId) {
        // Refresh details modal
        const res = await api.get(`/api/orders/${orderId}`);
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to update status', err);
      fetchOrders(); // full refetch to restore original states on fail
    }
  };

  // Update order payment status
  const handleUpdatePayment = async () => {
    if (!paymentOrder) return;
    setPaymentSubmitting(true);
    try {
      await api.patch(`/api/orders/${paymentOrder.id}/payment`, {
        paymentStatus,
        paymentMode: paymentStatus === 'Paid' ? paymentMode : undefined,
        cashDetails: paymentMode === 'Cash' ? cashDetails : undefined });
      setOpenPaymentDialog(false);
      fetchOrders(true); // silent refresh
      
      // Update selected order details if open
      if (selectedOrder && selectedOrder.id === paymentOrder.id) {
        const res = await api.get(`/api/orders/${paymentOrder.id}`);
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to update payment', err);
      alert('Failed to update payment status');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Drag and Drop implementation for Kanban Board
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, targetStatus: OrderStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      handleUpdateStatus(id, targetStatus);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return { bg: 'rgba(255, 90, 9, 0.1)', fg: '#FF5A09' };
      case OrderStatus.PREPARING: return { bg: 'rgba(10, 59, 176, 0.1)', fg: '#0A3BB0' };
      case OrderStatus.READY_TO_DELIVER: return { bg: 'rgba(156, 39, 176, 0.1)', fg: '#9c27b0' };
      case OrderStatus.DELIVERED: return { bg: 'rgba(76, 175, 80, 0.1)', fg: '#4caf50' };
      case OrderStatus.CANCELLED: return { bg: 'rgba(244, 67, 54, 0.1)', fg: '#f44336' };
    }
  };

  // Ledger grid column definitions
  const columns: GridColDef[] = [
    {
      field: 'orderNumber', headerName: 'Order #', width: 120, renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 800 }}>{params.value}</Typography>
      )
    },
    { field: 'customerName', headerName: 'Customer Name', width: 150, valueGetter: (_value, row) => row.customer?.name || 'N/A' },
    { field: 'customerContact', headerName: 'Contact Info', width: 130, valueGetter: (_value, row) => row.customer?.contact || 'N/A' },
    { field: 'source', headerName: 'Source', width: 100, valueGetter: (_value, row) => (typeof row.source === 'object' ? row.source?.name : row.source) || 'N/A' },
    { field: 'expectedDeliveryDate', headerName: 'Exp Delivery', width: 130, renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'N/A' },
    { field: 'createdAt', headerName: 'Order Date', width: 150, renderCell: (params) => new Date(params.value).toLocaleString() },
    { field: 'itemsCount', headerName: 'Items Count', width: 100, sortable: false, valueGetter: (_value, row) => row.items?.length || 0 },
    {
      field: 'paymentStatus',
      headerName: 'Payment',
      width: 145,
      renderCell: (params) => {
        const isPaid = params.row.paymentStatus === 'Paid';
        return (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', height: '100%' }}>
            <Chip
              label={isPaid ? `Paid (${params.row.paymentMode})` : 'Unpaid'}
              size="small"
              color={isPaid ? 'success' : 'error'}
              variant={isPaid ? 'filled' : 'outlined'}
              sx={{ fontWeight: 'bold' }}
            />
            {!isPaid && (
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  setPaymentOrder(params.row);
                  setPaymentStatus('Paid');
                  setPaymentMode('UPI');
                  setCashDetails('');
                  setOpenPaymentDialog(true);
                }}
              >
                <AttachMoneyIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        );
      }
    },
    {
      field: 'totalAmount', headerName: 'Total Price', width: 130, renderCell: (params) => (
        <Typography variant="body2" color="primary" sx={{ fontWeight: 800 }}>Rs. {parseFloat(params.value).toFixed(2)}</Typography>
      )
    },
    {
      field: 'status', headerName: 'Status', width: 150, renderCell: (params) => {
        const colors = getStatusColor(params.value);
        return (
          <Chip
            label={params.value}
            size="small"
            sx={{ bgcolor: colors?.bg, color: colors?.fg, fontWeight: 'bold' }}
          />
        );
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          onClick={() => {
            setSelectedOrder(params.row);
            setOpenDetail(true);
          }}
          sx={{ border: `1px solid ${theme.palette.divider}`, py: 0.2 }}
        >
          Inspect
        </Button>
      ) },
  ];

  const kanbanColumns = [
    { title: 'Pending', status: OrderStatus.PENDING, color: '#FF5A09' },
    { title: 'Preparing', status: OrderStatus.PREPARING, color: '#0A3BB0' },
    { title: 'Ready to Deliver', status: OrderStatus.READY_TO_DELIVER, color: '#9c27b0' },
    { title: 'Delivered', status: OrderStatus.DELIVERED, color: '#4caf50' },
    { title: 'Cancelled', status: OrderStatus.CANCELLED, color: '#f44336' },
  ];

  /**
   * Returns filtered orders for a kanban column:
   * - General: orders created within the last 7 days
   * - Delivered / Cancelled: additionally hidden if completed/cancelled more than 1 day ago
   *   (updatedAt used when available, otherwise createdAt)
   */
  const getKanbanOrders = (status: OrderStatus) => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const oneDayMs = 1 * 24 * 60 * 60 * 1000;
    const isTerminal = status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED;

    return orders.filter((o) => {
      if (o.status !== status) return false;

      const createdMs = new Date(o.createdAt).getTime();
      // Limit all columns to 7-day window
      if (now - createdMs > sevenDaysMs) return false;

      // For terminal states, also hide if the status was set more than 1 day ago.
      // We use updatedAt when available, otherwise fall back to createdAt.
      if (isTerminal) {
        const terminalMs = o.updatedAt
          ? new Date(o.updatedAt).getTime()
          : createdMs;
        if (now - terminalMs > oneDayMs) return false;
      }

      return true;
    });
  };

  return (
    <Box>
      {/* Top Header Section with Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" sx={{ color: '#0A3BB0', fontWeight: 700 }}>
          Orders Dashboard
        </Typography>
        
        <Tabs
          value={activeTab}
          onChange={(_e, val) => setActiveTab(val)}
          sx={{
            bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120',
            borderRadius: 3,
            p: 0.5,
            minHeight: 0,
            '& .MuiTabs-indicator': { display: 'none' } }}
        >
          <Tab icon={<KanbanIcon sx={{ fontSize: 18 }} />} label="Kanban" sx={{ minHeight: 0, py: 1, borderRadius: 2, '&.Mui-selected': { bgcolor: '#FF5A09', color: '#FFF' } }} />
          <Tab icon={<LedgerIcon sx={{ fontSize: 18 }} />} label="Ledger" sx={{ minHeight: 0, py: 1, borderRadius: 2, '&.Mui-selected': { bgcolor: '#FF5A09', color: '#FFF' } }} />
        </Tabs>
      </Box>

      {/* Filter Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 4, md: 4 }}>
              <TextField
                label="Search order number or customer name..."
                variant="outlined"
                size="small"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>

            {activeTab === 1 && (
              <Grid size={{ xs: 12, sm: 3, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All States</MenuItem>
                    <MenuItem value={OrderStatus.PENDING}>Pending</MenuItem>
                    <MenuItem value={OrderStatus.PREPARING}>Preparing</MenuItem>
                    <MenuItem value={OrderStatus.READY_TO_DELIVER}>Ready to Deliver</MenuItem>
                    <MenuItem value={OrderStatus.DELIVERED}>Delivered</MenuItem>
                    <MenuItem value={OrderStatus.CANCELLED}>Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 5, md: 5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                  type="date"
                  label="From"
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  sx={{ width: '45%' }}
                />
                <Typography color="textSecondary" sx={{ px: 0.5 }}>to</Typography>
                <TextField
                  type="date"
                  label="To"
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  sx={{ width: '45%' }}
                />
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 12, md: 1 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <IconButton onClick={() => fetchOrders()} color="primary" sx={{ border: `1px solid ${theme.palette.divider}` }}>
                <RefreshIcon />
              </IconButton>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Views Container */}
      {loading ? (
        <Stack direction="row" sx={{ justifyContent: 'center', py: 12 }}>
          <CircularProgress color="primary" />
        </Stack>
      ) : activeTab === 0 ? (
        /* Kanban Board View */
        <Box sx={{ overflowX: 'auto', display: 'flex', gap: 2.5, pb: 4, minHeight: '600px', alignItems: 'stretch' }}>
          {kanbanColumns.map((col) => {
            const filteredOrders = getKanbanOrders(col.status);
            return (
              <Box
                key={col.status}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.status)}
                sx={{
                  flex: '0 0 300px',
                  height: '72vh',
                  bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#1A1918',
                  borderRadius: 4,
                  border: `1px solid ${theme.palette.mode === 'light' ? '#EFEAE4' : '#2C2A28'}`,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  overflow: 'hidden' }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color }} />
                    {col.title}
                  </Typography>
                  <Chip label={filteredOrders.length} size="small" sx={{ fontWeight: 'bold', bgcolor: theme.palette.mode === 'light' ? '#FFFFFF' : '#2C2A28' }} />
                </Box>

                <Divider sx={{ mb: 1 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', flexGrow: 1, pb: 2,
                  '&::-webkit-scrollbar': { width: '4px' },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.15)', borderRadius: '4px' } }}>
                  {filteredOrders.map((order) => (
                    <Card
                      key={order.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, order.id)}
                      onClick={() => {
                        setSelectedOrder(order);
                        setOpenDetail(true);
                      }}
                      sx={{
                        cursor: 'grab',
                        bgcolor: theme.palette.background.paper,
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0px 6px 20px rgba(0,0,0,0.06)',
                          border: `1px solid ${col.color}` } }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {order.orderNumber}
                          </Typography>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Chip
                              label={order.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                              size="small"
                              variant={order.paymentStatus === 'Paid' ? 'filled' : 'outlined'}
                              color={order.paymentStatus === 'Paid' ? 'success' : 'error'}
                              sx={{ fontSize: '0.65rem', height: 16, fontWeight: 700 }}
                            />
                            <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 800 }}>
                              Rs. {parseFloat(order.totalAmount as any).toFixed(2)}
                            </Typography>
                          </Stack>
                        </Stack>

                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {order.customer?.name}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                          <Typography variant="caption" color="textSecondary">
                            📞 {order.customer?.contact}
                          </Typography>
                          {order.source && (
                            <Chip
                              label={typeof order.source === 'object' ? order.source.name : order.source}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: '0.65rem',
                                height: 18,
                                borderColor: '#0A3BB0',
                                color: '#0A3BB0',
                                bgcolor: 'rgba(10, 59, 176, 0.04)',
                                fontWeight: 600 }}
                            />
                          )}
                        </Stack>

                        <Divider sx={{ mb: 1 }} />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </Typography>

                          {/* Click-to-move quick actions for mobile accessibility */}
                          <Stack direction="row" spacing={0.5}>
                            {col.status !== OrderStatus.PENDING && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idx = kanbanColumns.findIndex(c => c.status === col.status);
                                  handleUpdateStatus(order.id, kanbanColumns[idx - 1].status);
                                }}
                              >
                                <MoveLeftIcon fontSize="small" />
                              </IconButton>
                            )}
                            {col.status !== OrderStatus.DELIVERED && col.status !== OrderStatus.CANCELLED && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const idx = kanbanColumns.findIndex(c => c.status === col.status);
                                  handleUpdateStatus(order.id, kanbanColumns[idx + 1].status);
                                }}
                              >
                                <MoveRightIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredOrders.length === 0 && (
                    <Box sx={{ border: '1px dashed rgba(120, 120, 120, 0.2)', py: 6, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" color="textSecondary">
                        No orders in this state
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        /* Detailed Paginated Ledger View */
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={orders}
            columns={columns}
            rowCount={totalRows}
            loading={loading}
            paginationMode="server"
            sortingMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sortModel={sortModel}
            onSortModelChange={setSortModel}
            pageSizeOptions={[5, 10, 20]}
            disableRowSelectionOnClick
            sx={{
              bgcolor: theme.palette.background.paper,
              borderRadius: 4,
              border: `1px solid ${theme.palette.mode === 'light' ? '#EFEAE4' : '#2C2A28'}`,
              '& .MuiDataGrid-columnHeader': {
                bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120',
                fontWeight: 'bold' } }}
          />
        </Box>
      )}

      {/* Inspect Order Details Dialog */}
      <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
        {selectedOrder && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Typography variant="h5" sx={{ color: '#0A3BB0' }}>
                Order Details ({selectedOrder.orderNumber})
              </Typography>
              <Chip
                label={selectedOrder.status}
                sx={{
                  bgcolor: getStatusColor(selectedOrder.status)?.bg,
                  color: getStatusColor(selectedOrder.status)?.fg,
                  fontWeight: 'bold'
                }}
              />
            </DialogTitle>
            <DialogContent sx={{ py: 3 }}>
              {/* Customer Segment */}
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800, mb: 1.5 }}>
                Customer Information
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Name</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.customer?.name}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Contact</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.customer?.contact}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Location</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.customer?.location}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Date Logged</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{new Date(selectedOrder.createdAt).toLocaleString()}</Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Order Source</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {typeof selectedOrder.source === 'object' ? (selectedOrder.source as any)?.name : selectedOrder.source || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Expected Delivery Date</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {selectedOrder.expectedDeliveryDate ? new Date(selectedOrder.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption" color="textSecondary">Expected Location of Delivery</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.deliveryLocation || 'N/A'}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 3 }} />

              {/* Payment Segment */}
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800, mb: 1.5 }}>
                Payment Information
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={6}>
                  <Typography variant="caption" color="textSecondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedOrder.paymentStatus || 'Unpaid'}
                      size="small"
                      color={selectedOrder.paymentStatus === 'Paid' ? 'success' : 'error'}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                </Grid>
                {selectedOrder.paymentStatus === 'Paid' && (
                  <>
                    <Grid size={6}>
                      <Typography variant="caption" color="textSecondary">Payment Mode</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.paymentMode || 'N/A'}</Typography>
                    </Grid>
                    {selectedOrder.paymentMode === 'Cash' && (
                      <Grid size={12}>
                        <Typography variant="caption" color="textSecondary">Cash Collected At</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.cashCollectionDetails || 'N/A'}</Typography>
                      </Grid>
                    )}
                    <Grid size={12}>
                      <Typography variant="caption" color="textSecondary">Payment Recorded At</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {selectedOrder.paymentUpdatedAt ? new Date(selectedOrder.paymentUpdatedAt).toLocaleString() : 'N/A'}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>

              <Divider sx={{ mb: 3 }} />

              {/* Items Segment */}
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800, mb: 1.5 }}>
                Order Items
              </Typography>
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                {selectedOrder.items?.map((item) => (
                  <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.item?.name}</Typography>
                      <Typography variant="caption" color="textSecondary">{item.quantity} x Rs. {parseFloat(item.priceAtOrder as any).toFixed(2)}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      Rs. {(item.quantity * parseFloat(item.priceAtOrder as any)).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Total Amount:</Typography>
                <Typography variant="h6" color="primary" sx={{ fontWeight: 900 }}>Rs. {parseFloat(selectedOrder.totalAmount as any).toFixed(2)}</Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
              {/* Quick Status Modifiers */}
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {selectedOrder.status !== OrderStatus.DELIVERED && selectedOrder.status !== OrderStatus.CANCELLED && (
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Advance Status</InputLabel>
                    <Select
                      label="Advance Status"
                      value=""
                      onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value as OrderStatus)}
                    >
                      <MenuItem value={OrderStatus.PREPARING}>Preparing</MenuItem>
                      <MenuItem value={OrderStatus.READY_TO_DELIVER}>Ready to Deliver</MenuItem>
                      <MenuItem value={OrderStatus.DELIVERED}>Delivered</MenuItem>
                      <MenuItem value={OrderStatus.CANCELLED}>Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                )}

                {selectedOrder.paymentStatus !== 'Paid' && (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<AttachMoneyIcon />}
                    onClick={() => {
                      setPaymentOrder(selectedOrder);
                      setPaymentStatus('Paid');
                      setPaymentMode('UPI');
                      setCashDetails('');
                      setOpenPaymentDialog(true);
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    Mark Paid
                  </Button>
                )}
              </Stack>

              <Button variant="outlined" onClick={() => setOpenDetail(false)} sx={{ borderRadius: 3 }}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Record Order Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#0A3BB0', borderBottom: `1px solid ${theme.palette.divider}` }}>
          Record Order Payment
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Status</InputLabel>
              <Select
                value={paymentStatus}
                label="Payment Status"
                onChange={(e) => setPaymentStatus(e.target.value as any)}
              >
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Unpaid">Unpaid</MenuItem>
              </Select>
            </FormControl>

            {paymentStatus === 'Paid' && (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Mode</InputLabel>
                  <Select
                    value={paymentMode}
                    label="Payment Mode"
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                  >
                    <MenuItem value="UPI">UPI</MenuItem>
                    <MenuItem value="Cash">Cash</MenuItem>
                    <MenuItem value="Card">Card</MenuItem>
                    <MenuItem value="Net Banking">Net Banking</MenuItem>
                  </Select>
                </FormControl>

                {paymentMode === 'Cash' && (
                  <TextField
                    label="Where was Cash collected?"
                    placeholder="e.g. Counter Register A, Rider Ramesh"
                    value={cashDetails}
                    onChange={(e) => setCashDetails(e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 3, py: 2 }}>
          <Button onClick={() => setOpenPaymentDialog(false)} variant="outlined" sx={{ borderRadius: 3 }}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdatePayment}
            variant="contained"
            disabled={paymentSubmitting || (paymentStatus === 'Paid' && paymentMode === 'Cash' && !cashDetails.trim())}
            sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3 }}
          >
            {paymentSubmitting ? 'Saving...' : 'Save Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
