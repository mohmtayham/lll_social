import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import {
  getPublicMediaPath,
  resolveMediaAbsolutePath,
  serializeMedia,
} from './media-storage';

type UploadedMediaFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  // تحويل الأرقام إلى BigInt
  private toBigInt(value: string | number | bigint): bigint {
    return typeof value === 'bigint' ? value : BigInt(value);
  }

  private async getMediaRow(idRaw: string | number) {
    const media = await this.prisma.media.findUnique({
      where: { id: this.toBigInt(idRaw) },
    });

    if (!media) throw new NotFoundException('Media file not found');
    return media;
  }

  async getFile(idRaw: string | number, req?: Request) {
    const media = await this.getMediaRow(idRaw);
    const absolutePath = resolveMediaAbsolutePath(media);

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Media file is missing on disk');
    }

    return {
      media: serializeMedia(media, req),
      absolutePath,
    };
  }

  // 1. إنشاء سجل الميديا (يتم استدعاؤها بعد حفظ الملف باستخدام Multer)
  async createMediaRecord(userIdRaw: string | number, file: UploadedMediaFile, req?: Request) {
    if (!file) {
      throw new BadRequestException('No file was uploaded');
    }

    const uploadedBy = this.toBigInt(userIdRaw);

    const media = await this.prisma.media.create({
      data: {
        fileName: file.filename,
        originalName: file.originalname || file.filename,
        mimeType: file.mimetype || 'application/octet-stream',
        size: BigInt(file.size),
        path: getPublicMediaPath(file.filename),
        uploadedBy: uploadedBy,
      },
    });

    return serializeMedia(media, req);
  }

  // 2. جلب ميديا محددة
  async findOne(idRaw: string | number, req?: Request) {
    const media = await this.getMediaRow(idRaw);

    return serializeMedia(media, req);
  }

  // 3. حذف الملف فيزيائياً ومن قاعدة البيانات (مع التأكد من الملكية)
  async removeForUser(mediaIdRaw: string | number, userIdRaw: string | number) {
    const mediaId = this.toBigInt(mediaIdRaw);
    const userId = this.toBigInt(userIdRaw);

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });

    if (!media) throw new NotFoundException('Media file not found');
    
    // حماية: لا يمكن لأحد حذف الملف إلا من قام برفعه (أو الـ Admin)
    if (media.uploadedBy !== userId) {
      throw new ForbiddenException('You do not have permission to delete this media file');
    }

    // أ. حذف الملف من السيرفر (Hard Drive)
    const absolutePath = resolveMediaAbsolutePath(media);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath); // حذف الملف
    }

    // ب. حذف السجل من قاعدة البيانات
    const deleted = await this.prisma.media.delete({
      where: { id: mediaId },
    });

    return serializeMedia(deleted);
  }
}
