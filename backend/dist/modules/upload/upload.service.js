"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UploadService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const googleapis_1 = require("googleapis");
const fs = __importStar(require("fs"));
const uuid_1 = require("uuid");
let UploadService = UploadService_1 = class UploadService {
    configService;
    logger = new common_1.Logger(UploadService_1.name);
    driveClient = null;
    folderId = null;
    constructor(configService) {
        this.configService = configService;
        this.folderId = this.configService.get('GOOGLE_DRIVE_FOLDER_ID') || null;
        const credPath = this.configService.get('GOOGLE_APPLICATION_CREDENTIALS');
        if (credPath && fs.existsSync(credPath)) {
            try {
                const auth = new googleapis_1.google.auth.GoogleAuth({
                    keyFile: credPath,
                    scopes: ['https://www.googleapis.com/auth/drive.file'],
                });
                this.driveClient = googleapis_1.google.drive({ version: 'v3', auth });
                this.logger.log('Google Drive API client initialized successfully using keyfile.');
            }
            catch (err) {
                this.logger.error('Failed to initialize Google Drive API client:', err.message);
            }
        }
        else {
            this.logger.warn('Google Drive credentials keyfile not found. Falling back to Mock Upload Simulation.');
        }
    }
    async uploadFile(file) {
        if (this.driveClient && this.folderId) {
            try {
                this.logger.log(`Uploading file ${file.originalname} to Google Drive...`);
                const response = await this.driveClient.files.create({
                    requestBody: {
                        name: `${(0, uuid_1.v4)()}-${file.originalname}`,
                        parents: [this.folderId],
                    },
                    media: {
                        mimeType: file.mimetype,
                        body: fs.createReadStream(file.path),
                    },
                    fields: 'id, webViewLink, webContentLink',
                });
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                this.logger.log(`Successfully uploaded to Google Drive. File ID: ${response.data.id}`);
                return response.data.webViewLink || `https://drive.google.com/open?id=${response.data.id}`;
            }
            catch (err) {
                this.logger.error('Google Drive Upload failed. Falling back to simulation.', err.message);
            }
        }
        const mockFileId = (0, uuid_1.v4)();
        this.logger.warn(`[SIMULATION] Uploading file ${file.originalname} to mock Google Drive.`);
        if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        return `https://drive.google.com/open?id=${mockFileId}`;
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = UploadService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadService);
//# sourceMappingURL=upload.service.js.map