import { BadRequestException, Controller, Delete, Get, Param, Post, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { MediaService } from './media.service';
import { MEDIA_UPLOADS_DIR, buildMediaFileName, ensureMediaUploadsDir } from './media-storage';

ensureMediaUploadsDir();

const configuredMaxUploadSizeMb = Number(process.env.MAX_MEDIA_UPLOAD_MB ?? 200);
const maxUploadSizeMb = Number.isFinite(configuredMaxUploadSizeMb)
  ? configuredMaxUploadSizeMb
  : 200;
const maxUploadSizeBytes = Math.max(maxUploadSizeMb, 1) * 1024 * 1024;

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: diskStorage({
        destination: MEDIA_UPLOADS_DIR,
        filename: (req, file, cb) => {
          cb(null, buildMediaFileName(file.originalname, file.mimetype, file.fieldname));
        },
      }),
      limits: { fileSize: maxUploadSizeBytes },
    }),
  )
  async uploadFile(@Req() req, @UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) {
      throw new BadRequestException('No file was uploaded');
    }

    const media = await Promise.all(
      files.map((file) => this.mediaService.createMediaRecord(req.user.id, file, req)),
    );

    return media.length === 1 ? media[0] : media;
  }

  @Get(':id/file')
  async openFile(@Req() req, @Param('id') id: string, @Res() res: Response) {
    const { media, absolutePath } = await this.mediaService.getFile(id, req);
    const fileName = String(media.originalName || media.fileName).replace(/["\r\n]/g, '_');

    res.setHeader('Content-Type', media.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    return res.sendFile(absolutePath);
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.mediaService.findOne(id, req);
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.mediaService.removeForUser(id, req.user.id);
  }
}
