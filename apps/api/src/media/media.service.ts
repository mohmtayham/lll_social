import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

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

  // 1. إنشاء سجل الميديا (يتم استدعاؤها بعد حفظ الملف باستخدام Multer)
  async createMediaRecord(userIdRaw: string | number, file: UploadedMediaFile) {
    const uploadedBy = this.toBigInt(userIdRaw);

    const media = await this.prisma.media.create({
      data: {
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: BigInt(file.size),
        path: file.path, // مثلاً: uploads/images/12345.jpg
        uploadedBy: uploadedBy,
      },
    });

    return media;
  }

  // 2. جلب ميديا محددة
  async findOne(idRaw: string | number) {                                                                                                                                                             
    const media = await this.prisma.media.findUnique({
      where: { id: this.toBigInt(idRaw) },
    });

    if (!media) throw new NotFoundException('الملف غير موجود');
    return media;
  }

  // 3. حذف الملف فيزيائياً ومن قاعدة البيانات (مع التأكد من الملكية)
  async removeForUser(mediaIdRaw: string | number, userIdRaw: string | number) {
    const mediaId = this.toBigInt(mediaIdRaw);
    const userId = this.toBigInt(userIdRaw);

    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });

    if (!media) throw new NotFoundException('الملف غير موجود');
    
    // حماية: لا يمكن لأحد حذف الملف إلا من قام برفعه (أو الـ Admin)
    if (media.uploadedBy !== userId) {
      throw new ForbiddenException('لا تملك صلاحية حذف هذا الملف');
    }

    // أ. حذف الملف من السيرفر (Hard Drive)
    const absolutePath = path.resolve(media.path);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath); // حذف الملف
    }

    // ب. حذف السجل من قاعدة البيانات
    return await this.prisma.media.delete({
      where: { id: mediaId },
    });
  }
}