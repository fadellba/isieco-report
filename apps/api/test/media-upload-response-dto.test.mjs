import assert from 'node:assert/strict';
import 'reflect-metadata';
import test from 'node:test';
import {
  InterventionPhotoUploadResponseDto,
  ReportPhotoUploadResponseDto,
} from '../dist/infrastructure/storage/dto/media-response.dto.js';

const propertyMetadata = (type, property) =>
  Reflect.getMetadata('swagger/apiModelProperties', type.prototype, property);

test('documents the report photo upload response returned by ReportsService', () => {
  const id = propertyMetadata(ReportPhotoUploadResponseDto, 'idPhotoSignalement');
  assert.equal(id.format, 'uuid');
  assert.ok(propertyMetadata(ReportPhotoUploadResponseDto, 'description').nullable);
  assert.equal(propertyMetadata(ReportPhotoUploadResponseDto, 'etatPublication').example, 'PRIVEE');
  assert.deepEqual(propertyMetadata(ReportPhotoUploadResponseDto, 'etatPublication').enum, ['PRIVEE']);
  assert.equal(propertyMetadata(ReportPhotoUploadResponseDto, 'idPhoto'), undefined);
});

test('documents the intervention photo upload response returned by InterventionsService', () => {
  const id = propertyMetadata(InterventionPhotoUploadResponseDto, 'idPhotoIntervention');
  assert.equal(id.format, 'uuid');
  assert.ok(propertyMetadata(InterventionPhotoUploadResponseDto, 'description').nullable);
  assert.equal(propertyMetadata(InterventionPhotoUploadResponseDto, 'etatPublication').example, 'PRIVEE');
  assert.deepEqual(propertyMetadata(InterventionPhotoUploadResponseDto, 'etatPublication').enum, ['PRIVEE']);
  assert.equal(propertyMetadata(InterventionPhotoUploadResponseDto, 'idPhoto'), undefined);
});
