const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface Customer {
  id?: number;
  name: string;
  contact: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer Not to Say';
  location: string;
  created_at?: string;
}

export interface Item {
  id?: number;
  name: string;
  ingredients: string[];
  price: number;
  best_before_duration: string;
  created_at?: string;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  item_id: number;
  quantity: number;
  unit_price?: number;
  item_name?: string;
}

export interface Order {
  id?: number;
  customer_id?: number;
  customer_name?: string;
  customer_contact?: string;
  customer_location?: string;
  source: string;
  expected_delivery_date: string;
  expected_delivery_location: string;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Cancelled';
  payment_status: 'Unpaid' | 'Paid';
  total_price: number;
  created_at?: string;
  items: OrderItem[];
}

export interface SocialCampaign {
  id?: number;
  campaign_name: string;
  notes?: string;
  caption?: string;
  scheduled_date: string;
  platforms: string[];
  image_url?: string;
  attachment_name?: string;
  status: 'Scheduled' | 'Published' | 'Draft';
  created_at?: string;
}

export interface WhatsAppLog {
  id: number;
  recipient: string;
  message: string;
  template_type: 'OrderReceived' | 'OrderReady' | 'PaymentSuccess' | 'Promotion';
  status: 'Sent' | 'Failed' | 'Pending';
  created_at: string;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  genders: { label: string; value: number }[];
  locations: { label: string; value: number }[];
  sources: { label: string; value: number }[];
  topCustomers: { name: string; contact: string; order_count: number; total_spent: number }[];
}

// Request Helper
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP error! Status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Customers
  getCustomers: () => request<Customer[]>('/api/customers'),
  searchCustomers: (query: string) => request<Customer[]>(`/api/customers/search?q=${encodeURIComponent(query)}`),
  createCustomer: (data: Customer) => request<Customer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getCustomerAnalytics: () => request<CustomerAnalytics>('/api/customers/analytics'),

  // Items
  getItems: () => request<Item[]>('/api/items'),
  createItem: (data: Item) => request<Item>('/api/items', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateItem: (id: number, data: Item) => request<Item>(`/api/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Orders
  getOrders: () => request<Order[]>('/api/orders'),
  createOrder: (data: Partial<Order> & {
    customer_name?: string;
    customer_contact?: string;
    customer_gender?: string;
    customer_location?: string;
  }) => request<{ success: boolean; order: Order; whatsapp?: { recipient: string; message: string; status: string } }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateOrderStatus: (id: number, status: Order['status']) => request<{ order: Order; whatsapp?: { recipient: string; status: string } }>(`/api/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  updateOrderPaymentStatus: (id: number, paymentStatus: Order['payment_status']) => request<{ order: Order; whatsapp?: { recipient: string; status: string } }>(`/api/orders/${id}/payment`, {
    method: 'PUT',
    body: JSON.stringify({ payment_status: paymentStatus }),
  }),

  // Social Campaigns
  getSocialCampaigns: () => request<SocialCampaign[]>('/api/social-campaigns'),
  createSocialCampaign: (data: SocialCampaign) => request<SocialCampaign>('/api/social-campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateSocialCampaign: (id: number, data: SocialCampaign) => request<SocialCampaign>(`/api/social-campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteSocialCampaign: (id: number) => request<{ success: boolean; message: string }>(`/api/social-campaigns/${id}`, {
    method: 'DELETE',
  }),

  // WhatsApp Logs
  getWhatsAppLogs: () => request<WhatsAppLog[]>('/api/whatsapp-logs'),
  sendWhatsAppPromotion: (contacts: string[], message: string) => request<{
    success: boolean;
    results: { contact: string; status: string; success: boolean }[];
  }>('/api/whatsapp-logs/promotion', {
    method: 'POST',
    body: JSON.stringify({ contacts, message }),
  }),
};
