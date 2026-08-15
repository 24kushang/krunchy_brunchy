import { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerContactNullable1782000000000
  implements MigrationInterface
{
  name = 'CustomerContactNullable1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" ALTER COLUMN "contact" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" ALTER COLUMN "contact" SET NOT NULL`,
    );
  }
}
