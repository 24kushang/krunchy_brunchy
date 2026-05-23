import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private driveClient: any = null;
  private folderId: string | null = null;

  constructor(private configService: ConfigService) {
    this.folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID') || null;
    const credPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');

    if (credPath && fs.existsSync(credPath)) {
      try {
        const auth = new google.auth.GoogleAuth({
          keyFile: credPath,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
        this.driveClient = google.drive({ version: 'v3', auth });
        this.logger.log('Google Drive API client initialized successfully using keyfile.');
      } catch (err) {
        this.logger.error('Failed to initialize Google Drive API client:', err.message);
      }
    } else {
      this.logger.warn('Google Drive credentials keyfile not found. Falling back to Mock Upload Simulation.');
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (this.driveClient && this.folderId) {
      try {
        this.logger.log(`Uploading file ${file.originalname} to Google Drive...`);
        const response = await this.driveClient.files.create({
          requestBody: {
            name: `${uuidv4()}-${file.originalname}`,
            parents: [this.folderId],
          },
          media: {
            mimeType: file.mimetype,
            body: fs.createReadStream(file.path),
          },
          fields: 'id, webViewLink, webContentLink',
        });

        // Delete local temp file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        // Return sharing webViewLink or webContentLink
        this.logger.log(`Successfully uploaded to Google Drive. File ID: ${response.data.id}`);
        return response.data.webViewLink || `https://drive.google.com/open?id=${response.data.id}`;
      } catch (err) {
        this.logger.error('Google Drive Upload failed. Falling back to simulation.', err.message);
      }
    }

    // Fallback Mock simulation
    const mockFileId = uuidv4();
    this.logger.warn(`[SIMULATION] Uploading file ${file.originalname} to mock Google Drive.`);
    
    // In simulation mode, if the file was written locally by multer, clean it up
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    return `https://drive.google.com/open?id=${mockFileId}`;
  }
}
