import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCostPriceToItemPriceHistory1781800000000 implements MigrationInterface {
  name = 'AddCostPriceToItemPriceHistory1781800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "item_price_history" ADD COLUMN "costPrice" DECIMAL(10,2) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "item_price_history" DROP COLUMN "costPrice"`,
    );
  }
}
