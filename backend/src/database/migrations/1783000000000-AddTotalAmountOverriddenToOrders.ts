import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTotalAmountOverriddenToOrders1783000000000
  implements MigrationInterface
{
  name = 'AddTotalAmountOverriddenToOrders1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "totalAmountOverridden" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "totalAmountOverridden"`,
    );
  }
}
