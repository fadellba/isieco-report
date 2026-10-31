import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
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
        where: {
          dateExpiration: { lte: now },
          mediaPurgeAt: null,
        },
        orderBy: [{ dateExpiration: 'asc' }, { idPhotoSignalement: 'asc' }],
        take: safeBatchSize,
        select: {
          idPhotoSignalement: true,
          idSignalement: true,
          referencePhoto: true,
        },
      }),
      this.prisma.photoIntervention.findMany({
        where: {
          dateExpiration: { lte: now },
          mediaPurgeAt: null,
        },
        orderBy: [{ dateExpiration: 'asc' }, { idPhotoIntervention: 'asc' }],
        take: safeBatchSize,
        select: {
          idPhotoIntervention: true,
          idIntervention: true,
          referencePhoto: true,
        },
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
        const purgedAt = new Date();
        const updated = await this.prisma.$transaction(
          async (tx) => {
            const result = await tx.photoSignalement.updateMany({
              where: {
                idPhotoSignalement: photo.idPhotoSignalement,
                dateExpiration: { lte: now },
                mediaPurgeAt: null,
              },
              data: { mediaPurgeAt: purgedAt },
            });
            if (result.count === 1) {
              await tx.evenementMetier.create({
                data: {
                  typeEvenement: 'PHOTO_SIGNALEMENT_PURGEE',
                  dateEvenement: purgedAt,
                  dateEnregistrement: purgedAt,
                  origine: 'SYSTEME',
                  idSignalementCible: photo.idSignalement,
                  donneesApres: {
                    idPhotoSignalement: photo.idPhotoSignalement,
                    mediaPurgeAt: purgedAt.toISOString(),
                  },
                  referenceOperationUnique: `media-purge-report-${photo.idPhotoSignalement}`,
                  versionSchema: 1,
                },
              });
            }
            return result.count === 1;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        if (updated) counts.purgedSignalement += 1;
        else counts.skipped += 1;
      } catch {
        counts.failed += 1;
      }
    }

    for (const photo of interventionPhotos) {
      try {
        await this.storage.remove(photo.referencePhoto);
        const purgedAt = new Date();
        const updated = await this.prisma.$transaction(
          async (tx) => {
            const result = await tx.photoIntervention.updateMany({
              where: {
                idPhotoIntervention: photo.idPhotoIntervention,
                dateExpiration: { lte: now },
                mediaPurgeAt: null,
              },
              data: { mediaPurgeAt: purgedAt },
            });
            if (result.count === 1) {
              await tx.evenementMetier.create({
                data: {
                  typeEvenement: 'PHOTO_INTERVENTION_PURGEE',
                  dateEvenement: purgedAt,
                  dateEnregistrement: purgedAt,
                  origine: 'SYSTEME',
                  idInterventionCible: photo.idIntervention,
                  donneesApres: {
                    idPhotoIntervention: photo.idPhotoIntervention,
                    mediaPurgeAt: purgedAt.toISOString(),
                  },
                  referenceOperationUnique: `media-purge-intervention-${photo.idPhotoIntervention}`,
                  versionSchema: 1,
                },
              });
            }
            return result.count === 1;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        if (updated) counts.purgedIntervention += 1;
        else counts.skipped += 1;
      } catch {
        counts.failed += 1;
      }
    }

    return counts;
  }
}
