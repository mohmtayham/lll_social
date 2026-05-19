import { Controller, Delete, Param, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { MediaService } from './media.service';

const UPLOADS_DIR = './uploads/media';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          // Auto-generate a safe, unique filename
          cb(null, `media-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB restriction
    }),
  )
  async uploadFile(@Req() req, @UploadedFile() file: Express.Multer.File) {
    // Multer automatically extracts originalname, mimetype, size, and saves the file giving us the path!
    return this.mediaService.createMediaRecord(req.user.id, file);
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.mediaService.removeForUser(id, req.user.id);
  }
}
