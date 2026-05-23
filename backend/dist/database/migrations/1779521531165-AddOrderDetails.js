"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddOrderDetails1779521531165 = void 0;
class AddOrderDetails1779521531165 {
    name = 'AddOrderDetails1779521531165';
    async up(queryRunner) {
        await queryRunner.query(`CREATE TYPE "public"."orders_source_enum" AS ENUM('WhatsApp', 'Phone', 'Instagram', 'Website', 'Walk-in')`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "source" "public"."orders_source_enum" NOT NULL DEFAULT 'Phone'`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "expectedDeliveryDate" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "deliveryLocation" character varying(255)`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "deliveryLocation"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "expectedDeliveryDate"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "source"`);
        await queryRunner.query(`DROP TYPE "public"."orders_source_enum"`);
    }
}
exports.AddOrderDetails1779521531165 = AddOrderDetails1779521531165;
//# sourceMappingURL=1779521531165-AddOrderDetails.js.map