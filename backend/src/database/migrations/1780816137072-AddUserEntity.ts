import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEntity1780816137072 implements MigrationInterface {
  name = 'AddUserEntity1780816137072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_fulfillmentHub"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_inventories" DROP CONSTRAINT "FK_item_inventories_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_inventories" DROP CONSTRAINT "FK_item_inventories_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_inventories" DROP CONSTRAINT "UQ_item_inventories_item_location"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('SuperAdmin', 'Admin')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "name" character varying(150) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'Admin', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_inventories" ADD CONSTRAINT "UQ_6ebce19358effa495c3334dd4e5" UNIQUE ("itemId", "locationId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_a1338be7dad63518a5a81adb08d" FOREIGN KEY ("sourceId") REFERENCES "order_sources"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_eebe38da4148116a97d6030d93e" FOREIGN KEY ("fulfillmentHubId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_inventories" ADD CONSTRAINT "FK_cb35b475ce3518372f2917311fb" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_inventories" ADD CONSTRAINT "FK_091db7cdf2b0bb430913a49c8c2" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "item_inventories" DROP CONSTRAINT "FK_091db7cdf2b0bb430913a49c8c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_inventories" DROP CONSTRAINT "FK_cb35b475ce3518372f2917311fb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_eebe38da4148116a97d6030d93e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_a1338be7dad63518a5a81adb08d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_inventories" DROP CONSTRAINT "UQ_6ebce19358effa495c3334dd4e5"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TABLE "item_inventories" ADD CONSTRAINT "UQ_item_inventories_item_location" UNIQUE ("itemId", "locationId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_inventories" ADD CONSTRAINT "FK_item_inventories_location" FOREIGN KEY ("locationId") REFERENCES "inventory_locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_inventories" ADD CONSTRAINT "FK_item_inventories_item" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_source" FOREIGN KEY ("sourceId") REFERENCES "order_sources"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_fulfillmentHub" FOREIGN KEY ("fulfillmentHubId") REFERENCES "inventory_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
