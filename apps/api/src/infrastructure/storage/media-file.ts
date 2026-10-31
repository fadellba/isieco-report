import { BadRequestException } from '@nestjs/common';

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export interface ValidatedImageFile {
  buffer: Buffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
}

type IncomingFile = {
  buffer?: unknown;
  mimetype?: unknown;
  size?: unknown;
};

export function validateImageFile(input: unknown): ValidatedImageFile {
  if (!input || typeof input !== 'object') {
    throw new BadRequestException('Un fichier image est requis.');
  }

  const file = input as IncomingFile;
  if (!Buffer.isBuffer(file.buffer)) {
    throw new BadRequestException('Le fichier transmis est invalide.');
  }

  const buffer = file.buffer;
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new BadRequestException('Le fichier doit avoir une taille comprise entre 1 octet et 10 Mo.');
  }

  if (typeof file.size === 'number' && file.size !== buffer.length) {
    throw new BadRequestException('La taille du fichier transmis est incohérente.');
  }

  let detected: ValidatedImageFile['contentType'] | null = null;
  let extension: ValidatedImageFile['extension'] | null = null;

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detected = 'image/jpeg';
    extension = 'jpg';
  } else if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    detected = 'image/png';
    extension = 'png';
  } else if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    detected = 'image/webp';
    extension = 'webp';
  }

  if (!detected || !extension || file.mimetype !== detected) {
    throw new BadRequestException('Seules les images JPEG, PNG et WebP valides sont acceptées.');
  }

  return { buffer, contentType: detected, extension };
}
