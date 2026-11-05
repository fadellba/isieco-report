import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { SupabaseStorageService } from './supabase-storage.service.js';

type PurgeCounts = {
  scannedSignalement: number;
  scannedIntervention: number;
  purgedSignalement: number;
  purgedIntervention: number;
  skipped: number;
  failed: number;
};

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;

@Injectable()
export class MediaPurgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  async purgeExpiredMedia(batchSize = DEFAULT_BATCH_SIZE): Promise<PurgeCounts> {
    const safeBatchSize = Number.isInteger(batchSize)
      ? Math.min(MAX_BATCH_SIZE, Math.max(1, batchSize))
      : DEFAULT_BATCH_SIZE;
    const now = new Date();

    const [reportPhotos, interventionPhotos] = await Promise.all([
      this.prisma.photoSignalement.findMany({
        where: { dateExpiration: { lte: now }, mediaPurgeAt: null },
        orderBy: [{ dateExpiration: 'asc' }, { idPhotoSignalement: 'asc' }],
        take: safeBatchSize,
        select: { idPhotoSignalement: true, referencePhoto: true },
      }),
      this.prisma.photoIntervention.findMany({
        where: { dateExpiration: { lte: now }, mediaPurgeAt: null },
        orderBy: [{ dateExpiration: 'asc' }, { idPhotoIntervention: 'asc' }],
        take: safeBatchSize,
        select: { idPhotoIntervention: true, referencePhoto: true },
      }),
    ]);

    const counts: PurgeCounts = {
      scannedSignalement: reportPhotos.length,
      scannedIntervention: interventionPhotos.length,
      purgedSignalement: 0,
      purgedIntervention: 0,
      skipped: 0,
      failed: 0,
    };

    for (const photo of reportPhotos) {
      try {
        await this.storage.remove(photo.referencePhoto);
        const result = await this.prisma.photoSignalement.updateMany({
          where: {
            idPhotoSignalement: photo.idPhotoSignalement,
            dateExpiration: { lte: now },
            mediaPurgeAt: null,
          },
          data: { mediaPurgeAt: new Date() },
        });
        if (result.count === 1) counts.purgedSignalement += 1;
        else counts.skipped += 1;
      } catch {
        counts.failed += 1;
      }
    }

    for (const photo of interventionPhotos) {
      try {
        await this.storage.remove(photo.referencePhoto);
        const result = await this.prisma.photoIntervention.updateMany({
          where: {
            idPhotoIntervention: photo.idPhotoIntervention,
            dateExpiration: { lte: now },
            mediaPurgeAt: null,
          },
          data: { mediaPurgeAt: new Date() },
        });
        if (result.count === 1) counts.purgedIntervention += 1;
        else counts.skipped += 1;
      } catch {
        counts.failed += 1;
      }
    }

    return counts;
  }
}
