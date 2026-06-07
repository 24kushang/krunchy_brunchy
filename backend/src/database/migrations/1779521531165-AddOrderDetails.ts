import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderDetails1779521531165 implements MigrationInterface {
  name = 'AddOrderDetails1779521531165';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_source_enum" AS ENUM('WhatsApp', 'Phone', 'Instagram', 'Website', 'Walk-in')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "source" "public"."orders_source_enum" NOT NULL DEFAULT 'Phone'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "expectedDeliveryDate" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "deliveryLocation" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "deliveryLocation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "expectedDeliveryDate"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "source"`);
    await queryRunner.query(`DROP TYPE "public"."orders_source_enum"`);
  }
}
