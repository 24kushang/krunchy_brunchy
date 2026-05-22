import React, { useState, useEffect } from 'react';
import { api, Item, Customer } from '../services/api';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  IconButton,
  CircularProgress,
  Divider,
  List,
  ListItemText,
  ListItemButton,
  Card,
  CardContent,
  InputAdornment,
  Avatar
} from '@mui/material';
import {
  Search,
  ShoppingCart,
  Trash2,
  Send,
  Plus,
  Minus
} from 'lucide-react';
import { ToastMessage } from './WhatsAppToast';

interface OrderFormProps {
  onOrderCreated: (toast?: ToastMessage) => void;
}

interface CartItem {
  item: Item;
  quantity: number;
}

export const OrderForm: React.FC<OrderFormProps> = ({ onOrderCreated }) => {
  // Catalog & Search State
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemQuery, setItemQuery] = useState('');

  // Customer Autocomplete States
  const [customerSearch, setCustomerSearch] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState<Customer[]>([]);
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Selected Customer Details
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined);
  const [custName, setCustName] = useState('');
  const [custContact, setCustContact] = useState('');
  const [custGender, setCustGender] = useState<Customer['gender']>('Prefer Not to Say');
  const [custLocation, setCustLocation] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(true);

  // Order Details
  const [orderSource, setOrderSource] = useState('WhatsApp');
  const [expectedDate, setExpectedDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Submission States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch Items on Mount
  useEffect(() => {
    const loadItems = async () => {
      setLoadingItems(true);
      try {
        const res = await api.getItems();
        setItems(res);
      } catch (err: any) {
        console.error('Failed to load items:', err);
      } finally {
        setLoadingItems(false);
      }
    };
    loadItems();
  }, []);

  // Async Customer Search (Phone or Name)
  useEffect(() => {
    if (!customerSearch.trim()) {
      setSearchedCustomers([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchingCustomer(true);
      try {
        const results = await api.searchCustomers(customerSearch);
        setSearchedCustomers(results);
        setShowCustDropdown(true);
      } catch (err) {
        console.error('Customer search failed:', err);
      } finally {
        setSearchingCustomer(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [customerSearch]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustName(customer.name);
    setCustContact(customer.contact);
    setCustGender(customer.gender);
    setCustLocation(customer.location);
    setDeliveryLocation(customer.location); // Default delivery to customer city
    setIsNewCustomer(false);
    setShowCustDropdown(false);
    setCustomerSearch(customer.name);
  };

  const handleCreateNewCustomerTrigger = () => {
    setSelectedCustomerId(undefined);
    setCustName(customerSearch); // Prefill search text as name
    setCustContact('');
    setCustGender('Prefer Not to Say');
    setCustLocation('');
    setDeliveryLocation('');
    setIsNewCustomer(true);
    setShowCustDropdown(false);
  };

  // Cart Operations
  const addToCart = (item: Item) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      setCart(cart.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  };

  const updateCartQty = (itemId: number, change: number) => {
    const updated = cart.map(c => {
      if (c.item.id === itemId) {
        const newQty = c.quantity + change;
        return { ...c, quantity: newQty };
      }
      return c;
    }).filter(c => c.quantity > 0);
    setCart(updated);
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, c) => acc + c.item.price * c.quantity, 0);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      setError('Please add at least one item to the cart.');
      return;
    }

    if (isNewCustomer && (!custName || !custContact || !custLocation)) {
      setError('Please fill in new customer details (Name, Contact, Location).');
      return;
    }

    if (!expectedDate || !deliveryLocation) {
      setError('Please specify the delivery date and location.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const orderItems = cart.map(c => ({
        item_id: c.item.id!,
        quantity: c.quantity
      }));

      const payload = {
        customer_id: selectedCustomerId,
        customer_name: isNewCustomer ? custName : undefined,
        customer_contact: isNewCustomer ? custContact : undefined,
        customer_gender: isNewCustomer ? custGender : undefined,
        customer_location: isNewCustomer ? custLocation : undefined,
        source: orderSource,
        expected_delivery_date: expectedDate,
        expected_delivery_location: deliveryLocation,
        items: orderItems
      };

      const response = await api.createOrder(payload);

      if (response.success) {
        setSuccessMsg(`Order #${response.order.id} placed successfully!`);
        // Reset states
        setCart([]);
        setSelectedCustomerId(undefined);
        setCustomerSearch('');
        setCustName('');
        setCustContact('');
        setCustLocation('');
        setDeliveryLocation('');
        setExpectedDate('');

        let newToast: ToastMessage | undefined = undefined;
        if (response.whatsapp) {
          newToast = {
            id: Math.random().toString(),
            recipient: response.whatsapp.recipient,
            message: response.whatsapp.message,
            templateType: 'OrderReceived',
            status: response.whatsapp.status,
            timestamp: new Date()
          };
        }

        onOrderCreated(newToast);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(itemQuery.toLowerCase())
  );

  const orderSources = ['WhatsApp', 'Instagram', 'Website', 'Walk-in', 'Referral', 'Other'];
  const genderOptions = ['Male', 'Female', 'Other', 'Prefer Not to Say'];

  return (
    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }} color="text.primary">
        Create New Order
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Form to record customer details, browse the catalog, and schedule deliveries.
      </Typography>

      <Box component="form" onSubmit={handleSubmitOrder} sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

        {/* Section 1: Customer Details */}
        <Box>
          <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700, mb: 2 }}>
            1. Customer Details
          </Typography>

          <Grid container spacing={2.5}>
            {/* Customer Search / Autocomplete Field */}
            <Grid item xs={12} sm={isNewCustomer ? 12 : 6} sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                label="Search Existing Customer (Phone / Name)"
                placeholder="Type contact number or name..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  if (!e.target.value) {
                    setSelectedCustomerId(undefined);
                    setIsNewCustomer(true);
                  }
                }}
                onFocus={() => setShowCustDropdown(true)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      {searchingCustomer ? <CircularProgress size={16} /> : <Search size={16} />}
                    </InputAdornment>
                  )
                }}
              />

              {/* Autocomplete Dropdown List */}
              {showCustDropdown && customerSearch.trim() && (
                <Paper
                  elevation={3}
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 20,
                    right: 0,
                    zIndex: 10,
                    mt: 0.5,
                    maxHeight: 250,
                    overflowY: 'auto',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <List disablePadding>
                    {searchedCustomers.map(cust => (
                      <ListItemButton
                        key={cust.id}
                        onClick={() => handleSelectCustomer(cust)}
                        divider
                      >
                        <ListItemText
                          primary={cust.name}
                          secondary={`${cust.contact} • ${cust.location}`}
                          primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                          secondaryTypographyProps={{ fontSize: '0.8rem' }}
                        />
                      </ListItemButton>
                    ))}

                    <ListItemButton
                      onClick={handleCreateNewCustomerTrigger}
                      sx={{ color: 'primary.main', fontWeight: 700 }}
                    >
                      <ListItemText
                        primary={`+ Add "${customerSearch}" as a New Customer`}
                        primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem' }}
                      />
                    </ListItemButton>
                  </List>
                </Paper>
              )}
            </Grid>

            {/* Read-only / Autofilled or inputs for New Customer */}
            {isNewCustomer ? (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="New Customer Name"
                    placeholder="Full Name"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="tel"
                    label="Contact Number (WhatsApp format)"
                    placeholder="+91XXXXXXXXXX"
                    value={custContact}
                    onChange={(e) => setCustContact(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Gender"
                    value={custGender}
                    onChange={(e) => setCustGender(e.target.value as Customer['gender'])}
                  >
                    {genderOptions.map(opt => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="City / Location"
                    placeholder="e.g. Mumbai"
                    value={custLocation}
                    onChange={(e) => setCustLocation(e.target.value)}
                  />
                </Grid>
              </>
            ) : (
              <Grid item xs={12} sm={6}>
                <Card variant="outlined" sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                      Selected Profile
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>
                      {custName}
                    </Typography>
                    <Typography variant="body2" color="primary.main" sx={{ fontWeight: 650 }}>
                      {custContact}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      Location: {custLocation}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => {
                        setIsNewCustomer(true);
                        setSelectedCustomerId(undefined);
                        setCustomerSearch('');
                        setCustName('');
                        setCustContact('');
                        setCustLocation('');
                      }}
                      sx={{ mt: 1.5, p: 0, textTransform: 'none', fontWeight: 600, minWidth: 0 }}
                    >
                      Clear Selection
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>

        <Divider />

        {/* Section 2: E-commerce Item Selection */}
        <Box>
          <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700, mb: 2 }}>
            2. Item Catalog Selection
          </Typography>

          <Grid container spacing={3}>
            {/* Catalog Grid */}
            <Grid item xs={12} md={7.5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Filter items..."
                value={itemQuery}
                onChange={(e) => setItemQuery(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  )
                }}
              />

              {loadingItems ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <Grid container spacing={1.5} sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                  {filteredItems.map(item => (
                    <Grid item xs={12} sm={6} key={item.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          borderRadius: 2
                        }}
                      >
                        <Avatar sx={{ width: 32, height: 32, fontSize: '1rem', bgcolor: 'transparent' }}>
                          🍪
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>
                            Rs. {item.price}
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => addToCart(item)}
                          sx={{ py: 0.25, px: 1, fontSize: '0.75rem', textTransform: 'none' }}
                        >
                          Add
                        </Button>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Grid>

            {/* Shopping Cart Pane */}
            <Grid item xs={12} md={4.5}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ShoppingCart size={18} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 750 }}>
                    Order Items ({cart.length})
                  </Typography>
                </Box>

                <Divider />

                <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {cart.length === 0 ? (
                    <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                      <Typography variant="caption">
                        Cart is empty. Select items from the catalog.
                      </Typography>
                    </Box>
                  ) : (
                    cart.map(cartItem => (
                      <Box key={cartItem.item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0.5 }}>
                        <Box sx={{ minWidth: 0, pr: 1 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 650, fontSize: '0.85rem' }}>
                            {cartItem.item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Rs. {cartItem.item.price}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => updateCartQty(cartItem.item.id!, -1)}
                            sx={{ border: '1px solid', borderColor: 'divider', p: 0.25 }}
                          >
                            <Minus size={10} />
                          </IconButton>
                          <Typography sx={{ minWidth: 20, textAlign: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                            {cartItem.quantity}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => addToCart(cartItem.item)}
                            sx={{ border: '1px solid', borderColor: 'divider', p: 0.25 }}
                          >
                            <Plus size={10} />
                          </IconButton>

                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeFromCart(cartItem.item.id!)}
                            sx={{ ml: 0.5 }}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>

                <Divider sx={{ mt: 'auto' }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Total:</Typography>
                  <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 800 }}>
                    Rs. {calculateTotal().toFixed(2)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        <Divider />

        {/* Section 3: Expected Delivery & Meta Info */}
        <Box>
          <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 700, mb: 2 }}>
            3. Delivery Details
          </Typography>

          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Source of Order"
                value={orderSource}
                onChange={(e) => setOrderSource(e.target.value)}
              >
                {orderSources.map(src => (
                  <MenuItem key={src} value={src}>
                    {src}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="datetime-local"
                label="Expected Delivery Date & Time"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={2}
                label="Expected Location of Delivery"
                placeholder="Full Delivery Address..."
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Action / Error / Success Alerts */}
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {error && (
            <Typography color="error" variant="body2" sx={{ fontWeight: 600 }}>
              {error}
            </Typography>
          )}
          {successMsg && (
            <Typography color="success.main" variant="body2" sx={{ fontWeight: 600 }}>
              {successMsg}
            </Typography>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
            sx={{ py: 1.5, fontSize: '1rem' }}
          >
            {loading ? 'Creating Order...' : 'Create Order & Send WhatsApp Confirmation'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default OrderForm;
