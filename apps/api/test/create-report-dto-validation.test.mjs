import assert from 'node:assert/strict';
import 'reflect-metadata';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateReportContentDto,
  CreateReportWithPhotoDto,
} from '../dist/modules/reports/dto/create-report.dto.js';

const wasteTypeId = '44444444-4444-4444-8444-444444444444';

function validationMessages(errors) {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...validationMessages(error.children ?? []),
  ]);
}

test('accepts idTypeDechet in JSON-encoded multipart report contents', async () => {
  const dto = plainToInstance(CreateReportWithPhotoDto, {
    contenus: JSON.stringify([{ idTypeDechet: wasteTypeId }]),
  });

  assert.ok(dto.contenus?.[0] instanceof CreateReportContentDto);
  assert.equal(dto.contenus?.[0]?.idTypeDechet, wasteTypeId);

  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  assert.deepEqual(validationMessages(errors), []);
});

test('still rejects unknown properties in JSON-encoded multipart report contents', async () => {
  const dto = plainToInstance(CreateReportWithPhotoDto, {
    contenus: JSON.stringify([{
      idTypeDechet: wasteTypeId,
      propriétéInconnue: 'must be rejected',
    }]),
  });

  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  assert.ok(
    validationMessages(errors).some((message) => message.includes('propriétéInconnue should not exist')),
  );
});

test('validates the UUID inside JSON-encoded multipart report contents', async () => {
  const dto = plainToInstance(CreateReportWithPhotoDto, {
    contenus: JSON.stringify([{ idTypeDechet: 'not-a-uuid' }]),
  });

  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  assert.ok(validationMessages(errors).some((message) => message.includes('must be a UUID')));
});
