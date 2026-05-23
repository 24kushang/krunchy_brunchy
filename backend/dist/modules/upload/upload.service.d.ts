import { ConfigService } from '@nestjs/config';
export declare class UploadService {
    private configService;
    private readonly logger;
    private driveClient;
    private folderId;
    constructor(configService: ConfigService);
    uploadFile(file: Express.Multer.File): Promise<string>;
}
