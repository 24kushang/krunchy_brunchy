import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1716380000000 implements MigrationInterface {
  name = 'InitialSchema1716380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[Migration] Running up() migration...');

    // 1. Create Enums if they do not exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('Pending', 'Preparing', 'Ready', 'Delivered', 'Cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('Unpaid', 'Paid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create Customers Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(50) UNIQUE NOT NULL,
        gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer Not to Say')),
        location VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(contact, name);
    `);

    // 3. Migrate ingredients column if the items table already exists with TEXT[]
    const itemsTableExists = await queryRunner.hasTable('items');
    if (itemsTableExists) {
      const checkColumnType = await queryRunner.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'ingredients';
      `);

      if (checkColumnType.length > 0) {
        const dataType = checkColumnType[0].data_type;
        if (dataType === 'ARRAY' || dataType === 'USER-DEFINED') {
          console.log('[Migration] Migrating items.ingredients from array to text...');
          await queryRunner.query(`
            ALTER TABLE items ALTER COLUMN ingredients TYPE TEXT USING array_to_string(ingredients, ', ');
          `);
        }
      }
    }

    // 4. Create Items Table (if it doesn't exist)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        ingredients TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
        best_before_duration VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create Orders Table
    await queryRunner.query(`
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

    // 6. Create Order Items Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        item_id INTEGER REFERENCES items(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0)
      );
    `);

    // 7. Create Social Campaigns Table
    await queryRunner.query(`
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

    // 8. Create WhatsApp Logs Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('OrderReceived', 'OrderReady', 'PaymentSuccess', 'Promotion')),
        status VARCHAR(50) DEFAULT 'Sent' CHECK (status IN ('Sent', 'Failed', 'Pending')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. Seed mock data if items table is empty
    const itemsCountRes = await queryRunner.query('SELECT COUNT(*) FROM items');
    const itemsCount = parseInt(itemsCountRes[0].count, 10);
    if (itemsCount === 0) {
      console.log('[Migration] Seeding initial database catalog...');
      await queryRunner.query(`
        INSERT INTO items (name, ingredients, price, best_before_duration) VALUES
        ('Chocolate Crunch Cookie', 'Chocolate Chips, Flour, Butter, Sugar, Cocoa Powder', 120.00, '7 Days'),
        ('Almond Oat Cookie', 'Oats, Almonds, Honey, Butter, Flour', 150.00, '10 Days'),
        ('Classic Butter Biscuit', 'Butter, Flour, Sugar, Vanilla Extract', 90.00, '15 Days'),
        ('Hazelnut Delight', 'Hazelnuts, Dark Chocolate, Butter, Flour, Sugar', 180.00, '5 Days')
      `);

      await queryRunner.query(`
        INSERT INTO customers (name, contact, gender, location) VALUES
        ('Aarav Mehta', '+919876543210', 'Male', 'Mumbai'),
        ('Diya Sharma', '+919876543211', 'Female', 'Delhi'),
        ('Kabir Singh', '+919876543212', 'Male', 'Bangalore')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[Migration] Running down() migration (rollback)...');
    await queryRunner.query(`DROP TABLE IF EXISTS whatsapp_logs CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS social_campaigns CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS order_items CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS orders CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS items CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS customers CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS order_status;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status;`);
  }
}
