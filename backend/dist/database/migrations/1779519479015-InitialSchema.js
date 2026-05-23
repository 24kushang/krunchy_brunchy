"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1779519479015 = void 0;
class InitialSchema1779519479015 {
    name = 'InitialSchema1779519479015';
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "item_price_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "price" numeric(10,2) NOT NULL, "changedAt" TIMESTAMP NOT NULL DEFAULT now(), "itemId" uuid, CONSTRAINT "PK_b4efa31733f94b697fedc2d961c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "ingredients" text, "bestBeforeDays" integer NOT NULL, "imageUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_213736582899b3599acaade2cd1" UNIQUE ("name"), CONSTRAINT "PK_ba5885359424c15ca6b9e79bcf6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" integer NOT NULL, "priceAtOrder" numeric(10,2) NOT NULL, "orderId" uuid, "itemId" uuid, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."order_status_history_status_enum" AS ENUM('Pending', 'Preparing', 'Ready to Deliver', 'Delivered', 'Cancelled')`);
        await queryRunner.query(`CREATE TABLE "order_status_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."order_status_history_status_enum" NOT NULL, "changedAt" TIMESTAMP NOT NULL DEFAULT now(), "changedBy" character varying NOT NULL DEFAULT 'Admin', "orderId" uuid, CONSTRAINT "PK_e6c66d853f155531985fc4f6ec8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."whatsapp_logs_status_enum" AS ENUM('Sent', 'Delivered', 'Failed')`);
        await queryRunner.query(`CREATE TABLE "whatsapp_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "recipientName" character varying(150) NOT NULL, "recipientContact" character varying(50) NOT NULL, "triggeringEvent" character varying(100) NOT NULL, "status" "public"."whatsapp_logs_status_enum" NOT NULL, "errorMessage" text, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "orderId" uuid, CONSTRAINT "PK_cf09d6935d3e7c0c38a6eefb849" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('Pending', 'Preparing', 'Ready to Deliver', 'Delivered', 'Cancelled')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderNumber" character varying(50) NOT NULL, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'Pending', "totalAmount" numeric(10,2) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "customerId" uuid, CONSTRAINT "UQ_59b0c3b34ea0fa5562342f24143" UNIQUE ("orderNumber"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."customers_gender_enum" AS ENUM('Male', 'Female', 'Other')`);
        await queryRunner.query(`CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "contact" character varying(50) NOT NULL, "gender" "public"."customers_gender_enum" NOT NULL, "location" character varying(100) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0c8ddefa3851929d64b66b76a3c" UNIQUE ("contact"), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "social_media_content" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(250) NOT NULL, "caption" text NOT NULL, "scheduledAt" TIMESTAMP NOT NULL, "mediaUrl" character varying, "platforms" text NOT NULL, "checklist" jsonb NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9ac8c4d3b019c480ef411033198" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "item_price_history" ADD CONSTRAINT "FK_439897299212ad943404d5f16b7" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_e253fbd572683bcc785a70cbca7" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_status_history" ADD CONSTRAINT "FK_689db3835e5550e68d26ca32676" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "whatsapp_logs" ADD CONSTRAINT "FK_940d96e11520ddb9025fb49bd5a" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1"`);
        await queryRunner.query(`ALTER TABLE "whatsapp_logs" DROP CONSTRAINT "FK_940d96e11520ddb9025fb49bd5a"`);
        await queryRunner.query(`ALTER TABLE "order_status_history" DROP CONSTRAINT "FK_689db3835e5550e68d26ca32676"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_e253fbd572683bcc785a70cbca7"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"`);
        await queryRunner.query(`ALTER TABLE "item_price_history" DROP CONSTRAINT "FK_439897299212ad943404d5f16b7"`);
        await queryRunner.query(`DROP TABLE "social_media_content"`);
        await queryRunner.query(`DROP TABLE "customers"`);
        await queryRunner.query(`DROP TYPE "public"."customers_gender_enum"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TABLE "whatsapp_logs"`);
        await queryRunner.query(`DROP TYPE "public"."whatsapp_logs_status_enum"`);
        await queryRunner.query(`DROP TABLE "order_status_history"`);
        await queryRunner.query(`DROP TYPE "public"."order_status_history_status_enum"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP TABLE "items"`);
        await queryRunner.query(`DROP TABLE "item_price_history"`);
    }
}
exports.InitialSchema1779519479015 = InitialSchema1779519479015;
//# sourceMappingURL=1779519479015-InitialSchema.js.map