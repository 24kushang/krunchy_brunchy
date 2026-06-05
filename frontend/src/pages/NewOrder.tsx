import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Autocomplete,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Alert,
  Backdrop,
  Chip,
  useTheme,
  InputLabel,
  Switch
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import SuccessIcon from '@mui/icons-material/CheckCircle';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import api from '../utils/api';
import { gsap } from 'gsap';

interface Item {
  id: string;
  name: string;
  ingredients: string[];
  bestBeforeDays: number;
  imageUrl: string;
  activePrice: number;
}

interface Customer {
  id: string;
  name: string;
  contact: string;
  gender: string;
  location: string;
  address?: string;
}

export default function NewOrder() {
  const theme = useTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Selection amounts: itemId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});

  // Customer search & details states
  const [searchQuery, setSearchQuery] = useState('');
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Editable Customer fields
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerGender, setCustomerGender] = useState('Male');
  const [customerLocation, setCustomerLocation] = useState('Mumbai');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(true);

  // Order Details
  const [orderSource, setOrderSource] = useState('Phone');
  const [fulfillmentHub, setFulfillmentHub] = useState('Hub West');
  const [hubsList, setHubsList] = useState<{ id: string; name: string }[]>([
    { id: 'Hub West', name: 'Hub West' },
    { id: 'Hub South', name: 'Hub South' }
  ]);
  const [sourcesList, setSourcesList] = useState<{ id: string; name: string }[]>([]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [orderStatus, setOrderStatus] = useState('Pending');

  // Past Order States
  const [isPastOrder, setIsPastOrder] = useState(false);
  const [pastOrderDate, setPastOrderDate] = useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [pastPaymentStatus, setPastPaymentStatus] = useState('Unpaid');
  const [pastPaymentMode, setPastPaymentMode] = useState('UPI');
  const [pastCashDetails, setPastCashDetails] = useState('');
  const [itemPriceOverrides, setItemPriceOverrides] = useState<Record<string, number>>({});
  const [overrideTotalPrice, setOverrideTotalPrice] = useState(false);
  const [customTotalPrice, setCustomTotalPrice] = useState('');

  // Submission / Alert feedback
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState('');

  const successBoxRef = useRef<HTMLDivElement>(null);

  // Fetch items and configurations
  useEffect(() => {
    api.get('/api/items')
      .then((res) => {
        setItems(res.data);
        setLoadingItems(false);
      })
      .catch((err) => {
        console.error('Failed to load items', err);
        setLoadingItems(false);
      });

    Promise.all([
      api.get('/api/inventories'),
      api.get('/api/order-sources')
    ]).then(([invRes, sourceRes]) => {
      const hubs = invRes.data.locations || [];
      const sources = sourceRes.data || [];
      if (hubs.length > 0) {
        setHubsList(hubs);
        setFulfillmentHub(hubs[0].id);
      }
      if (sources.length > 0) {
        setSourcesList(sources);
        setOrderSource(sources[0].id);
      }
    }).catch(err => {
      console.error('Failed to load configurations', err);
    });
  }, []);

  // Debounced customer search (300ms) for Quick Lookup dropdown
  useEffect(() => {
    if (!searchQuery.trim()) {
      setCustomersList([]);
      return;
    }
    console.log("search query is ", searchQuery)

    setLoadingCustomers(true);
    const delayDebounceFn = setTimeout(() => {
      api.get(`/api/customers?search=${encodeURIComponent(searchQuery)}`)
        .then((res) => {
          setCustomersList(res.data);
          setLoadingCustomers(false);
        })
        .catch((err) => {
          console.error(err);
          setLoadingCustomers(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Debounced match for manual Contact field typing (500ms)
  useEffect(() => {
    if (!customerContact.trim() || selectedCustomer?.contact === customerContact) {
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      api.get(`/api/customers/lookup?contact=${encodeURIComponent(customerContact)}`)
        .then((res) => {
          const exactMatch = res.data.find((c: Customer) => c.contact === customerContact);
          if (exactMatch) {
            setSelectedCustomer(exactMatch);
            setCustomerName(exactMatch.name);
            setCustomerGender(exactMatch.gender);
            setCustomerLocation(exactMatch.location);
            setCustomerAddress(exactMatch.address || '');
            setIsNewCustomer(false);
          } else {
            setSelectedCustomer(null);
            setIsNewCustomer(true);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [customerContact, selectedCustomer]);

  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setCustomerName(customer.name);
      setCustomerContact(customer.contact);
      setCustomerGender(customer.gender);
      setCustomerLocation(customer.location);
      setCustomerAddress(customer.address || '');
      setIsNewCustomer(false);
    } else {
      setCustomerName('');
      setCustomerContact('');
      setCustomerGender('Male');
      setCustomerLocation('');
      setCustomerAddress('');
      setIsNewCustomer(true);
    }
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const updated = Math.max(0, current + delta);
      const nextCart = { ...prev };
      if (updated === 0) {
        delete nextCart[itemId];
      } else {
        nextCart[itemId] = updated;
      }
      return nextCart;
    });
  };

  const calculateCartTotal = () => {
    return items.reduce((sum, item) => {
      const qty = cart[item.id] || 0;
      const unitPrice = itemPriceOverrides[item.id] !== undefined ? itemPriceOverrides[item.id] : item.activePrice;
      return sum + (unitPrice * qty);
    }, 0);
  };

  const getFinalTotal = () => {
    if (overrideTotalPrice && customTotalPrice.trim() !== '') {
      const val = parseFloat(customTotalPrice);
      return isNaN(val) ? calculateCartTotal() : val;
    }
    return calculateCartTotal();
  };

  const handleCheckout = async () => {
    if (calculateCartTotal() === 0) {
      setErrorMsg('Cannot place order. Cart is empty!');
      return;
    }

    if (!customerContact.trim()) {
      setErrorMsg('Please specify Customer Contact number.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Please specify Customer Name.');
      return;
    }

    if (!deliveryLocation.trim()) {
      setErrorMsg('Please specify Expected Location of Delivery.');
      return;
    }

    if (isPastOrder && pastPaymentStatus === 'Paid' && pastPaymentMode === 'Cash' && !pastCashDetails.trim()) {
      setErrorMsg('Please specify where cash was collected.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload: any = {
      customerContact,
      customerName,
      customerGender,
      customerLocation,
      customerAddress,
      sourceId: orderSource || undefined,
      fulfillmentHubId: fulfillmentHub || undefined,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      deliveryLocation,
      status: orderStatus,
      items: Object.keys(cart).map((itemId) => {
        const itemReq: any = {
          itemId,
          quantity: cart[itemId],
        };
        if (isPastOrder && itemPriceOverrides[itemId] !== undefined) {
          itemReq.priceAtOrder = itemPriceOverrides[itemId];
        }
        return itemReq;
      }),
    };

    if (isPastOrder) {
      payload.createdAt = pastOrderDate;
      payload.paymentStatus = pastPaymentStatus;
      if (pastPaymentStatus === 'Paid') {
        payload.paymentMode = pastPaymentMode;
        if (pastPaymentMode === 'Cash') {
          payload.cashCollectionDetails = pastCashDetails;
        }
      }
      if (overrideTotalPrice && customTotalPrice.trim() !== '') {
        const val = parseFloat(customTotalPrice);
        if (!isNaN(val)) {
          payload.totalAmount = val;
        }
      }
    }

    try {
      const res = await api.post('/api/orders', payload);
      setCreatedOrderNumber(res.data.orderNumber);

      // Success GSAP Animation
      setShowSuccess(true);
      setTimeout(() => {
        if (successBoxRef.current) {
          gsap.fromTo(successBoxRef.current,
            { scale: 0.8, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }
          );
        }
      }, 50);

      // Reset form states
      setCart({});
      setCustomerContact('');
      setCustomerName('');
      setCustomerGender('Male');
      setCustomerLocation('');
      setCustomerAddress('');
      setSelectedCustomer(null);
      setSearchQuery('');
      if (sourcesList.length > 0) setOrderSource(sourcesList[0].id);
      if (hubsList.length > 0) setFulfillmentHub(hubsList[0].id);
      setExpectedDeliveryDate('');
      setDeliveryLocation('');
      setOrderStatus('Pending');
      setIsNewCustomer(true);

      // Reset past order states
      setIsPastOrder(false);
      setPastPaymentStatus('Unpaid');
      setPastPaymentMode('UPI');
      setPastCashDetails('');
      setItemPriceOverrides({});
      setOverrideTotalPrice(false);
      setCustomTotalPrice('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Checkout failed. Check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ pb: 6 }}>
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Card sx={{ mb: 3, border: isPastOrder ? '2px dashed #FF5A09' : '1px solid #EFEAE4', bgcolor: isPastOrder ? 'rgba(255, 90, 9, 0.02)' : 'background.paper', borderRadius: 4 }}>
        <CardContent sx={{ py: 2, px: 3, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontFamily: '"Fredoka", sans-serif', color: isPastOrder ? '#FF5A09' : '#0A3BB0', fontWeight: 700 }}>
                Order Mode: {isPastOrder ? 'Recording Historical Past Order' : 'Creating New Live Order'}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                {isPastOrder
                  ? 'Manually enter historical details: backdated order time, customized item prices, custom final invoice amount, and direct payment tracking.'
                  : 'Place a new live order with current timestamp, default active pricing, and standard unpaid status.'}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isPastOrder}
                  onChange={(e) => setIsPastOrder(e.target.checked)}
                  color="warning"
                />
              }
              label={
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: isPastOrder ? '#FF5A09' : 'textSecondary' }}>
                  Record Past Order
                </Typography>
              }
            />
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left Column: Customer Form & Item Selector */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Customer Lookup Card */}
          <Card sx={{ mb: 3, overflow: 'visible' }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#0A3BB0', mb: 2 }}>
                1. Customer Details
              </Typography>

              <Autocomplete
                options={customersList}
                getOptionLabel={(option) => `${option.name} (${option.contact})`}
                onInputChange={(_event, newValue) => {
                  setSearchQuery(newValue);
                }}
                onChange={(_event, newValue) => {
                  handleSelectCustomer(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Quick Lookup (Search Existing Customer by Name or Contact)"
                    variant="outlined"
                    fullWidth
                    placeholder="Type name or phone number..."
                    slotProps={{
                      ...params.slotProps,
                      input: {
                        ...params.slotProps.input,
                        endAdornment: (
                          <React.Fragment>
                            {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.slotProps.input.endAdornment}
                          </React.Fragment>
                        ),
                      }
                    }}
                  />
                )}
                sx={{ mb: 3 }}
              />

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Customer Name"
                    fullWidth
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (selectedCustomer && selectedCustomer.name !== e.target.value) {
                        setSelectedCustomer(null);
                        setIsNewCustomer(true);
                      }
                    }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Customer Contact Number"
                    fullWidth
                    value={customerContact}
                    onChange={(e) => {
                      setCustomerContact(e.target.value);
                      if (selectedCustomer && selectedCustomer.contact !== e.target.value) {
                        setSelectedCustomer(null);
                        setIsNewCustomer(true);
                      }
                    }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth>
                    <FormLabel sx={{ fontSize: '0.85rem', fontWeight: 700, mb: 0.5 }}>Gender</FormLabel>
                    <RadioGroup
                      row
                      value={customerGender}
                      onChange={(e) => {
                        setCustomerGender(e.target.value);
                        if (selectedCustomer && selectedCustomer.gender !== e.target.value) {
                          setSelectedCustomer(null);
                          setIsNewCustomer(true);
                        }
                      }}
                    >
                      <FormControlLabel value="Male" control={<Radio size="small" />} label="Male" />
                      <FormControlLabel value="Female" control={<Radio size="small" />} label="Female" />
                      <FormControlLabel value="Other" control={<Radio size="small" />} label="Other" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Location / City"
                    fullWidth
                    size="small"
                    value={customerLocation}
                    onChange={(e) => {
                      setCustomerLocation(e.target.value);
                      if (selectedCustomer && selectedCustomer.location !== e.target.value) {
                        setSelectedCustomer(null);
                        setIsNewCustomer(true);
                      }
                    }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Customer Address (for future reference)"
                    fullWidth
                    multiline
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => {
                      setCustomerAddress(e.target.value);
                      if (selectedCustomer && selectedCustomer.address !== e.target.value) {
                        setSelectedCustomer(null);
                        setIsNewCustomer(true);
                      }
                    }}
                    placeholder="Enter customer address..."
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                {isNewCustomer ? (
                  <Chip
                    icon={<PersonAddIcon />}
                    label="New Profile Registering Automatically"
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                  />
                ) : (
                  <Chip
                    label="Linked to Database Customer Profile"
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                  />
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Delivery Details Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#0A3BB0', mb: 2 }}>
                2. Delivery & Order Options
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Source of Order</InputLabel>
                    <Select
                      value={orderSource}
                      label="Source of Order"
                      onChange={(e) => setOrderSource(e.target.value)}
                    >
                      {sourcesList.map((src) => (
                        <MenuItem key={src.id} value={src.id}>{src.name}</MenuItem>
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
                      {hubsList.map((hub) => (
                        <MenuItem key={hub.id} value={hub.id}>{hub.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Expected Delivery Date"
                    type="date"
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Expected Location of Delivery / Detailed Address"
                    fullWidth
                    multiline
                    rows={2}
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder="Enter delivery address..."
                    required
                  />
                </Grid>

                {isPastOrder && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        label="Historical Order Date & Time"
                        type="datetime-local"
                        fullWidth
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                        value={pastOrderDate}
                        onChange={(e) => setPastOrderDate(e.target.value)}
                        required
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="past-payment-status-label">Payment Status</InputLabel>
                        <Select
                          labelId="past-payment-status-label"
                          id="past-payment-status-select"
                          value={pastPaymentStatus}
                          label="Payment Status"
                          onChange={(e) => setPastPaymentStatus(e.target.value)}
                        >
                          <MenuItem value="Unpaid">Unpaid</MenuItem>
                          <MenuItem value="Paid">Paid</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    {pastPaymentStatus === 'Paid' && (
                      <>
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel id="past-payment-mode-label">Payment Mode</InputLabel>
                            <Select
                              labelId="past-payment-mode-label"
                              id="past-payment-mode-select"
                              value={pastPaymentMode}
                              label="Payment Mode"
                              onChange={(e) => setPastPaymentMode(e.target.value)}
                            >
                              <MenuItem value="UPI">UPI (Online)</MenuItem>
                              <MenuItem value="Cash">Cash</MenuItem>
                              <MenuItem value="Card">Card Reader</MenuItem>
                              <MenuItem value="Net Banking">Net Banking</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        {pastPaymentMode === 'Cash' && (
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              label="Where was Cash collected?"
                              placeholder="e.g. Counter Register A, Rider Rahul"
                              fullWidth
                              size="small"
                              value={pastCashDetails}
                              onChange={(e) => setPastCashDetails(e.target.value)}
                              required
                            />
                          </Grid>
                        )}
                      </>
                    )}
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Visual Grid Selector */}
          <Typography variant="h5" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#0A3BB0', mb: 2, px: 1 }}>
            3. Choose Items
          </Typography>

          {loadingItems ? (
            <Stack direction="row" sx={{ justifyContent: 'center', py: 6 }}>
              <CircularProgress color="primary" />
            </Stack>
          ) : (
            <Grid container spacing={2.5}>
              {items.map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
                    <Card
                      sx={{
                        p: 2,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'border 0.2s',
                        border: qty > 0 ? '2px solid #FF5A09' : '1px solid #EFEAE4',
                        bgcolor: qty > 0 ? 'rgba(255, 90, 9, 0.01)' : 'background.paper',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontFamily: '"Fredoka", sans-serif', fontWeight: 700 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 800, mt: 0.5 }}>
                          Rs. {item.activePrice.toFixed(2)}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <IconButton
                          onClick={() => updateCartQty(item.id, -1)}
                          disabled={qty === 0}
                          size="small"
                          sx={{
                            bgcolor: 'action.selected',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>

                        <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>
                          {qty}
                        </Typography>

                        <IconButton
                          onClick={() => updateCartQty(item.id, 1)}
                          size="small"
                          sx={{
                            bgcolor: '#FF5A09',
                            color: '#FFF',
                            '&:hover': { bgcolor: '#E04E07' },
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Grid>

        {/* Right Column: Sticky Checkout Bill */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: 'sticky', top: 90 }}>
            <Card sx={{ border: '2px solid #0A3BB0' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#0A3BB0', mb: 3 }}>
                  Checkout Summary
                </Typography>

                <Stack spacing={2} sx={{ mb: 3 }}>
                  {items.map((item) => {
                    const qty = cart[item.id] || 0;
                    if (qty === 0) return null;
                    const unitPrice = itemPriceOverrides[item.id] !== undefined ? itemPriceOverrides[item.id] : item.activePrice;
                    return (
                      <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flexGrow: 1, mr: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {item.name}
                          </Typography>
                          {isPastOrder ? (
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                              <Typography variant="caption" color="textSecondary">
                                {qty} x Rs.
                              </Typography>
                              <TextField
                                type="number"
                                size="small"
                                variant="standard"
                                value={itemPriceOverrides[item.id] !== undefined ? itemPriceOverrides[item.id] : item.activePrice}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setItemPriceOverrides(prev => ({
                                    ...prev,
                                    [item.id]: isNaN(val) ? 0 : val
                                  }));
                                }}
                                slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                                sx={{ width: 60, '& input': { fontSize: '0.8rem', py: 0.2 } }}
                              />
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="textSecondary">
                              {qty} x Rs. {item.activePrice}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                          Rs. {(unitPrice * qty).toFixed(2)}
                        </Typography>
                      </Box>
                    );
                  })}

                  {calculateCartTotal() === 0 && (
                    <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 3 }}>
                      No items selected. Select quantities from the catalog.
                    </Typography>
                  )}
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {isPastOrder && (
                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={overrideTotalPrice}
                          onChange={(e) => setOverrideTotalPrice(e.target.checked)}
                          color="warning"
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          Override Final Total Price
                        </Typography>
                      }
                    />
                    {overrideTotalPrice && (
                      <TextField
                        label="Override Total Price (Rs.)"
                        type="number"
                        size="small"
                        fullWidth
                        value={customTotalPrice}
                        onChange={(e) => setCustomTotalPrice(e.target.value)}
                        placeholder="e.g. 500"
                        sx={{ mt: 1 }}
                        slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
                        required
                      />
                    )}
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Total Amount:
                  </Typography>
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 800 }}>
                    Rs. {getFinalTotal().toFixed(2)}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  fullWidth
                  disabled={calculateCartTotal() === 0 || submitting}
                  onClick={handleCheckout}
                  startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <CheckoutIcon />}
                  sx={{
                    bgcolor: '#0A3BB0',
                    py: 1.5,
                    fontSize: '1rem',
                    borderRadius: 4,
                    '&:hover': {
                      bgcolor: '#08308D',
                    },
                  }}
                >
                  {submitting ? 'Creating Order...' : 'Complete Checkout'}
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Success Modal Overlay (GSAP animated) */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, backdropFilter: 'blur(10px)' }}
        open={showSuccess}
      >
        <Box
          ref={successBoxRef}
          sx={{
            bgcolor: theme.palette.mode === 'light' ? '#FFFFFF' : '#1A1918',
            color: theme.palette.mode === 'light' ? '#221D1A' : '#FAF6F0',
            p: 4,
            borderRadius: 6,
            maxWidth: 400,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0px 24px 60px rgba(0, 0, 0, 0.3)',
            border: '2px solid #FF5A09'
          }}
        >
          <SuccessIcon sx={{ color: '#4CAF50', fontSize: 72, mb: 2 }} />
          <Typography variant="h4" sx={{ fontFamily: '"Fredoka", sans-serif', color: '#FF5A09', mb: 1 }}>
            Order Placed!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Order **{createdOrderNumber}** has been successfully generated. WhatsApp confirmation notification has been queued.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowSuccess(false)}
            sx={{ px: 4, py: 1, borderRadius: 3 }}
          >
            Acknowledge & Clear
          </Button>
        </Box>
      </Backdrop>
    </Box>
  );
}
