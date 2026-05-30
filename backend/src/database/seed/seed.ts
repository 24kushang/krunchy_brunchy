import { AppDataSource } from '../data-source';
import { Customer } from '../entities/customer.entity';
import { Item } from '../entities/item.entity';
import { ItemPriceHistory } from '../entities/item-price-history.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';
import { WhatsappLog } from '../entities/whatsapp-log.entity';
import { SocialMediaContent } from '../entities/social-media-content.entity';
import { OrderSource } from '../entities/order-source.entity';
import { InventoryLocation } from '../entities/inventory-location.entity';
import { ItemInventory } from '../entities/item-inventory.entity';
import { Gender, OrderStatus, WhatsappLogStatus, PaymentStatus, PaymentMode } from '../entities/enums';


async function seed() {
  console.log('Initializing database connection...');
  await AppDataSource.initialize();
  console.log('Database initialized successfully.');

  // Clean database
  console.log('Clearing database...');
  await AppDataSource.query('TRUNCATE TABLE "whatsapp_logs" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "order_status_history" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "order_items" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "orders" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "customers" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "item_price_history" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "item_inventories" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "items" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "inventory_locations" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "order_sources" CASCADE');
  await AppDataSource.query('TRUNCATE TABLE "social_media_content" CASCADE');

  const queryRunner = AppDataSource.createQueryRunner();

  // 1. Seed Items (Snacks)
  console.log('Seeding items...');
  const itemsData = [
    { name: 'Masala Potato Chips', ingredients: ['Potato', 'Palm Oil', 'Salt', 'Spices', 'Mango Powder'], bestBeforeDays: 60, imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d22?w=500' },
    { name: 'Crispy Sacha Samosas', ingredients: ['Refined Wheat Flour', 'Potato', 'Green Peas', 'Spices', 'Refined Oil'], bestBeforeDays: 5, imageUrl: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500' },
    { name: 'Sweet Butter Cookies', ingredients: ['Wheat Flour', 'Butter', 'Sugar', 'Milk Solids', 'Vanilla Extract'], bestBeforeDays: 90, imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500' },
    { name: 'Chatpata Sev Murmura', ingredients: ['Puffed Rice', 'Chickpea Flour Sev', 'Peanuts', 'Turmeric', 'Salt', 'Lemon Powder'], bestBeforeDays: 45, imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500' },
    { name: 'Creamy Cheese Balls', ingredients: ['Corn Meal', 'Cheese Powder', 'Vegetable Oil', 'Whey Powder', 'Spices'], bestBeforeDays: 60, imageUrl: 'https://images.unsplash.com/photo-1599490659213-e2b9527b0876?w=500' },
    { name: 'Spicy Banana Wafers', ingredients: ['Raw Banana', 'Coconut Oil', 'Black Pepper', 'Rock Salt'], bestBeforeDays: 30, imageUrl: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500' },
    { name: 'Methi Khakhra Crunch', ingredients: ['Whole Wheat Flour', 'Fenugreek Leaves', 'Spices', 'Salt', 'Edible Oil'], bestBeforeDays: 120, imageUrl: 'https://images.unsplash.com/photo-1613769049987-b31b641f25b1?w=500' },
    { name: 'Chilli Garlic Nachos', ingredients: ['Corn Flour', 'Garlic Powder', 'Chilli Flakes', 'Onion Powder', 'Refined Oil'], bestBeforeDays: 90, imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=500' },
    { name: 'Roasted Salted Cashews', ingredients: ['Cashews', 'Butter', 'Salt'], bestBeforeDays: 180, imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500' },
    { name: 'Choco Almond Bites', ingredients: ['Dark Chocolate', 'Almond', 'Sugar', 'Cocoa Butter'], bestBeforeDays: 120, imageUrl: 'https://images.unsplash.com/photo-1518047601542-79f18c655718?w=500' },
  ];

  const items: Item[] = [];
  const now = new Date();

  for (const itemData of itemsData) {
    const item = new Item();
    item.name = itemData.name;
    item.ingredients = itemData.ingredients;
    item.bestBeforeDays = itemData.bestBeforeDays;
    item.imageUrl = itemData.imageUrl;
    const savedItem = await AppDataSource.manager.save(item);

    // Seed price history (current price + history)
    // 3 months ago price
    const histPrice1 = new ItemPriceHistory();
    histPrice1.item = savedItem;
    histPrice1.price = Math.round((20 + Math.random() * 80) * 100) / 100;
    histPrice1.changedAt = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    await AppDataSource.manager.save(histPrice1);

    // 1 month ago price
    const histPrice2 = new ItemPriceHistory();
    histPrice2.item = savedItem;
    histPrice2.price = Math.round((histPrice1.price * (1 + (Math.random() * 0.15 - 0.05))) * 100) / 100; // +- 15% change
    histPrice2.changedAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    await AppDataSource.manager.save(histPrice2);

    // Current price
    const histPrice3 = new ItemPriceHistory();
    histPrice3.item = savedItem;
    histPrice3.price = Math.round((histPrice2.price * (1 + (Math.random() * 0.10))) * 100) / 100; // price increase
    histPrice3.changedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    await AppDataSource.manager.save(histPrice3);

    items.push(savedItem);
  }

  // 1b. Seed Order Sources
  console.log('Seeding order sources...');
  const sourceNames = ['WhatsApp', 'Phone', 'Instagram', 'Website', 'Walk-in'];
  const orderSourcesMap: Record<string, OrderSource> = {};
  for (const name of sourceNames) {
    const src = new OrderSource();
    src.name = name;
    orderSourcesMap[name] = await AppDataSource.manager.save(OrderSource, src);
  }

  // 1c. Seed Inventory Locations
  console.log('Seeding inventory locations...');
  const hubWest = new InventoryLocation();
  hubWest.name = 'Hub West';
  const savedHubWest = await AppDataSource.manager.save(InventoryLocation, hubWest);

  const hubSouth = new InventoryLocation();
  hubSouth.name = 'Hub South';
  const savedHubSouth = await AppDataSource.manager.save(InventoryLocation, hubSouth);

  const hubs = [savedHubWest, savedHubSouth];

  // 1d. Seed Item Inventories (Stock levels for each item at each hub)
  console.log('Seeding item inventories...');
  for (const item of items) {
    for (const hub of hubs) {
      const inv = new ItemInventory();
      inv.item = item;
      inv.location = hub;
      inv.quantity = Math.floor(Math.random() * 45) + 5; // 5 to 50 items
      await AppDataSource.manager.save(ItemInventory, inv);
    }
  }

  // 2. Seed Customers
  console.log('Seeding customers...');
  const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Ahmedabad'];
  const customerNames = [
    { name: 'Aarav Mehta', gender: Gender.MALE },
    { name: 'Ananya Sharma', gender: Gender.FEMALE },
    { name: 'Vihaan Patel', gender: Gender.MALE },
    { name: 'Diya Iyer', gender: Gender.FEMALE },
    { name: 'Sai Ramakrishnan', gender: Gender.OTHER },
    { name: 'Kabir Kapoor', gender: Gender.MALE },
    { name: 'Ira Deshmukh', gender: Gender.FEMALE },
    { name: 'Arjun Verma', gender: Gender.MALE },
    { name: 'Riya Gupta', gender: Gender.FEMALE },
    { name: 'Reyansh Reddy', gender: Gender.MALE },
    { name: 'Aditi Joshi', gender: Gender.FEMALE },
    { name: 'Ishaan Bhat', gender: Gender.MALE },
    { name: 'Zara Khan', gender: Gender.FEMALE },
    { name: 'Karan Malhotra', gender: Gender.MALE },
    { name: 'Meera Nair', gender: Gender.FEMALE },
    { name: 'Dev Mukherjee', gender: Gender.MALE },
    { name: 'Avani Sen', gender: Gender.FEMALE },
    { name: 'Rohan Shah', gender: Gender.MALE },
    { name: 'Kriti Bansal', gender: Gender.FEMALE },
    { name: 'Aanya Trivedi', gender: Gender.FEMALE }
  ];

  const customers: Customer[] = [];
  let index = 0;
  for (const c of customerNames) {
    const customer = new Customer();
    customer.name = c.name;
    customer.gender = c.gender;
    customer.location = locations[index % locations.length];
    customer.contact = `+91 ${9876543200 + index}`;
    customer.address = `${index + 101}, Snacker's Lane, Sector ${index % 5 + 1}, ${customer.location}`;
    const savedCustomer = await AppDataSource.manager.save(customer);
    customers.push(savedCustomer);
    index++;
  }

  // 3. Seed Orders & Status History over 3 months
  console.log('Seeding orders...');
  const orderStates = [
    OrderStatus.PENDING,
    OrderStatus.PREPARING,
    OrderStatus.READY_TO_DELIVER,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ];

  // Helper to find the price of an item at a specific date
  const getPriceAtDate = async (itemId: string, date: Date): Promise<number> => {
    const history = await AppDataSource.manager.find(ItemPriceHistory, {
      where: { item: { id: itemId } },
      order: { changedAt: 'ASC' }
    });

    let activePrice = 50.00; // fallback default
    for (const h of history) {
      if (h.changedAt.getTime() <= date.getTime()) {
        activePrice = h.price;
      }
    }
    return activePrice;
  };

  let orderCounter = 1;
  const numOrders = 45;
  for (let i = 0; i < numOrders; i++) {
    const customer = customers[i % customers.length];
    // Spread orders across the last 90 days
    const orderDate = new Date(now.getTime() - (Math.random() * 90 * 24 * 60 * 60 * 1000));
    
    // Choose status based on date (older orders are more likely to be Delivered / Cancelled)
    let status = OrderStatus.DELIVERED;
    const daysAgo = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 5) {
      // Recent orders can be in any state
      status = orderStates[Math.floor(Math.random() * 5)];
    } else if (daysAgo < 15) {
      // Semi-recent orders
      status = Math.random() > 0.15 ? OrderStatus.DELIVERED : OrderStatus.CANCELLED;
    } else {
      // Old orders are Delivered or Cancelled
      status = Math.random() > 0.08 ? OrderStatus.DELIVERED : OrderStatus.CANCELLED;
    }

    const order = new Order();
    order.orderNumber = `KB-${String(orderCounter).padStart(5, '0')}`;
    order.customer = customer;
    order.status = status;
    order.createdAt = orderDate;
    order.updatedAt = orderDate;
    order.totalAmount = 0; // Will compute from items
    
    // Assign Order Source
    const sources = ['WhatsApp', 'Phone', 'Instagram', 'Website', 'Walk-in'];
    order.source = orderSourcesMap[sources[i % sources.length]];

    // Assign Fulfillment Hub based on location (Mumbai, Pune, Ahmedabad -> Hub West, others -> Hub South)
    const westLocations = ['Mumbai', 'Pune', 'Ahmedabad'];
    const assignedHub = westLocations.includes(customer.location) ? savedHubWest : savedHubSouth;
    order.fulfillmentHub = assignedHub;
    
    // Assign Expected Delivery Date (optional - set on 85% of orders)
    if (Math.random() < 0.85) {
      order.expectedDeliveryDate = new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    }
    order.deliveryLocation = `${customer.location} Delivery Point #${(i % 3) + 1}`;

    // Set Payment details
    if (status === OrderStatus.DELIVERED) {
      order.paymentStatus = PaymentStatus.PAID;
      const modes = [PaymentMode.UPI, PaymentMode.CARD, PaymentMode.CASH, PaymentMode.NET_BANKING];
      order.paymentMode = modes[i % modes.length];
      order.paymentUpdatedAt = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after order
      if (order.paymentMode === PaymentMode.CASH) {
        order.cashCollectionDetails = i % 2 === 0 ? 'Counter Register A' : 'Delivery Rider - Suresh';
      }
    } else {
      order.paymentStatus = PaymentStatus.UNPAID;
      // 10% chance of unpaid/pending order being paid
      if (Math.random() < 0.1) {
        order.paymentStatus = PaymentStatus.PAID;
        order.paymentMode = PaymentMode.UPI;
        order.paymentUpdatedAt = new Date(orderDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours after order
      }
    }

    const savedOrder = await AppDataSource.manager.save(order);

    // Add 1 to 3 items
    const numItemsInOrder = 1 + Math.floor(Math.random() * 3);
    const chosenItems = [...items].sort(() => 0.5 - Math.random()).slice(0, numItemsInOrder);
    let totalAmount = 0;
    const orderItems: OrderItem[] = [];

    for (const item of chosenItems) {
      const priceAtOrder = await getPriceAtDate(item.id, orderDate);
      const quantity = 1 + Math.floor(Math.random() * 3);

      const orderItem = new OrderItem();
      orderItem.order = savedOrder;
      orderItem.item = item;
      orderItem.quantity = quantity;
      orderItem.priceAtOrder = priceAtOrder;
      await AppDataSource.manager.save(orderItem);

      totalAmount += priceAtOrder * quantity;
    }

    savedOrder.totalAmount = Math.round(totalAmount * 100) / 100;
    await AppDataSource.manager.save(savedOrder);

    // 4. Seed Order Status History & WhatsApp Logs
    // Helper to add status changes and dispatch simulated WhatsApp worker entries
    const addHistory = async (hstStatus: OrderStatus, hoursDelay: number) => {
      const hist = new OrderStatusHistory();
      hist.order = savedOrder;
      hist.status = hstStatus;
      hist.changedAt = new Date(orderDate.getTime() + hoursDelay * 60 * 60 * 1000);
      hist.changedBy = hstStatus === OrderStatus.PREPARING ? 'Kitchen Staff' : 
                      hstStatus === OrderStatus.READY_TO_DELIVER ? 'Fulfillment Manager' :
                      hstStatus === OrderStatus.DELIVERED ? 'Delivery Agent' : 'Admin';
      await AppDataSource.manager.save(hist);

      if (hstStatus === OrderStatus.PENDING) {
        // Seed WhatsApp log for Order Confirmation
        const log = new WhatsappLog();
        log.order = savedOrder;
        log.recipientName = customer.name;
        log.recipientContact = customer.contact;
        log.triggeringEvent = 'Order Created (Pending)';
        log.status = Math.random() > 0.05 ? WhatsappLogStatus.DELIVERED : WhatsappLogStatus.FAILED;
        if (log.status === WhatsappLogStatus.FAILED) {
          log.errorMessage = 'Network Timeout / Meta API Drop';
        }
        log.timestamp = hist.changedAt;
        await AppDataSource.manager.save(log);
      } else if (hstStatus === OrderStatus.READY_TO_DELIVER) {
        // Seed WhatsApp log for Ready to Deliver
        const log = new WhatsappLog();
        log.order = savedOrder;
        log.recipientName = customer.name;
        log.recipientContact = customer.contact;
        log.triggeringEvent = 'Ready to Deliver';
        log.status = Math.random() > 0.05 ? WhatsappLogStatus.DELIVERED : WhatsappLogStatus.FAILED;
        if (log.status === WhatsappLogStatus.FAILED) {
          log.errorMessage = 'Invalid Contact Format / Carrier Rejection';
        }
        log.timestamp = hist.changedAt;
        await AppDataSource.manager.save(log);
      } else if (hstStatus === OrderStatus.DELIVERED) {
        // Seed optional WhatsApp Thank You message
        const log = new WhatsappLog();
        log.order = savedOrder;
        log.recipientName = customer.name;
        log.recipientContact = customer.contact;
        log.triggeringEvent = 'Order Delivered (Payment Confirmed)';
        log.status = WhatsappLogStatus.SENT;
        log.timestamp = hist.changedAt;
        await AppDataSource.manager.save(log);
      }
    };

    // All orders start at Pending
    await addHistory(OrderStatus.PENDING, 0);

    if (status === OrderStatus.PENDING) {
      // Stays at Pending
    } else if (status === OrderStatus.PREPARING) {
      await addHistory(OrderStatus.PREPARING, 1);
    } else if (status === OrderStatus.READY_TO_DELIVER) {
      await addHistory(OrderStatus.PREPARING, 1);
      await addHistory(OrderStatus.READY_TO_DELIVER, 3);
    } else if (status === OrderStatus.DELIVERED) {
      await addHistory(OrderStatus.PREPARING, 1);
      await addHistory(OrderStatus.READY_TO_DELIVER, 3);
      await addHistory(OrderStatus.DELIVERED, 24);
    } else if (status === OrderStatus.CANCELLED) {
      const cancelStage = Math.random();
      if (cancelStage < 0.25) {
        // Cancelled while Pending
        await addHistory(OrderStatus.CANCELLED, 0.5);
      } else if (cancelStage < 0.6) {
        // Cancelled during Preparing
        await addHistory(OrderStatus.PREPARING, 1);
        await addHistory(OrderStatus.CANCELLED, 1.5);
      } else {
        // Cancelled after Ready to Deliver
        await addHistory(OrderStatus.PREPARING, 1);
        await addHistory(OrderStatus.READY_TO_DELIVER, 3);
        await addHistory(OrderStatus.CANCELLED, 4.5);
      }
    }

    orderCounter++;
  }

  // 5. Seed Social Media Content calendar items
  console.log('Seeding social media content calendar...');
  const socialItems = [
    {
      title: 'Summer Snacking Launch',
      caption: 'Beat the heat with our new Spicy Banana Wafers! Hand-crafted with authentic coconut oil and seasoned with rock salt and pepper. Grab yours today!',
      scheduledAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      mediaUrl: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500',
      platforms: ['Instagram', 'Facebook'],
      checklist: { 'Graphic Design': true, 'Caption Drafted': true, 'Approval': true, 'Published': true }
    },
    {
      title: 'Monsoon Chai & Samosa Combo Promo',
      caption: 'Rainy evenings are incomplete without hot chai and our Crispy Sacha Samosas! Order a pack of 5 now and get 20% off.',
      scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // In 2 days
      mediaUrl: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500',
      platforms: ['Instagram', 'LinkedIn', 'Facebook'],
      checklist: { 'Graphic Design': true, 'Caption Drafted': true, 'Approval': false, 'Published': false }
    },
    {
      title: 'Butter Cookies Snack Box Feature',
      caption: 'Rich, crumbly, and filled with pure butter goodness. Our Sweet Butter Cookies make the perfect gifting box for friends and family.',
      scheduledAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // In 10 days
      mediaUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500',
      platforms: ['Instagram'],
      checklist: { 'Graphic Design': false, 'Caption Drafted': true, 'Approval': false, 'Published': false }
    },
    {
      title: 'Homegrown Indian Snacks Spotlight',
      caption: 'Every crunch of Krunchy Brunchy Sev Murmura carries the authentic flavors of India. 100% homegrown, 100% munchy!',
      scheduledAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      mediaUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500',
      platforms: ['Facebook', 'Instagram'],
      checklist: { 'Graphic Design': true, 'Caption Drafted': true, 'Approval': true, 'Published': true }
    }
  ];

  for (const s of socialItems) {
    const content = new SocialMediaContent();
    content.title = s.title;
    content.caption = s.caption;
    content.scheduledAt = s.scheduledAt;
    content.mediaUrl = s.mediaUrl;
    content.platforms = s.platforms;
    content.checklist = s.checklist;
    await AppDataSource.manager.save(content);
  }

  console.log('Seeding completed successfully!');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
