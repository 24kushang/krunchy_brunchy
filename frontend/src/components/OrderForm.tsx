import React, { useState, useEffect } from 'react';
import { api, Item, Customer } from '../services/api';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Calendar, 
  MapPin, 
  Layers, 
  Send,
  Loader,
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

  return (
    <div className="glass-panel">
      <h2>Create New Order</h2>
      <p className="subtitle">Form to record customer details, browse the catalog, and schedule deliveries.</p>

      <form onSubmit={handleSubmitOrder}>
        {/* Customer Asynchronous Selection Panel */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-primary)' }}>1. Customer Details</h3>
          
          <div className="form-grid">
            <div className="form-group autocomplete-wrapper">
              <label>Search Existing Customer (Phone / Name)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
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
                />
                {searchingCustomer ? (
                  <Loader className="animate-spin" size={18} style={{ position: 'absolute', right: '12px', color: 'var(--color-text-dark)' }} />
                ) : (
                  <Search size={18} style={{ position: 'absolute', right: '12px', color: 'var(--color-text-dark)' }} />
                )}
              </div>

              {showCustDropdown && customerSearch.trim() && (
                <div className="autocomplete-dropdown">
                  {searchedCustomers.map(cust => (
                    <div 
                      key={cust.id} 
                      className="autocomplete-option"
                      onClick={() => handleSelectCustomer(cust)}
                    >
                      <div className="autocomplete-option-name">{cust.name}</div>
                      <div className="autocomplete-option-details">{cust.contact} • {cust.location}</div>
                    </div>
                  ))}
                  
                  <div 
                    className="autocomplete-option" 
                    style={{ fontWeight: 600, color: 'var(--color-primary)', borderTop: '1px solid var(--border-color)' }}
                    onClick={handleCreateNewCustomerTrigger}
                  >
                    + Add "{customerSearch}" as a New Customer
                  </div>
                </div>
              )}
            </div>

            {/* Read-only / Autofilled or inputs for New Customer */}
            {isNewCustomer ? (
              <>
                <div className="form-group">
                  <label>New Customer Name *</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    required={isNewCustomer}
                  />
                </div>
                <div className="form-group">
                  <label>Contact Number (WhatsApp format: +91...) *</label>
                  <input
                    type="tel"
                    placeholder="+91XXXXXXXXXX"
                    value={custContact}
                    onChange={(e) => setCustContact(e.target.value)}
                    required={isNewCustomer}
                  />
                </div>
                <div className="form-group">
                  <label>Gender</label>
                  <select
                    value={custGender}
                    onChange={(e) => setCustGender(e.target.value as Customer['gender'])}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer Not to Say">Prefer Not to Say</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>City / Location *</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={custLocation}
                    onChange={(e) => setCustLocation(e.target.value)}
                    required={isNewCustomer}
                  />
                </div>
              </>
            ) : (
              <div style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', gap: '0.25rem', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Selected Profile</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{custName}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-primary)' }}>{custContact}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Location: {custLocation}</div>
                <button 
                  type="button" 
                  style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'red', fontSize: '0.75rem', cursor: 'pointer', marginTop: '0.5rem', textDecoration: 'underline' }}
                  onClick={() => {
                    setIsNewCustomer(true);
                    setSelectedCustomerId(undefined);
                    setCustomerSearch('');
                    setCustName('');
                    setCustContact('');
                    setCustLocation('');
                  }}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* E-commerce Item Selection */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-primary)' }}>2. Item Catalog Selection</h3>
          
          <div className="catalog-container">
            {/* Catalog Grid */}
            <div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Filter items..."
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-dark)' }} />
              </div>

              {loadingItems ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loader className="animate-spin" size={24} style={{ color: 'var(--color-primary)' }} />
                </div>
              ) : (
                <div className="item-catalog-grid">
                  {filteredItems.map(item => (
                    <div key={item.id} className="catalog-card">
                      <div className="catalog-card-icon">🍪</div>
                      <div className="catalog-card-name">{item.name}</div>
                      <div className="catalog-card-price">Rs. {item.price}</div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => addToCart(item)}
                      >
                        Add to Order
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shopping Cart pane */}
            <div className="cart-pane">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.75rem' }}>
                <ShoppingCart size={18} />
                <span style={{ fontWeight: 700 }}>Order Items ({cart.length})</span>
              </div>

              <div className="cart-items-list">
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-dark)', padding: '2rem 0', fontSize: '0.9rem' }}>
                    Cart is empty. Select items from the catalog.
                  </div>
                ) : (
                  cart.map(cartItem => (
                    <div key={cartItem.item.id} className="cart-item">
                      <div className="cart-item-details">
                        <div className="cart-item-name">{cartItem.item.name}</div>
                        <div className="cart-item-price">Rs. {cartItem.item.price}</div>
                      </div>
                      
                      <div className="cart-item-quantity-control">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateCartQty(cartItem.item.id!, -1)}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ width: '20px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                          {cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => addToCart(cartItem.item)}
                        >
                          <Plus size={12} />
                        </button>
                        
                        <button
                          type="button"
                          style={{ background: 'transparent', border: 'none', color: 'var(--status-cancelled)', cursor: 'pointer', marginLeft: '0.5rem' }}
                          onClick={() => removeFromCart(cartItem.item.id!)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="cart-total-section">
                <div className="cart-total-line">
                  <span>Total:</span>
                  <span style={{ color: 'var(--color-primary)' }}>Rs. {calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expected Delivery & Meta Info */}
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-primary)' }}>3. Delivery Details</h3>
          
          <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label htmlFor="order-source">Source of Order *</label>
              <select
                id="order-source"
                value={orderSource}
                onChange={(e) => setOrderSource(e.target.value)}
              >
                <option value="WhatsApp">WhatsApp</option>
                <option value="Instagram">Instagram</option>
                <option value="Website">Website</option>
                <option value="Walk-in">Walk-in</option>
                <option value="Referral">Referral</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="delivery-date">Expected Delivery Date & Time *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="delivery-date"
                  type="datetime-local"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="delivery-location">Expected Location of Delivery *</label>
              <textarea
                id="delivery-location"
                rows={2}
                placeholder="Full Delivery Address..."
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Action / Error / Success Alerts */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          {error && <div style={{ color: 'var(--status-cancelled)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>{error}</div>}
          {successMsg && <div style={{ color: 'var(--status-ready)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>{successMsg}</div>}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', height: '48px' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Creating Order...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>Create Order & Send WhatsApp Confirmation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
export default OrderForm;
