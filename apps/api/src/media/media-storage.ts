import type { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export const UPLOADS_ROOT = process.env.UPLOADS_ROOT
  ? path.resolve(process.env.UPLOADS_ROOT)
  : path.resolve(__dirname, '..', '..', 'uploads');

export const MEDIA_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'media');
export const PUBLIC_UPLOADS_PREFIX = '/uploads';
export const PUBLIC_MEDIA_PREFIX = `${PUBLIC_UPLOADS_PREFIX}/media`;

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/mpeg': '.mpeg',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'video/x-msvideo': '.avi',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/mp4': '.m4a',
  'audio/aac': '.aac',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/opus': '.opus',
};

function getConfiguredBaseUrl(): string | null {
  const configured =
    process.env.API_PUBLIC_URL ??
    process.env.PUBLIC_API_URL ??
    process.env.BACKEND_URL;

  return configured ? configured.replace(/\/+$/, '') : null;
}

function getRequestBaseUrl(req?: Request): string {
  const configured = getConfiguredBaseUrl();
  if (configured) return configured;

  const host = req?.get?.('host') ?? `localhost:${process.env.PORT ?? 8000}`;
  const forwardedProto = req?.get?.('x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProto || req?.protocol || 'http';

  return `${protocol}://${host}`;
}

export function ensureMediaUploadsDir() {
  fs.mkdirSync(MEDIA_UPLOADS_DIR, { recursive: true });
}

export function getSafeMediaExtension(
  originalName?: string,
  mimeType?: string,
  fieldName?: string,
): string {
  const ext = path.extname(originalName ?? '').toLowerCase();

  if (ext && /^[a-z0-9.]+$/.test(ext) && ext.length <= 12) {
    return ext;
  }

  const normalizedMimeType = mimeType?.split(';')[0]?.trim().toLowerCase();
  const mimeExtension = normalizedMimeType ? MIME_EXTENSION_MAP[normalizedMimeType] : undefined;
  if (mimeExtension) return mimeExtension;

  const normalizedFieldName = fieldName?.toLowerCase() ?? '';
  if (normalizedFieldName.includes('voice') || normalizedFieldName.includes('audio')) {
    return '.webm';
  }

  if (normalizedFieldName.includes('video')) {
    return '.mp4';
  }

  if (normalizedFieldName.includes('image') || normalizedFieldName.includes('photo')) {
    return '.jpg';
  }

  return '';
}

export function buildMediaFileName(
  originalName?: string,
  mimeType?: string,
  fieldName?: string,
): string {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `media-${uniqueSuffix}${getSafeMediaExtension(originalName, mimeType, fieldName)}`;
}

export function getPublicMediaPath(fileName: string): string {
  return `${PUBLIC_MEDIA_PREFIX}/${path.basename(fileName)}`;
}

export function buildPublicMediaUrl(publicPath: string, req?: Request): string {
  if (/^https?:\/\//i.test(publicPath)) {
    return publicPath;
  }

  const normalizedPath = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  return `${getRequestBaseUrl(req)}${normalizedPath}`;
}

export function normalizeStoredMediaPath(
  storedPath?: string | null,
  fileName?: string | null,
): string | null {
  if (storedPath) {
    if (/^https?:\/\//i.test(storedPath)) {
      try {
        return new URL(storedPath).pathname;
      } catch {
        return storedPath;
      }
    }

    const normalized = storedPath.replace(/\\/g, '/');
    const uploadsIndex = normalized.lastIndexOf('/uploads/media/');
    if (uploadsIndex >= 0) {
      return normalized.slice(uploadsIndex);
    }

    const bareUploadsIndex = normalized.lastIndexOf('uploads/media/');
    if (bareUploadsIndex >= 0) {
      return `/${normalized.slice(bareUploadsIndex)}`;
    }

    if (normalized.startsWith(PUBLIC_MEDIA_PREFIX)) {
      return normalized;
    }
  }

  return fileName ? getPublicMediaPath(fileName) : null;
}

export function resolveMediaAbsolutePath(media: {
  fileName?: string | null;
  path?: string | null;
}): string {
  const normalizedPath = media.path?.replace(/\\/g, '/');
  const fallbackName = normalizedPath?.split('/').filter(Boolean).pop();
  const fileName = media.fileName ?? fallbackName ?? '';

  return path.join(MEDIA_UPLOADS_DIR, path.basename(fileName));
}

export function serializeMedia<T extends Record<string, any> | null | undefined>(
  media: T,
  req?: Request,
): T {
  if (!media) return media;

  const publicPath = normalizeStoredMediaPath(media.path, media.fileName);
  const serialized: Record<string, any> = { ...media };

  for (const key of ['id', 'size', 'uploadedBy', 'mediaId', 'postId', 'messageId']) {
    if (typeof serialized[key] === 'bigint') {
      serialized[key] = serialized[key].toString();
    }
  }

  if (publicPath) {
    serialized.path = publicPath;
    serialized.url = buildPublicMediaUrl(publicPath, req);
  }

  return serialized as T;
}
