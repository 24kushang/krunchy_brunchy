import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import pool, { initDb } from './config/db';
import { WhatsAppService } from './services/whatsapp';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Initialize Database Tables
initDb().then(() => {
  console.log('Database initialized successfully.');
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// ==========================================
// CUSTOMERS ROUTING
// ==========================================

// Get all customers
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search customers asynchronously by contact or name
app.get('/api/customers/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }
    const searchQuery = `%${q}%`;
    const result = await pool.query(
      `SELECT * FROM customers WHERE contact ILIKE $1 OR name ILIKE $1 LIMIT 8`,
      [searchQuery]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create customer manually
app.post('/api/customers', async (req, res) => {
  try {
    const { name, contact, gender, location } = req.body;
    if (!name || !contact || !location) {
      return res.status(400).json({ error: 'Name, contact, and location are required' });
    }
    const result = await pool.query(
      `INSERT INTO customers (name, contact, gender, location) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, contact, gender || 'Prefer Not to Say', location]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A customer with this contact number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Customers CRM Analytics
app.get('/api/customers/analytics', async (req, res) => {
  try {
    // 1. Gender distribution
    const genderRes = await pool.query(
      `SELECT COALESCE(gender, 'Not Specified') as label, COUNT(*) as value FROM customers GROUP BY gender`
    );

    // 2. Location distribution
    const locationRes = await pool.query(
      `SELECT location as label, COUNT(*) as value FROM customers GROUP BY location ORDER BY value DESC`
    );

    // 3. Order source distribution
    const sourceRes = await pool.query(
      `SELECT source as label, COUNT(*) as value FROM orders GROUP BY source ORDER BY value DESC`
    );

    // 4. Top spending customers
    const topCustomersRes = await pool.query(`
      SELECT c.name, c.contact, COUNT(o.id) as order_count, SUM(o.total_price) as total_spent
      FROM customers c
      JOIN orders o ON c.id = o.customer_id
      WHERE o.status != 'Cancelled'
      GROUP BY c.id, c.name, c.contact
      ORDER BY total_spent DESC
      LIMIT 5
    `);

    // 5. Total customers counter
    const countRes = await pool.query('SELECT COUNT(*) FROM customers');

    res.json({
      totalCustomers: parseInt(countRes.rows[0].count),
      genders: genderRes.rows,
      locations: locationRes.rows,
      sources: sourceRes.rows,
      topCustomers: topCustomersRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ITEMS ROUTING
// ==========================================

// Get all items
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM items ORDER BY name ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create item
app.post('/api/items', async (req, res) => {
  try {
    const { name, ingredients, price, best_before_duration } = req.body;
    if (!name || !ingredients || price === undefined || !best_before_duration) {
      return res.status(400).json({ error: 'All item fields are required' });
    }
    const result = await pool.query(
      `INSERT INTO items (name, ingredients, price, best_before_duration) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, ingredients, price, best_before_duration]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'An item with this name already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update item
app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ingredients, price, best_before_duration } = req.body;
    const result = await pool.query(
      `UPDATE items SET name = $1, ingredients = $2, price = $3, best_before_duration = $4 WHERE id = $5 RETURNING *`,
      [name, ingredients, price, best_before_duration, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ORDERS ROUTING
// ==========================================

// Get all orders (including customer details and items)
app.get('/api/orders', async (req, res) => {
  try {
    const ordersQuery = `
      SELECT o.*, 
             c.name as customer_name, c.contact as customer_contact, c.location as customer_location
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.id DESC
    `;
    const ordersResult = await pool.query(ordersQuery);
    
    // Fetch line items for each order
    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsQuery = `
        SELECT oi.*, i.name as item_name
        FROM order_items oi
        JOIN items i ON oi.item_id = i.id
        WHERE oi.order_id = $1
      `;
      const itemsResult = await pool.query(itemsQuery, [order.id]);
      orders.push({
        ...order,
        items: itemsResult.rows
      });
    }
    
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create Order (uses TRANSACTION to guarantee atomicity and supports auto customer creation)
app.post('/api/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      customer_id,
      customer_name,
      customer_contact,
      customer_gender,
      customer_location,
      source,
      expected_delivery_date,
      expected_delivery_location,
      items // Array of { item_id: number, quantity: number }
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    await client.query('BEGIN');

    let resolvedCustomerId = customer_id;

    // Check/create customer if customer_id was not selected
    if (!resolvedCustomerId) {
      if (!customer_contact || !customer_name || !customer_location) {
        throw new Error('Customer contact, name, and location are required for new customer');
      }

      // Check if contact already exists
      const existingCustomer = await client.query('SELECT id FROM customers WHERE contact = $1', [customer_contact]);
      if (existingCustomer.rows.length > 0) {
        resolvedCustomerId = existingCustomer.rows[0].id;
      } else {
        // Create new customer entry
        const newCustomer = await client.query(
          `INSERT INTO customers (name, contact, gender, location) VALUES ($1, $2, $3, $4) RETURNING id`,
          [customer_name, customer_contact, customer_gender || 'Prefer Not to Say', customer_location]
        );
        resolvedCustomerId = newCustomer.rows[0].id;
        console.log(`[Database] Auto-created new customer with ID: ${resolvedCustomerId}`);
      }
    }

    // Retrieve prices of items to calculate totals safely
    let calculatedTotal = 0;
    const itemsWithPrices = [];

    for (const orderItem of items) {
      const itemRes = await client.query('SELECT name, price FROM items WHERE id = $1', [orderItem.item_id]);
      if (itemRes.rows.length === 0) {
        throw new Error(`Item ID ${orderItem.item_id} not found`);
      }
      const unitPrice = parseFloat(itemRes.rows[0].price);
      calculatedTotal += unitPrice * orderItem.quantity;
      itemsWithPrices.push({
        item_id: orderItem.item_id,
        name: itemRes.rows[0].name,
        quantity: orderItem.quantity,
        unit_price: unitPrice
      });
    }

    // Insert Order
    const orderInsertQuery = `
      INSERT INTO orders (customer_id, source, expected_delivery_date, expected_delivery_location, status, payment_status, total_price)
      VALUES ($1, $2, $3, $4, 'Pending', 'Unpaid', $5)
      RETURNING id, created_at, status, payment_status, total_price
    `;
    const orderRes = await client.query(orderInsertQuery, [
      resolvedCustomerId,
      source,
      expected_delivery_date,
      expected_delivery_location,
      calculatedTotal
    ]);
    const orderId = orderRes.rows[0].id;

    // Insert Order Items
    for (const itemDetails of itemsWithPrices) {
      await client.query(
        `INSERT INTO order_items (order_id, item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
        [orderId, itemDetails.item_id, itemDetails.quantity, itemDetails.unit_price]
      );
    }

    await client.query('COMMIT');

    // Fetch customer details to send WhatsApp
    const custRes = await client.query('SELECT name, contact FROM customers WHERE id = $1', [resolvedCustomerId]);
    const customer = custRes.rows[0];

    // Trigger Asynchronous WhatsApp Confirmation
    let whatsappSimulatedResult = null;
    try {
      const formattedDate = new Date(expected_delivery_date).toLocaleString();
      const whatsappRes = await WhatsAppService.sendOrderReceived(
        customer.name,
        customer.contact,
        orderId,
        itemsWithPrices,
        calculatedTotal,
        formattedDate,
        expected_delivery_location
      );
      whatsappSimulatedResult = {
        recipient: customer.contact,
        message: whatsappRes.message,
        status: whatsappRes.status
      };
    } catch (wsErr: any) {
      console.error('[WhatsApp Hook] Failed to send order received alert:', wsErr.message);
    }

    res.status(201).json({
      success: true,
      order: {
        id: orderId,
        customer_id: resolvedCustomerId,
        customer_name: customer.name,
        customer_contact: customer.contact,
        source,
        expected_delivery_date,
        expected_delivery_location,
        status: orderRes.rows[0].status,
        payment_status: orderRes.rows[0].payment_status,
        total_price: calculatedTotal,
        created_at: orderRes.rows[0].created_at,
        items: itemsWithPrices
      },
      whatsapp: whatsappSimulatedResult
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update Order Status
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled'

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = result.rows[0];

    // Fetch customer details
    const custRes = await pool.query(
      `SELECT name, contact FROM customers WHERE id = $1`,
      [updatedOrder.customer_id]
    );
    const customer = custRes.rows[0];

    // Send WhatsApp if status transitioned to "Ready" or "Delivered"
    let whatsappAlert = null;
    if (status === 'Ready' || status === 'Delivered') {
      try {
        const waRes = await WhatsAppService.sendOrderReadyOrDelivered(
          customer.name,
          customer.contact,
          updatedOrder.id,
          status,
          updatedOrder.expected_delivery_location
        );
        whatsappAlert = {
          recipient: customer.contact,
          status: waRes.status
        };
      } catch (waErr: any) {
        console.error('[WhatsApp Hook] Failed to send status update notification:', waErr.message);
      }
    }

    res.json({
      order: updatedOrder,
      whatsapp: whatsappAlert
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Order Payment Status
app.put('/api/orders/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body; // 'Unpaid', 'Paid'

    if (!payment_status) {
      return res.status(400).json({ error: 'Payment status is required' });
    }

    const result = await pool.query(
      `UPDATE orders SET payment_status = $1 WHERE id = $2 RETURNING *`,
      [payment_status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = result.rows[0];

    // Fetch customer details
    const custRes = await pool.query(
      `SELECT name, contact FROM customers WHERE id = $1`,
      [updatedOrder.customer_id]
    );
    const customer = custRes.rows[0];

    // Send WhatsApp payment successful message if transitioned to "Paid"
    let whatsappAlert = null;
    if (payment_status === 'Paid') {
      try {
        const waRes = await WhatsAppService.sendPaymentSuccess(
          customer.name,
          customer.contact,
          updatedOrder.id,
          parseFloat(updatedOrder.total_price)
        );
        whatsappAlert = {
          recipient: customer.contact,
          status: waRes.status
        };
      } catch (waErr: any) {
        console.error('[WhatsApp Hook] Failed to send payment confirmation:', waErr.message);
      }
    }

    res.json({
      order: updatedOrder,
      whatsapp: whatsappAlert
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SOCIAL CAMPAIGNS ROUTING
// ==========================================

// Get all posts
app.get('/api/social-campaigns', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM social_campaigns ORDER BY scheduled_date ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Schedule social post
app.post('/api/social-campaigns', async (req, res) => {
  try {
    const { campaign_name, notes, caption, scheduled_date, platforms, image_url, attachment_name } = req.body;
    if (!campaign_name || !scheduled_date || !platforms || platforms.length === 0) {
      return res.status(400).json({ error: 'Campaign name, scheduled date, and platforms are required' });
    }
    const result = await pool.query(
      `INSERT INTO social_campaigns (campaign_name, notes, caption, scheduled_date, platforms, image_url, attachment_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Scheduled')
       RETURNING *`,
      [campaign_name, notes || '', caption || '', scheduled_date, platforms, image_url || '', attachment_name || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Edit social post (including date rescheduled)
app.put('/api/social-campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { campaign_name, notes, caption, scheduled_date, platforms, image_url, attachment_name, status } = req.body;
    const result = await pool.query(
      `UPDATE social_campaigns 
       SET campaign_name = $1, notes = $2, caption = $3, scheduled_date = $4, platforms = $5, image_url = $6, attachment_name = $7, status = $8
       WHERE id = $9
       RETURNING *`,
      [campaign_name, notes, caption, scheduled_date, platforms, image_url, attachment_name, status || 'Scheduled', id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete social post
app.delete('/api/social-campaigns/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM social_campaigns WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ success: true, message: 'Post cancelled and deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// WHATSAPP MESSAGES LOGS ROUTING
// ==========================================

// Get sent logs
app.get('/api/whatsapp-logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM whatsapp_logs ORDER BY id DESC LIMIT 100');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send WhatsApp Promotion (Custom Broadcast)
app.post('/api/whatsapp-logs/promotion', async (req, res) => {
  try {
    const { contacts, message } = req.body; // contacts: Array of strings
    if (!contacts || contacts.length === 0 || !message) {
      return res.status(400).json({ error: 'Recipients list and message content are required' });
    }

    const deliveryResults = [];
    for (const contact of contacts) {
      const waRes = await WhatsAppService.sendMessage({
        recipient: contact,
        message,
        templateType: 'Promotion'
      });
      deliveryResults.push({
        contact,
        status: waRes.status,
        success: waRes.success
      });
    }

    res.json({
      success: true,
      results: deliveryResults
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Server Listen
app.listen(PORT, () => {
  console.log(`[Express API Server] Running on port http://localhost:${PORT}`);
});
