import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'krunchy_db',
  password: process.env.DB_PASSWORD || 'postgrespassword',
  port: parseInt(process.env.DB_PORT || '5432'),
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Checking database connection & status...');
    
    // Create status enums if they do not exist
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('Unpaid', 'Paid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 1. Customers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(50) UNIQUE NOT NULL,
        gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer Not to Say')),
        location VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(contact, name);
    `);

    // 2. Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        ingredients TEXT[] NOT NULL,
        price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
        best_before_duration VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT,
        source VARCHAR(100) NOT NULL,
        expected_delivery_date TIMESTAMP NOT NULL,
        expected_delivery_location TEXT NOT NULL,
        status order_status DEFAULT 'Pending',
        payment_status payment_status DEFAULT 'Unpaid',
        total_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Order Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES items(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0)
      );
    `);

    // 5. Social Media Campaigns Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_campaigns (
        id SERIAL PRIMARY KEY,
        campaign_name VARCHAR(255) NOT NULL,
        notes TEXT,
        caption TEXT,
        scheduled_date TIMESTAMP NOT NULL,
        platforms VARCHAR(50)[] NOT NULL,
        image_url TEXT,
        attachment_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Published', 'Draft')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. WhatsApp Communication Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('OrderReceived', 'OrderReady', 'PaymentSuccess', 'Promotion')),
        status VARCHAR(50) DEFAULT 'Sent' CHECK (status IN ('Sent', 'Failed', 'Pending')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed mock data if database is empty
    const itemsRes = await client.query('SELECT COUNT(*) FROM items');
    if (parseInt(itemsRes.rows[0].count) === 0) {
      console.log('Database empty, seeding mock items...');
      await client.query(`
        INSERT INTO items (name, ingredients, price, best_before_duration) VALUES
        ('Chocolate Crunch Cookie', ARRAY['Chocolate Chips', 'Flour', 'Butter', 'Sugar', 'Cocoa Powder'], 120.00, '7 Days'),
        ('Almond Oat Cookie', ARRAY['Oats', 'Almonds', 'Honey', 'Butter', 'Flour'], 150.00, '10 Days'),
        ('Classic Butter Biscuit', ARRAY['Butter', 'Flour', 'Sugar', 'Vanilla Extract'], 90.00, '15 Days'),
        ('Hazelnut Delight', ARRAY['Hazelnuts', 'Dark Chocolate', 'Butter', 'Flour', 'Sugar'], 180.00, '5 Days')
      `);
      
      console.log('Seeding mock customers...');
      await client.query(`
        INSERT INTO customers (name, contact, gender, location) VALUES
        ('Aarav Mehta', '+919876543210', 'Male', 'Mumbai'),
        ('Diya Sharma', '+919876543211', 'Female', 'Delhi'),
        ('Kabir Singh', '+919876543212', 'Male', 'Bangalore')
      `);
    }

    console.log('Database tables successfully verified/created.');
  } catch (err) {
    console.error('Error during database initialization:', err);
  } finally {
    client.release();
  }
};

export default pool;
