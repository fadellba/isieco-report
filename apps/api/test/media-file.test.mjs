import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import test from 'node:test';
import {
  MAX_IMAGE_SIZE_BYTES,
  validateImageFile,
} from '../dist/infrastructure/storage/media-file.js';

function incoming(buffer, mimetype) {
  return { buffer, mimetype, size: buffer.length };
}

test('accepts JPEG files when the binary signature and MIME type agree', () => {
  const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  assert.deepEqual(validateImageFile(incoming(buffer, 'image/jpeg')), {
    buffer,
    contentType: 'image/jpeg',
    extension: 'jpg',
  });
});

test('accepts PNG files when the binary signature and MIME type agree', () => {
  const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(validateImageFile(incoming(buffer, 'image/png')).extension, 'png');
});

test('accepts WebP files when the RIFF and WEBP signatures agree', () => {
  const buffer = Buffer.from('RIFF0000WEBP', 'ascii');
  assert.equal(validateImageFile(incoming(buffer, 'image/webp')).extension, 'webp');
});

test('rejects a MIME type that does not match the binary signature', () => {
  const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  assert.throws(
    () => validateImageFile(incoming(buffer, 'image/png')),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
});

test('rejects empty and oversized files', () => {
  assert.throws(
    () => validateImageFile(incoming(Buffer.alloc(0), 'image/jpeg')),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
  assert.throws(
    () => validateImageFile(incoming(Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1), 'image/jpeg')),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
});

test('rejects a reported file size that differs from the uploaded buffer', () => {
  const buffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  assert.throws(
    () => validateImageFile({ buffer, mimetype: 'image/jpeg', size: buffer.length + 1 }),
    (error) => error instanceof BadRequestException && error.getStatus() === 400,
  );
});
