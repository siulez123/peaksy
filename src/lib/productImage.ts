import path from 'node:path';
import fs from 'node:fs/promises';
import type { MultipartFile } from '@fastify/multipart';
import { ValidationError } from './errors';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'products');

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

const MAX_BYTES = 2 * 1024 * 1024;

export async function ensureProductUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function extForMime(mime: string): string | null {
  return ALLOWED_MIME[mime] ?? null;
}

/** Guarda ficheiro multipart e devolve o path público `/uploads/products/{id}.ext` */
export async function saveProductImageFile(
  file: MultipartFile,
  productId: string
): Promise<string> {
  const mime = file.mimetype || '';
  const ext = extForMime(mime);
  if (!ext) {
    throw new ValidationError(`Tipo de imagem não permitido: ${mime}`);
  }

  const buf = await file.toBuffer();
  if (buf.length > MAX_BYTES) {
    throw new ValidationError('Imagem demasiado grande (máx. 2 MB)');
  }

  const destPath = path.join(UPLOAD_DIR, `${productId}${ext}`);
  await fs.writeFile(destPath, buf);

  return `/uploads/products/${productId}${ext}`;
}

/** Remove ficheiro local se for um path nosso */
export async function deleteProductImageFile(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith('/uploads/products/')) return;
  const name = path.basename(imageUrl);
  if (!name || name.includes('..')) return;
  const full = path.join(UPLOAD_DIR, name);
  await fs.unlink(full).catch(() => {});
}
