import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPendingToWhatsappLogStatus1781163000137 implements MigrationInterface {
    name = 'AddPendingToWhatsappLogStatus1781163000137'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."whatsapp_logs_status_enum" ADD VALUE 'Pending'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."whatsapp_logs_status_enum_old" AS ENUM('Sent', 'Delivered', 'Failed')`);
        await queryRunner.query(`ALTER TABLE "whatsapp_logs" ALTER COLUMN "status" TYPE "public"."whatsapp_logs_status_enum_old" USING "status"::"text"::"public"."whatsapp_logs_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."whatsapp_logs_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."whatsapp_logs_status_enum_old" RENAME TO "whatsapp_logs_status_enum"`);
    }

}
