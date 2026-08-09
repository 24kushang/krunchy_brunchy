import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  Switch,
  FormControlLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PaymentsIcon from '@mui/icons-material/Payments';
import PersonIcon from '@mui/icons-material/Person';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import TimelineIcon from '@mui/icons-material/Timeline';
import api from '../utils/api';

interface Item {
  id: string;
  name: string;
  activePrice: number;
}

interface StatusHistoryItem {
  id?: string;
  status: string;
  changedAt: string;
  changedBy?: string;
}

export default function EditOrder() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Lists for selects
  const [catalogItems, setCatalogItems] = useState<Item[]>([]);
  const [hubsList, setHubsList] = useState<{ id: string; name: string }[]>([]);
  const [sourcesList, setSourcesList] = useState<{ id: string; name: string }[]>([]);

  // Form State
  const [orderNumber, setOrderNumber] = useState('');
  const [orderStatus, setOrderStatus] = useState('Pending');
  
  // Customer Info
  const [customerContact, setCustomerContact] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerGender, setCustomerGender] = useState('Male');
  const [customerLocation, setCustomerLocation] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Fulfillment & Source
  const [orderSource, setOrderSource] = useState('');
  const [fulfillmentHub, setFulfillmentHub] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');

  // Timestamps
  const [createdAt, setCreatedAt] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [paymentUpdatedAt, setPaymentUpdatedAt] = useState('');
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);

  // Payment Details
  const [paymentStatus, setPaymentStatus] = useState('Unpaid');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [cashCollectionDetails, setCashCollectionDetails] = useState('');

  // Items & Pricing
  const [cartItems, setCartItems] = useState<
    { itemId: string; name: string; quantity: number; priceAtOrder: number }[]
  >([]);
  const [selectedAddItem, setSelectedAddItem] = useState('');
  const [overrideTotal, setOverrideTotal] = useState(false);
  const [customTotalAmount, setCustomTotalAmount] = useState('');

  // Helper to format ISO date string to datetime-local input format
  const formatForDateTimeInput = (isoStr?: string | null) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localDate = new Date(d.getTime() - tzOffset);
      return localDate.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    Promise.all([
      api.get(`/api/orders/${id}`),
      api.get('/api/items'),
      api.get('/api/inventories'),
      api.get('/api/order-sources'),
    ])
      .then(([orderRes, itemsRes, invRes, sourcesRes]) => {
        const order = orderRes.data;
        setCatalogItems(itemsRes.data || []);
        setHubsList(invRes.data?.locations || []);
        setSourcesList(sourcesRes.data || []);

        setOrderNumber(order.orderNumber || '');
        setOrderStatus(order.status || 'Pending');

        // Customer
        if (order.customer) {
          setCustomerContact(order.customer.contact || '');
          setCustomerName(order.customer.name || '');
          setCustomerGender(order.customer.gender || 'Male');
          setCustomerLocation(order.customer.location || '');
          setCustomerAddress(order.customer.address || '');
        }

        // Fulfillment & Source
        setOrderSource(order.source?.id || order.source?.name || '');
        setFulfillmentHub(order.fulfillmentHub?.id || order.fulfillmentHub?.name || '');
        setDeliveryLocation(order.deliveryLocation || '');

        // Timestamps
        setCreatedAt(formatForDateTimeInput(order.createdAt));
        setExpectedDeliveryDate(formatForDateTimeInput(order.expectedDeliveryDate));
        setPaymentUpdatedAt(formatForDateTimeInput(order.paymentUpdatedAt));

        // Status History Timestamps
        const formattedHistory = (order.statusHistory || []).map((h: any) => ({
          id: h.id,
          status: h.status,
          changedAt: formatForDateTimeInput(h.changedAt),
          changedBy: h.changedBy || 'Admin',
        }));
        setStatusHistory(formattedHistory);

        // Payment
        setPaymentStatus(order.paymentStatus || 'Unpaid');
        setPaymentMode(order.paymentMode || 'UPI');
        setCashCollectionDetails(order.cashCollectionDetails || '');

        // Items
        const formattedCart = (order.items || []).map((oi: any) => ({
          itemId: oi.item?.id || oi.itemId,
          name: oi.item?.name || 'Unknown Item',
          quantity: oi.quantity || 1,
          priceAtOrder: Number(oi.priceAtOrder) || 0,
        }));
        setCartItems(formattedCart);

        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load order details', err);
        setErrorMsg('Failed to load order details. Please verify order ID.');
        setLoading(false);
      });
  }, [id]);

  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: newQty };
      return updated;
    });
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    setCartItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], priceAtOrder: newPrice };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    if (!selectedAddItem) return;
    const itemObj = catalogItems.find((i) => i.id === selectedAddItem);
    if (!itemObj) return;

    const existingIndex = cartItems.findIndex((ci) => ci.itemId === itemObj.id);
    if (existingIndex >= 0) {
      handleQuantityChange(existingIndex, cartItems[existingIndex].quantity + 1);
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          itemId: itemObj.id,
          name: itemObj.name,
          quantity: 1,
          priceAtOrder: itemObj.activePrice || 0,
        },
      ]);
    }
    setSelectedAddItem('');
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity * item.priceAtOrder, 0);
  };

  const getFinalTotal = () => {
    if (overrideTotal && customTotalAmount.trim() !== '') {
      const val = parseFloat(customTotalAmount);
      if (!isNaN(val)) return val;
    }
    return calculateSubtotal();
  };

  const handleStatusHistoryDateChange = (index: number, newDate: string) => {
    setStatusHistory((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], changedAt: newDate };
      return updated;
    });
  };

  const handleSaveOrder = async () => {
    if (!id) return;
    if (!customerName.trim() || !customerContact.trim()) {
      setErrorMsg('Customer Name and Contact are required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        customerContact,
        customerName,
        customerGender,
        customerLocation,
        customerAddress,
        sourceId: orderSource || undefined,
        fulfillmentHubId: fulfillmentHub || undefined,
        deliveryLocation,
        status: orderStatus,
        createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : null,
        paymentStatus,
        paymentMode: paymentStatus === 'Paid' ? paymentMode : null,
        paymentUpdatedAt: paymentStatus === 'Paid' && paymentUpdatedAt ? new Date(paymentUpdatedAt).toISOString() : null,
        cashCollectionDetails: paymentStatus === 'Paid' && paymentMode === 'Cash' ? cashCollectionDetails : null,
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder,
        })),
        statusHistoryTimestamps: statusHistory
          .filter((h) => h.changedAt)
          .map((h) => ({
            id: h.id,
            status: h.status,
            changedAt: new Date(h.changedAt).toISOString(),
            changedBy: h.changedBy || 'Admin',
          })),
      };

      if (overrideTotal && customTotalAmount.trim() !== '') {
        const val = parseFloat(customTotalAmount);
        if (!isNaN(val)) payload.totalAmount = val;
      }

      await api.put(`/api/orders/${id}`, payload);
      setSuccessMsg('Order details updated successfully!');
      setTimeout(() => {
        navigate('/orders');
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update order', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update order. Check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Stack direction="row" sx={{ justifyContent: 'center', py: 12 }}>
        <CircularProgress color="primary" />
      </Stack>
    );
  }

  return (
    <Box sx={{ pb: 8 }}>
      {/* Top Navigation & Action Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/orders')}
            sx={{ borderRadius: 3 }}
          >
            Back to Orders
          </Button>
          <Box>
            <Typography variant="h4" sx={{ color: '#0A3BB0', fontWeight: 800 }}>
              Edit Order #{orderNumber}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Update transition dates, payment received date, customer details, and item prices.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Chip
            label={orderStatus}
            color={
              orderStatus === 'Delivered'
                ? 'success'
                : orderStatus === 'Cancelled'
                ? 'error'
                : 'primary'
            }
            sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}
          />
          <Button
            variant="contained"
            size="large"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveOrder}
            sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 3, px: 3 }}
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 3 }}>
          {successMsg}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column: Customer & Fulfillment Details */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={3}>
            {/* Customer Details Card */}
            <Card sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: '#0A3BB0', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="primary" /> Customer Profile & Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Contact Number"
                      size="small"
                      fullWidth
                      value={customerContact}
                      onChange={(e) => setCustomerContact(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Customer Name"
                      size="small"
                      fullWidth
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Gender</InputLabel>
                      <Select
                        value={customerGender}
                        label="Gender"
                        onChange={(e) => setCustomerGender(e.target.value)}
                      >
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <TextField
                      label="Location / Area"
                      size="small"
                      fullWidth
                      value={customerLocation}
                      onChange={(e) => setCustomerLocation(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Customer Address"
                      size="small"
                      multiline
                      rows={2}
                      fullWidth
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Fulfillment & Source Card */}
            <Card sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: '#0A3BB0', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShoppingBagIcon color="primary" /> Order Source & Fulfillment Hub
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Order Source</InputLabel>
                      <Select
                        value={orderSource}
                        label="Order Source"
                        onChange={(e) => setOrderSource(e.target.value)}
                      >
                        {sourcesList.map((s) => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Fulfillment Hub</InputLabel>
                      <Select
                        value={fulfillmentHub}
                        label="Fulfillment Hub"
                        onChange={(e) => setFulfillmentHub(e.target.value)}
                      >
                        {hubsList.map((h) => (
                          <MenuItem key={h.id} value={h.id}>
                            {h.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Delivery Location / Address"
                      size="small"
                      fullWidth
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Order Status</InputLabel>
                      <Select
                        value={orderStatus}
                        label="Order Status"
                        onChange={(e) => setOrderStatus(e.target.value)}
                      >
                        <MenuItem value="Pending">Pending</MenuItem>
                        <MenuItem value="Preparing">Preparing</MenuItem>
                        <MenuItem value="Ready to Deliver">Ready to Deliver</MenuItem>
                        <MenuItem value="Delivered">Delivered</MenuItem>
                        <MenuItem value="Cancelled">Cancelled</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Dates & Transition Timeline Section */}
            <Card sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: '#0A3BB0', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayIcon color="primary" /> Order Timestamps & Transition History
                </Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      type="datetime-local"
                      label="Order Placement Timestamp"
                      size="small"
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={createdAt}
                      onChange={(e) => setCreatedAt(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      type="datetime-local"
                      label="Expected Delivery Timestamp"
                      size="small"
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    />
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimelineIcon fontSize="small" /> Status Transition History Timestamps
                </Typography>

                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120' }}>
                  {statusHistory.length === 0 ? (
                    <Typography variant="caption" color="textSecondary">
                      No status transition records logged yet.
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {statusHistory.map((h, idx) => (
                        <Grid container key={h.id || idx} spacing={2} sx={{ alignItems: 'center' }}>
                          <Grid size={{ xs: 12, sm: 4 }}>
                            <Chip
                              label={h.status}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontWeight: 'bold', width: '100%' }}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField
                              type="datetime-local"
                              label={`Transition Date (${h.status})`}
                              size="small"
                              fullWidth
                              slotProps={{ inputLabel: { shrink: true } }}
                              value={h.changedAt}
                              onChange={(e) => handleStatusHistoryDateChange(idx, e.target.value)}
                            />
                          </Grid>
                        </Grid>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Column: Payment & Items Details */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={3}>
            {/* Payment Details Card */}
            <Card sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: '#0A3BB0', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PaymentsIcon color="primary" /> Payment Details & Received Date
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Payment Status</InputLabel>
                      <Select
                        value={paymentStatus}
                        label="Payment Status"
                        onChange={(e) => setPaymentStatus(e.target.value)}
                      >
                        <MenuItem value="Paid">Paid</MenuItem>
                        <MenuItem value="Unpaid">Unpaid</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small" disabled={paymentStatus !== 'Paid'}>
                      <InputLabel>Payment Mode</InputLabel>
                      <Select
                        value={paymentMode}
                        label="Payment Mode"
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <MenuItem value="UPI">UPI</MenuItem>
                        <MenuItem value="Cash">Cash</MenuItem>
                        <MenuItem value="Card">Card</MenuItem>
                        <MenuItem value="Net Banking">Net Banking</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      type="datetime-local"
                      label="Payment Received Timestamp"
                      size="small"
                      fullWidth
                      disabled={paymentStatus !== 'Paid'}
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={paymentUpdatedAt}
                      onChange={(e) => setPaymentUpdatedAt(e.target.value)}
                    />
                  </Grid>

                  {paymentStatus === 'Paid' && paymentMode === 'Cash' && (
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        label="Cash Collection Details"
                        size="small"
                        fullWidth
                        placeholder="e.g. Received at counter by Driver John"
                        value={cashCollectionDetails}
                        onChange={(e) => setCashCollectionDetails(e.target.value)}
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* Items & Order Pricing Card */}
            <Card sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ color: '#0A3BB0', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShoppingBagIcon color="primary" /> Order Items & Unit Pricing
                </Typography>

                {/* Add Item Row */}
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Add Catalog Item</InputLabel>
                    <Select
                      value={selectedAddItem}
                      label="Add Catalog Item"
                      onChange={(e) => setSelectedAddItem(e.target.value)}
                    >
                      {catalogItems.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.name} — Rs. {item.activePrice}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    onClick={handleAddItem}
                    disabled={!selectedAddItem}
                    startIcon={<AddIcon />}
                    sx={{ bgcolor: '#FF5A09', '&:hover': { bgcolor: '#E04E07' }, borderRadius: 2 }}
                  >
                    Add
                  </Button>
                </Stack>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: theme.palette.mode === 'light' ? '#FAF6F0' : '#222120' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Item</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Qty</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>Unit Price (Rs.)</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Del</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cartItems.map((item, idx) => (
                        <TableRow key={item.itemId}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                            {item.name}
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              size="small"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value, 10) || 1)}
                              slotProps={{ htmlInput: { min: 1, style: { textAlign: 'center', padding: '2px 4px' } } }}
                              sx={{ width: 55 }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              type="number"
                              size="small"
                              value={item.priceAtOrder}
                              onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                              slotProps={{ htmlInput: { min: 0, step: '0.01', style: { textAlign: 'right', padding: '2px 4px' } } }}
                              sx={{ width: 85 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {cartItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No items in order. Select an item above to add.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Total Price Override */}
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={overrideTotal}
                        onChange={(e) => setOverrideTotal(e.target.checked)}
                        color="warning"
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        Override Calculated Total Amount
                      </Typography>
                    }
                  />
                  {overrideTotal && (
                    <TextField
                      label="Custom Total Amount (Rs.)"
                      type="number"
                      size="small"
                      fullWidth
                      value={customTotalAmount}
                      onChange={(e) => setCustomTotalAmount(e.target.value)}
                      placeholder="e.g. 450"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Total Order Value:
                  </Typography>
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 800 }}>
                    Rs. {getFinalTotal().toFixed(2)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
