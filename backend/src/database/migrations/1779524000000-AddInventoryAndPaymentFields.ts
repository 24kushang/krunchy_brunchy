import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInventoryAndPaymentFields1779524000000 implements MigrationInterface {
    name = 'AddInventoryAndPaymentFields1779524000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create order_sources table
        await queryRunner.query(`CREATE TABLE "order_sources" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying(100) NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_order_sources_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_order_sources_name" UNIQUE ("name")
        )`);

        // 2. Create inventory_locations table
        await queryRunner.query(`CREATE TABLE "inventory_locations" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "name" character varying(100) NOT NULL,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_inventory_locations_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_inventory_locations_name" UNIQUE ("name")
        )`);

        // 3. Create item_inventories table
        await queryRunner.query(`CREATE TABLE "item_inventories" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "quantity" integer NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            "itemId" uuid,
            "locationId" uuid,
            CONSTRAINT "PK_item_inventories_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_item_inventories_item_location" UNIQUE ("itemId", "locationId"),
            CONSTRAINT "FK_item_inventories_item" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_item_inventories_location" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE CASCADE
        )`);

        // 4. Add address column to customers table
        await queryRunner.query(`ALTER TABLE "customers" ADD "address" text`);

        // 5. Add columns to orders table
        await queryRunner.query(`CREATE TYPE "public"."orders_paymentstatus_enum" AS ENUM('Paid', 'Unpaid')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "paymentStatus" "public"."orders_paymentstatus_enum" NOT NULL DEFAULT 'Unpaid'`);

        await queryRunner.query(`CREATE TYPE "public"."orders_paymentmode_enum" AS ENUM('Cash', 'UPI', 'Card', 'Net Banking')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "paymentMode" "public"."orders_paymentmode_enum"`);

        await queryRunner.query(`ALTER TABLE "orders" ADD "cashCollectionDetails" text`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "paymentUpdatedAt" TIMESTAMP`);

        await queryRunner.query(`ALTER TABLE "orders" ADD "fulfillmentHubId" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_fulfillmentHub" FOREIGN KEY ("fulfillmentHubId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL`);

        await queryRunner.query(`ALTER TABLE "orders" ADD "sourceId" uuid`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_source" FOREIGN KEY ("sourceId") REFERENCES "order_sources"("id") ON DELETE SET NULL`);

        // 6. Populate default data
        await queryRunner.query(`INSERT INTO "order_sources" ("name") VALUES ('WhatsApp'), ('Phone'), ('Instagram'), ('Website'), ('Walk-in') ON CONFLICT DO NOTHING`);
        await queryRunner.query(`INSERT INTO "inventory_locations" ("name") VALUES ('Hub West'), ('Hub South') ON CONFLICT DO NOTHING`);

        // 7. Map existing orders' text values to sourceId
        await queryRunner.query(`UPDATE "orders" SET "sourceId" = (SELECT "id" FROM "order_sources" WHERE "name" = 'Phone') WHERE "source"::text = 'Phone'`);
        await queryRunner.query(`UPDATE "orders" SET "sourceId" = (SELECT "id" FROM "order_sources" WHERE "name" = 'WhatsApp') WHERE "source"::text = 'WhatsApp'`);
        await queryRunner.query(`UPDATE "orders" SET "sourceId" = (SELECT "id" FROM "order_sources" WHERE "name" = 'Instagram') WHERE "source"::text = 'Instagram'`);
        await queryRunner.query(`UPDATE "orders" SET "sourceId" = (SELECT "id" FROM "order_sources" WHERE "name" = 'Website') WHERE "source"::text = 'Website'`);
        await queryRunner.query(`UPDATE "orders" SET "sourceId" = (SELECT "id" FROM "order_sources" WHERE "name" = 'Walk-in') WHERE "source"::text = 'Walk-in'`);

        // 8. Clean up old source column
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "source"`);
        await queryRunner.query(`DROP TYPE "public"."orders_source_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback: Re-create old type and column
        await queryRunner.query(`CREATE TYPE "public"."orders_source_enum" AS ENUM('WhatsApp', 'Phone', 'Instagram', 'Website', 'Walk-in')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "source" "public"."orders_source_enum" NOT NULL DEFAULT 'Phone'`);

        // Map back sourceIds to enum text
        await queryRunner.query(`UPDATE "orders" SET "source" = 'Phone' WHERE "sourceId" = (SELECT "id" FROM "order_sources" WHERE "name" = 'Phone')`);
        await queryRunner.query(`UPDATE "orders" SET "source" = 'WhatsApp' WHERE "sourceId" = (SELECT "id" FROM "order_sources" WHERE "name" = 'WhatsApp')`);
        await queryRunner.query(`UPDATE "orders" SET "source" = 'Instagram' WHERE "sourceId" = (SELECT "id" FROM "order_sources" WHERE "name" = 'Instagram')`);
        await queryRunner.query(`UPDATE "orders" SET "source" = 'Website' WHERE "sourceId" = (SELECT "id" FROM "order_sources" WHERE "name" = 'Website')`);
        await queryRunner.query(`UPDATE "orders" SET "source" = 'Walk-in' WHERE "sourceId" = (SELECT "id" FROM "order_sources" WHERE "name" = 'Walk-in')`);

        // Drop new foreign keys and columns
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_source"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "sourceId"`);

        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_fulfillmentHub"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "fulfillmentHubId"`);

        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paymentUpdatedAt"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "cashCollectionDetails"`);

        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paymentMode"`);
        await queryRunner.query(`DROP TYPE "public"."orders_paymentmode_enum"`);

        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paymentStatus"`);
        await queryRunner.query(`DROP TYPE "public"."orders_paymentstatus_enum"`);

        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "address"`);

        await queryRunner.query(`DROP TABLE "item_inventories"`);
        await queryRunner.query(`DROP TABLE "inventory_locations"`);
        await queryRunner.query(`DROP TABLE "order_sources"`);
    }
}
