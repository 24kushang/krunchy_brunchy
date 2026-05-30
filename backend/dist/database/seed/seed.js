"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = require("../data-source");
const customer_entity_1 = require("../entities/customer.entity");
const item_entity_1 = require("../entities/item.entity");
const item_price_history_entity_1 = require("../entities/item-price-history.entity");
const order_entity_1 = require("../entities/order.entity");
const order_item_entity_1 = require("../entities/order-item.entity");
const order_status_history_entity_1 = require("../entities/order-status-history.entity");
const whatsapp_log_entity_1 = require("../entities/whatsapp-log.entity");
const social_media_content_entity_1 = require("../entities/social-media-content.entity");
const order_source_entity_1 = require("../entities/order-source.entity");
const inventory_location_entity_1 = require("../entities/inventory-location.entity");
const item_inventory_entity_1 = require("../entities/item-inventory.entity");
const enums_1 = require("../entities/enums");
async function seed() {
    console.log('Initializing database connection...');
    await data_source_1.AppDataSource.initialize();
    console.log('Database initialized successfully.');
    console.log('Clearing database...');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "whatsapp_logs" CASCADE');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "order_status_history" CASCADE');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "order_items" CASCADE');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "orders" CASCADE');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "customers" CASCADE');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "item_price_history" CASCADE');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "item_inventories" CASCADE');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "items" CASCADE');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "inventory_locations" CASCADE');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "order_sources" CASCADE');
    await data_source_1.AppDataSource.query('TRUNCATE TABLE "social_media_content" CASCADE');
    const queryRunner = data_source_1.AppDataSource.createQueryRunner();
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
    const items = [];
    const now = new Date();
    for (const itemData of itemsData) {
        const item = new item_entity_1.Item();
        item.name = itemData.name;
        item.ingredients = itemData.ingredients;
        item.bestBeforeDays = itemData.bestBeforeDays;
        item.imageUrl = itemData.imageUrl;
        const savedItem = await data_source_1.AppDataSource.manager.save(item);
        const histPrice1 = new item_price_history_entity_1.ItemPriceHistory();
        histPrice1.item = savedItem;
        histPrice1.price = Math.round((20 + Math.random() * 80) * 100) / 100;
        histPrice1.changedAt = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        await data_source_1.AppDataSource.manager.save(histPrice1);
        const histPrice2 = new item_price_history_entity_1.ItemPriceHistory();
        histPrice2.item = savedItem;
        histPrice2.price = Math.round((histPrice1.price * (1 + (Math.random() * 0.15 - 0.05))) * 100) / 100;
        histPrice2.changedAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        await data_source_1.AppDataSource.manager.save(histPrice2);
        const histPrice3 = new item_price_history_entity_1.ItemPriceHistory();
        histPrice3.item = savedItem;
        histPrice3.price = Math.round((histPrice2.price * (1 + (Math.random() * 0.10))) * 100) / 100;
        histPrice3.changedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        await data_source_1.AppDataSource.manager.save(histPrice3);
        items.push(savedItem);
    }
    console.log('Seeding order sources...');
    const sourceNames = ['WhatsApp', 'Phone', 'Instagram', 'Website', 'Walk-in'];
    const orderSourcesMap = {};
    for (const name of sourceNames) {
        const src = new order_source_entity_1.OrderSource();
        src.name = name;
        orderSourcesMap[name] = await data_source_1.AppDataSource.manager.save(order_source_entity_1.OrderSource, src);
    }
    console.log('Seeding inventory locations...');
    const hubWest = new inventory_location_entity_1.InventoryLocation();
    hubWest.name = 'Hub West';
    const savedHubWest = await data_source_1.AppDataSource.manager.save(inventory_location_entity_1.InventoryLocation, hubWest);
    const hubSouth = new inventory_location_entity_1.InventoryLocation();
    hubSouth.name = 'Hub South';
    const savedHubSouth = await data_source_1.AppDataSource.manager.save(inventory_location_entity_1.InventoryLocation, hubSouth);
    const hubs = [savedHubWest, savedHubSouth];
    console.log('Seeding item inventories...');
    for (const item of items) {
        for (const hub of hubs) {
            const inv = new item_inventory_entity_1.ItemInventory();
            inv.item = item;
            inv.location = hub;
            inv.quantity = Math.floor(Math.random() * 45) + 5;
            await data_source_1.AppDataSource.manager.save(item_inventory_entity_1.ItemInventory, inv);
        }
    }
    console.log('Seeding customers...');
    const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Ahmedabad'];
    const customerNames = [
        { name: 'Aarav Mehta', gender: enums_1.Gender.MALE },
        { name: 'Ananya Sharma', gender: enums_1.Gender.FEMALE },
        { name: 'Vihaan Patel', gender: enums_1.Gender.MALE },
        { name: 'Diya Iyer', gender: enums_1.Gender.FEMALE },
        { name: 'Sai Ramakrishnan', gender: enums_1.Gender.OTHER },
        { name: 'Kabir Kapoor', gender: enums_1.Gender.MALE },
        { name: 'Ira Deshmukh', gender: enums_1.Gender.FEMALE },
        { name: 'Arjun Verma', gender: enums_1.Gender.MALE },
        { name: 'Riya Gupta', gender: enums_1.Gender.FEMALE },
        { name: 'Reyansh Reddy', gender: enums_1.Gender.MALE },
        { name: 'Aditi Joshi', gender: enums_1.Gender.FEMALE },
        { name: 'Ishaan Bhat', gender: enums_1.Gender.MALE },
        { name: 'Zara Khan', gender: enums_1.Gender.FEMALE },
        { name: 'Karan Malhotra', gender: enums_1.Gender.MALE },
        { name: 'Meera Nair', gender: enums_1.Gender.FEMALE },
        { name: 'Dev Mukherjee', gender: enums_1.Gender.MALE },
        { name: 'Avani Sen', gender: enums_1.Gender.FEMALE },
        { name: 'Rohan Shah', gender: enums_1.Gender.MALE },
        { name: 'Kriti Bansal', gender: enums_1.Gender.FEMALE },
        { name: 'Aanya Trivedi', gender: enums_1.Gender.FEMALE }
    ];
    const customers = [];
    let index = 0;
    for (const c of customerNames) {
        const customer = new customer_entity_1.Customer();
        customer.name = c.name;
        customer.gender = c.gender;
        customer.location = locations[index % locations.length];
        customer.contact = `+91 ${9876543200 + index}`;
        customer.address = `${index + 101}, Snacker's Lane, Sector ${index % 5 + 1}, ${customer.location}`;
        const savedCustomer = await data_source_1.AppDataSource.manager.save(customer);
        customers.push(savedCustomer);
        index++;
    }
    console.log('Seeding orders...');
    const orderStates = [
        enums_1.OrderStatus.PENDING,
        enums_1.OrderStatus.PREPARING,
        enums_1.OrderStatus.READY_TO_DELIVER,
        enums_1.OrderStatus.DELIVERED,
        enums_1.OrderStatus.CANCELLED,
    ];
    const getPriceAtDate = async (itemId, date) => {
        const history = await data_source_1.AppDataSource.manager.find(item_price_history_entity_1.ItemPriceHistory, {
            where: { item: { id: itemId } },
            order: { changedAt: 'ASC' }
        });
        let activePrice = 50.00;
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
        const orderDate = new Date(now.getTime() - (Math.random() * 90 * 24 * 60 * 60 * 1000));
        let status = enums_1.OrderStatus.DELIVERED;
        const daysAgo = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysAgo < 5) {
            status = orderStates[Math.floor(Math.random() * 5)];
        }
        else if (daysAgo < 15) {
            status = Math.random() > 0.15 ? enums_1.OrderStatus.DELIVERED : enums_1.OrderStatus.CANCELLED;
        }
        else {
            status = Math.random() > 0.08 ? enums_1.OrderStatus.DELIVERED : enums_1.OrderStatus.CANCELLED;
        }
        const order = new order_entity_1.Order();
        order.orderNumber = `KB-${String(orderCounter).padStart(5, '0')}`;
        order.customer = customer;
        order.status = status;
        order.createdAt = orderDate;
        order.updatedAt = orderDate;
        order.totalAmount = 0;
        const sources = ['WhatsApp', 'Phone', 'Instagram', 'Website', 'Walk-in'];
        order.source = orderSourcesMap[sources[i % sources.length]];
        const westLocations = ['Mumbai', 'Pune', 'Ahmedabad'];
        const assignedHub = westLocations.includes(customer.location) ? savedHubWest : savedHubSouth;
        order.fulfillmentHub = assignedHub;
        if (Math.random() < 0.85) {
            order.expectedDeliveryDate = new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000);
        }
        order.deliveryLocation = `${customer.location} Delivery Point #${(i % 3) + 1}`;
        if (status === enums_1.OrderStatus.DELIVERED) {
            order.paymentStatus = enums_1.PaymentStatus.PAID;
            const modes = [enums_1.PaymentMode.UPI, enums_1.PaymentMode.CARD, enums_1.PaymentMode.CASH, enums_1.PaymentMode.NET_BANKING];
            order.paymentMode = modes[i % modes.length];
            order.paymentUpdatedAt = new Date(orderDate.getTime() + 24 * 60 * 60 * 1000);
            if (order.paymentMode === enums_1.PaymentMode.CASH) {
                order.cashCollectionDetails = i % 2 === 0 ? 'Counter Register A' : 'Delivery Rider - Suresh';
            }
        }
        else {
            order.paymentStatus = enums_1.PaymentStatus.UNPAID;
            if (Math.random() < 0.1) {
                order.paymentStatus = enums_1.PaymentStatus.PAID;
                order.paymentMode = enums_1.PaymentMode.UPI;
                order.paymentUpdatedAt = new Date(orderDate.getTime() + 2 * 60 * 60 * 1000);
            }
        }
        const savedOrder = await data_source_1.AppDataSource.manager.save(order);
        const numItemsInOrder = 1 + Math.floor(Math.random() * 3);
        const chosenItems = [...items].sort(() => 0.5 - Math.random()).slice(0, numItemsInOrder);
        let totalAmount = 0;
        const orderItems = [];
        for (const item of chosenItems) {
            const priceAtOrder = await getPriceAtDate(item.id, orderDate);
            const quantity = 1 + Math.floor(Math.random() * 3);
            const orderItem = new order_item_entity_1.OrderItem();
            orderItem.order = savedOrder;
            orderItem.item = item;
            orderItem.quantity = quantity;
            orderItem.priceAtOrder = priceAtOrder;
            await data_source_1.AppDataSource.manager.save(orderItem);
            totalAmount += priceAtOrder * quantity;
        }
        savedOrder.totalAmount = Math.round(totalAmount * 100) / 100;
        await data_source_1.AppDataSource.manager.save(savedOrder);
        const addHistory = async (hstStatus, hoursDelay) => {
            const hist = new order_status_history_entity_1.OrderStatusHistory();
            hist.order = savedOrder;
            hist.status = hstStatus;
            hist.changedAt = new Date(orderDate.getTime() + hoursDelay * 60 * 60 * 1000);
            hist.changedBy = hstStatus === enums_1.OrderStatus.PREPARING ? 'Kitchen Staff' :
                hstStatus === enums_1.OrderStatus.READY_TO_DELIVER ? 'Fulfillment Manager' :
                    hstStatus === enums_1.OrderStatus.DELIVERED ? 'Delivery Agent' : 'Admin';
            await data_source_1.AppDataSource.manager.save(hist);
            if (hstStatus === enums_1.OrderStatus.PENDING) {
                const log = new whatsapp_log_entity_1.WhatsappLog();
                log.order = savedOrder;
                log.recipientName = customer.name;
                log.recipientContact = customer.contact;
                log.triggeringEvent = 'Order Created (Pending)';
                log.status = Math.random() > 0.05 ? enums_1.WhatsappLogStatus.DELIVERED : enums_1.WhatsappLogStatus.FAILED;
                if (log.status === enums_1.WhatsappLogStatus.FAILED) {
                    log.errorMessage = 'Network Timeout / Meta API Drop';
                }
                log.timestamp = hist.changedAt;
                await data_source_1.AppDataSource.manager.save(log);
            }
            else if (hstStatus === enums_1.OrderStatus.READY_TO_DELIVER) {
                const log = new whatsapp_log_entity_1.WhatsappLog();
                log.order = savedOrder;
                log.recipientName = customer.name;
                log.recipientContact = customer.contact;
                log.triggeringEvent = 'Ready to Deliver';
                log.status = Math.random() > 0.05 ? enums_1.WhatsappLogStatus.DELIVERED : enums_1.WhatsappLogStatus.FAILED;
                if (log.status === enums_1.WhatsappLogStatus.FAILED) {
                    log.errorMessage = 'Invalid Contact Format / Carrier Rejection';
                }
                log.timestamp = hist.changedAt;
                await data_source_1.AppDataSource.manager.save(log);
            }
            else if (hstStatus === enums_1.OrderStatus.DELIVERED) {
                const log = new whatsapp_log_entity_1.WhatsappLog();
                log.order = savedOrder;
                log.recipientName = customer.name;
                log.recipientContact = customer.contact;
                log.triggeringEvent = 'Order Delivered (Payment Confirmed)';
                log.status = enums_1.WhatsappLogStatus.SENT;
                log.timestamp = hist.changedAt;
                await data_source_1.AppDataSource.manager.save(log);
            }
        };
        await addHistory(enums_1.OrderStatus.PENDING, 0);
        if (status === enums_1.OrderStatus.PENDING) {
        }
        else if (status === enums_1.OrderStatus.PREPARING) {
            await addHistory(enums_1.OrderStatus.PREPARING, 1);
        }
        else if (status === enums_1.OrderStatus.READY_TO_DELIVER) {
            await addHistory(enums_1.OrderStatus.PREPARING, 1);
            await addHistory(enums_1.OrderStatus.READY_TO_DELIVER, 3);
        }
        else if (status === enums_1.OrderStatus.DELIVERED) {
            await addHistory(enums_1.OrderStatus.PREPARING, 1);
            await addHistory(enums_1.OrderStatus.READY_TO_DELIVER, 3);
            await addHistory(enums_1.OrderStatus.DELIVERED, 24);
        }
        else if (status === enums_1.OrderStatus.CANCELLED) {
            const cancelStage = Math.random();
            if (cancelStage < 0.25) {
                await addHistory(enums_1.OrderStatus.CANCELLED, 0.5);
            }
            else if (cancelStage < 0.6) {
                await addHistory(enums_1.OrderStatus.PREPARING, 1);
                await addHistory(enums_1.OrderStatus.CANCELLED, 1.5);
            }
            else {
                await addHistory(enums_1.OrderStatus.PREPARING, 1);
                await addHistory(enums_1.OrderStatus.READY_TO_DELIVER, 3);
                await addHistory(enums_1.OrderStatus.CANCELLED, 4.5);
            }
        }
        orderCounter++;
    }
    console.log('Seeding social media content calendar...');
    const socialItems = [
        {
            title: 'Summer Snacking Launch',
            caption: 'Beat the heat with our new Spicy Banana Wafers! Hand-crafted with authentic coconut oil and seasoned with rock salt and pepper. Grab yours today!',
            scheduledAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            mediaUrl: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=500',
            platforms: ['Instagram', 'Facebook'],
            checklist: { 'Graphic Design': true, 'Caption Drafted': true, 'Approval': true, 'Published': true }
        },
        {
            title: 'Monsoon Chai & Samosa Combo Promo',
            caption: 'Rainy evenings are incomplete without hot chai and our Crispy Sacha Samosas! Order a pack of 5 now and get 20% off.',
            scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
            mediaUrl: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500',
            platforms: ['Instagram', 'LinkedIn', 'Facebook'],
            checklist: { 'Graphic Design': true, 'Caption Drafted': true, 'Approval': false, 'Published': false }
        },
        {
            title: 'Butter Cookies Snack Box Feature',
            caption: 'Rich, crumbly, and filled with pure butter goodness. Our Sweet Butter Cookies make the perfect gifting box for friends and family.',
            scheduledAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
            mediaUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500',
            platforms: ['Instagram'],
            checklist: { 'Graphic Design': false, 'Caption Drafted': true, 'Approval': false, 'Published': false }
        },
        {
            title: 'Homegrown Indian Snacks Spotlight',
            caption: 'Every crunch of Krunchy Brunchy Sev Murmura carries the authentic flavors of India. 100% homegrown, 100% munchy!',
            scheduledAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
            mediaUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500',
            platforms: ['Facebook', 'Instagram'],
            checklist: { 'Graphic Design': true, 'Caption Drafted': true, 'Approval': true, 'Published': true }
        }
    ];
    for (const s of socialItems) {
        const content = new social_media_content_entity_1.SocialMediaContent();
        content.title = s.title;
        content.caption = s.caption;
        content.scheduledAt = s.scheduledAt;
        content.mediaUrl = s.mediaUrl;
        content.platforms = s.platforms;
        content.checklist = s.checklist;
        await data_source_1.AppDataSource.manager.save(content);
    }
    console.log('Seeding completed successfully!');
    await data_source_1.AppDataSource.destroy();
}
seed().catch((err) => {
    console.error('Error during seeding:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map