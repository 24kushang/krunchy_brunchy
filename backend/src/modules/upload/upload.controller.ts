import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {
    // Ensure temporary uploads directory exists
    if (!fs.existsSync('./temp-uploads')) {
      fs.mkdirSync('./temp-uploads');
    }
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './temp-uploads',
        filename: (req: any, file: any, callback: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limits for videos/images
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded or file parameter name must be "file"');
    }

    try {
      const url = await this.uploadService.uploadFile(file);
      return { url };
    } catch (err) {
      throw new BadRequestException(`Upload failed: ${err.message}`);
    }
  }
}
