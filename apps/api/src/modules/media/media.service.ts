import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { MediaStorageService } from './media-storage.service.js';

type Transaction = Prisma.TransactionClient;

export type UploadedImage = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname?: string;
};

type Actor = {
  idUtilisateur: string;
  roles: Set<string>;
};

type ImageFormat = {
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REPORT_PHOTOS = 5;
const MAX_INTERVENTION_PHOTOS = 10;
const SIGNED_URL_TTL_SECONDS = 120;
const REPORT_UPLOAD_STATES = new Set([
  'SOUMIS',
  'EN_ATTENTE_COMPLEMENT',
  'COMPLEMENT_REPONDU',
]);
const REPORT_READ_ROLES = new Set([
  'AGENT_QUALIFICATION',
  'RESPONSABLE_TRAITEMENT',
  'VERIFICATEUR_CLOTURE',
]);

function isPrismaCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function detectImage(file: UploadedImage): ImageFormat {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new BadRequestException('Un fichier image est requis.');
  }
  if (file.size !== file.buffer.length || file.size > MAX_IMAGE_BYTES) {
    throw new BadRequestException('La taille du fichier image ne peut dépasser 10 Mo.');
  }

  const jpeg = file.buffer.length >= 3 &&
    file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff;
  const png = file.buffer.length >= 8 &&
    file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = file.buffer.length >= 12 &&
    file.buffer.toString('ascii', 0, 4) === 'RIFF' &&
    file.buffer.toString('ascii', 8, 12) === 'WEBP';

  if (jpeg && file.mimetype === 'image/jpeg') return { contentType: 'image/jpeg', extension: 'jpg' };
  if (png && file.mimetype === 'image/png') return { contentType: 'image/png', extension: 'png' };
  if (webp && file.mimetype === 'image/webp') return { contentType: 'image/webp', extension: 'webp' };

  throw new BadRequestException('Format image invalide. Seuls JPEG, PNG et WebP dont le contenu correspond au type déclaré sont acceptés.');
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: MediaStorageService,
  ) {}

  private async requireActor(authUserId: string): Promise<Actor> {
    const now = new Date();
    const user = await this.prisma.utilisateur.findUnique({
      where: { authUserId },
      select: {
        idUtilisateur: true,
        etatCompte: true,
        roles: {
          where: {
            dateDebut: { lte: now },
            OR: [{ dateFin: null }, { dateFin: { gt: now } }],
          },
          select: { role: { select: { codeRole: true } } },
        },
      },
    });
    if (!user || user.etatCompte !== 'ACTIF') {
      throw new ForbiddenException('Un compte actif est requis pour accéder aux médias.');
    }
    return {
      idUtilisateur: user.idUtilisateur,
      roles: new Set(user.roles.map((role) => role.role.codeRole)),
    };
  }

  private retentionExpiry(now = new Date()): Date {
    const days = this.config.get<number>('MEDIA_RETENTION_DAYS', 365);
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private reportsBucket(): string {
    return this.config.get<string>('SUPABASE_REPORTS_BUCKET', 'report-private');
  }

  private interventionsBucket(): string {
    return this.config.get<string>('SUPABASE_INTERVENTIONS_BUCKET', 'intervention-private');
  }

  async addReportPhoto(
    idSignalement: string,
    file: UploadedImage,
    description: string | undefined,
    authUserId: string,
    accessToken: string,
  ) {
    const actor = await this.requireActor(authUserId);
    const format = detectImage(file);
    const report = await this.prisma.signalement.findUnique({
      where: { idSignalement },
      select: { idSignalement: true, idUtilisateur: true, statutSignalement: true },
    });
    if (!report || report.idUtilisateur !== actor.idUtilisateur) {
      throw new NotFoundException('Signalement introuvable.');
    }
    if (!REPORT_UPLOAD_STATES.has(report.statutSignalement)) {
      throw new ConflictException('Les photos ne peuvent plus être ajoutées à ce stade du signalement.');
    }

    const bucket = this.reportsBucket();
    const photoId = randomUUID();
    const objectPath = `${idSignalement}/${photoId}.${format.extension}`;
    await this.storage.upload(bucket, objectPath, file.buffer, format.contentType, accessToken);

    try {
      return await this.serializableWrite(async (tx) => {
        const current = await tx.signalement.findFirst({
          where: {
            idSignalement,
            idUtilisateur: actor.idUtilisateur,
            statutSignalement: { in: [...REPORT_UPLOAD_STATES] },
          },
          select: { idSignalement: true },
        });
        if (!current) {
          throw new ConflictException('Le signalement a changé d’état pendant le téléversement.');
        }
        const count = await tx.photoSignalement.count({ where: { idSignalement } });
        if (count >= MAX_REPORT_PHOTOS) {
          throw new ConflictException('Un signalement ne peut contenir plus de 5 photos.');
        }

        const now = new Date();
        const photo = await tx.photoSignalement.create({
          data: {
            idPhotoSignalement: photoId,
            idSignalement,
            referencePhoto: objectPath,
            description: description?.trim() || null,
            dateAjout: now,
            dateExpiration: this.retentionExpiry(now),
            mediaPurgeAt: null,
            mediaStockeeLocale: false,
            etatPublication: 'NON_PUBLIEE',
            referencePhotoPublique: null,
            floutageConfirme: false,
            varianteSoumisePar: null,
            dateSoumissionVariante: null,
            approuvePar: null,
            dateApprobation: null,
          },
          select: {
            idPhotoSignalement: true,
            description: true,
            dateAjout: true,
            dateExpiration: true,
            etatPublication: true,
          },
        });
        await this.writeEvent(tx, {
          type: 'PHOTO_SIGNALEMENT_AJOUTEE',
          actorId: actor.idUtilisateur,
          idSignalementCible: idSignalement,
          after: {
            idPhotoSignalement: photoId,
            contentType: format.contentType,
            sizeBytes: file.size,
            etatPublication: 'NON_PUBLIEE',
            dateExpiration: photo.dateExpiration.toISOString(),
          },
        });
        return photo;
      });
    } catch (error) {
      await this.storage.removeUnregisteredObject(bucket, objectPath, accessToken).catch(() => undefined);
      throw error;
    }
  }

  async listReportPhotos(
    idSignalement: string,
    authUserId: string,
    accessToken: string,
  ) {
    const actor = await this.requireActor(authUserId);
    const report = await this.prisma.signalement.findUnique({
      where: { idSignalement },
      select: { idSignalement: true, idUtilisateur: true },
    });
    if (!report) throw new NotFoundException('Signalement introuvable.');
    if (report.idUtilisateur !== actor.idUtilisateur &&
      ![...REPORT_READ_ROLES].some((role) => actor.roles.has(role))) {
      throw new ForbiddenException('Vous ne pouvez pas consulter les médias de ce signalement.');
    }

    const photos = await this.prisma.photoSignalement.findMany({
      where: { idSignalement, dateExpiration: { gt: new Date() } },
      orderBy: [{ dateAjout: 'asc' }, { idPhotoSignalement: 'asc' }],
      select: {
        idPhotoSignalement: true,
        referencePhoto: true,
        description: true,
        dateAjout: true,
        dateExpiration: true,
        etatPublication: true,
      },
    });
    return {
      idSignalement,
      items: await Promise.all(photos.map(async (photo) => ({
        idPhotoSignalement: photo.idPhotoSignalement,
        description: photo.description,
        dateAjout: photo.dateAjout,
        dateExpiration: photo.dateExpiration,
        etatPublication: photo.etatPublication,
        signedUrl: await this.storage.createSignedUrl(this.reportsBucket(), photo.referencePhoto, accessToken),
        signedUrlExpiresInSeconds: SIGNED_URL_TTL_SECONDS,
      }))),
    };
  }

  async addInterventionPhoto(
    idIntervention: string,
    file: UploadedImage,
    description: string | undefined,
    contextePhoto: string,
    authUserId: string,
    accessToken: string,
  ) {
    const actor = await this.requireActor(authUserId);
    const format = detectImage(file);
    const intervention = await this.prisma.intervention.findUnique({
      where: { idIntervention },
      select: {
        idIntervention: true,
        renseignePar: true,
        statutIntervention: true,
        dateSoumissionCompteRendu: true,
        affectation: {
          select: {
            idEquipe: true,
            etatAffectation: true,
            decisionEquipe: true,
            dateFinAffectation: true,
            contenuDossier: {
              select: {
                etatContenuDossier: true,
                dossier: { select: { statutDossier: true } },
              },
            },
          },
        },
      },
    });
    if (!intervention) throw new NotFoundException('Intervention introuvable.');
    if (intervention.renseignePar !== actor.idUtilisateur) {
      throw new ForbiddenException('Seul l’agent ayant démarré cette intervention peut ajouter des photos.');
    }
    this.assertInterventionCanReceivePhotos(intervention);

    const bucket = this.interventionsBucket();
    const photoId = randomUUID();
    const objectPath = `${idIntervention}/${photoId}.${format.extension}`;
    await this.storage.upload(bucket, objectPath, file.buffer, format.contentType, accessToken);

    try {
      return await this.serializableWrite(async (tx) => {
        const current = await tx.intervention.findFirst({
          where: {
            idIntervention,
            renseignePar: actor.idUtilisateur,
            statutIntervention: 'EN_COURS',
            dateSoumissionCompteRendu: null,
            affectation: {
              dateFinAffectation: null,
              etatAffectation: 'ACTIVE',
              decisionEquipe: 'ACCEPTEE',
              contenuDossier: {
                etatContenuDossier: 'ACTIF',
                dossier: { statutDossier: { not: 'CLOTURE' } },
              },
            },
          },
          select: {
            idIntervention: true,
            affectation: { select: { idEquipe: true } },
          },
        });
        if (!current) {
          throw new ConflictException('La mission a changé d’état pendant le téléversement.');
        }
        await this.requireCurrentTeamMembership(tx, actor.idUtilisateur, current.affectation.idEquipe);
        const count = await tx.photoIntervention.count({ where: { idIntervention } });
        if (count >= MAX_INTERVENTION_PHOTOS) {
          throw new ConflictException('Une intervention ne peut contenir plus de 10 photos.');
        }

        const now = new Date();
        const photo = await tx.photoIntervention.create({
          data: {
            idPhotoIntervention: photoId,
            idIntervention,
            referencePhoto: objectPath,
            contextePhoto,
            description: description?.trim() || null,
            dateAjout: now,
            dateExpiration: this.retentionExpiry(now),
            mediaPurgeAt: null,
            mediaStockeeLocale: false,
            etatPublication: 'NON_PUBLIEE',
            referencePhotoPublique: null,
            floutageConfirme: false,
            varianteSoumisePar: null,
            dateSoumissionVariante: null,
            approuvePar: null,
            dateApprobation: null,
          },
          select: {
            idPhotoIntervention: true,
            contextePhoto: true,
            description: true,
            dateAjout: true,
            dateExpiration: true,
            etatPublication: true,
          },
        });
        await this.writeEvent(tx, {
          type: 'PHOTO_INTERVENTION_AJOUTEE',
          actorId: actor.idUtilisateur,
          idInterventionCible: idIntervention,
          after: {
            idPhotoIntervention: photoId,
            contextePhoto,
            contentType: format.contentType,
            sizeBytes: file.size,
            etatPublication: 'NON_PUBLIEE',
            dateExpiration: photo.dateExpiration.toISOString(),
          },
        });
        return photo;
      });
    } catch (error) {
      await this.storage.removeUnregisteredObject(bucket, objectPath, accessToken).catch(() => undefined);
      throw error;
    }
  }

  async listInterventionPhotos(
    idIntervention: string,
    authUserId: string,
    accessToken: string,
  ) {
    const actor = await this.requireActor(authUserId);
    const intervention = await this.prisma.intervention.findUnique({
      where: { idIntervention },
      select: {
        idIntervention: true,
        renseignePar: true,
        statutIntervention: true,
        dateSoumissionCompteRendu: true,
        affectation: { select: { idEquipe: true } },
      },
    });
    if (!intervention) throw new NotFoundException('Intervention introuvable.');

    let allowed = intervention.renseignePar === actor.idUtilisateur;
    if (!allowed && actor.roles.has('AGENT_TERRAIN')) {
      const membership = await this.prisma.appartenanceEquipe.findFirst({
        where: {
          idUtilisateur: actor.idUtilisateur,
          idEquipe: intervention.affectation.idEquipe,
          dateDebut: { lte: new Date() },
          OR: [{ dateFin: null }, { dateFin: { gt: new Date() } }],
        },
        select: { idUtilisateur: true },
      });
      allowed = !!membership;
    }
    if (!allowed && actor.roles.has('VERIFICATEUR_CLOTURE')) {
      allowed = intervention.statutIntervention === 'SOUMISE' &&
        intervention.dateSoumissionCompteRendu !== null;
    }
    if (!allowed) {
      throw new ForbiddenException('Vous ne pouvez pas consulter les médias de cette intervention.');
    }

    const photos = await this.prisma.photoIntervention.findMany({
      where: { idIntervention, dateExpiration: { gt: new Date() } },
      orderBy: [{ dateAjout: 'asc' }, { idPhotoIntervention: 'asc' }],
      select: {
        idPhotoIntervention: true,
        referencePhoto: true,
        contextePhoto: true,
        description: true,
        dateAjout: true,
        dateExpiration: true,
        etatPublication: true,
      },
    });
    return {
      idIntervention,
      items: await Promise.all(photos.map(async (photo) => ({
        idPhotoIntervention: photo.idPhotoIntervention,
        contextePhoto: photo.contextePhoto,
        description: photo.description,
        dateAjout: photo.dateAjout,
        dateExpiration: photo.dateExpiration,
        etatPublication: photo.etatPublication,
        signedUrl: await this.storage.createSignedUrl(this.interventionsBucket(), photo.referencePhoto, accessToken),
        signedUrlExpiresInSeconds: SIGNED_URL_TTL_SECONDS,
      }))),
    };
  }

  private assertInterventionCanReceivePhotos(intervention: {
    statutIntervention: string;
    dateSoumissionCompteRendu: Date | null;
    affectation: {
      etatAffectation: string;
      decisionEquipe: string;
      dateFinAffectation: Date | null;
      contenuDossier: { etatContenuDossier: string; dossier: { statutDossier: string } };
    };
  }): void {
    if (
      intervention.statutIntervention !== 'EN_COURS' ||
      intervention.dateSoumissionCompteRendu ||
      intervention.affectation.etatAffectation !== 'ACTIVE' ||
      intervention.affectation.dateFinAffectation ||
      intervention.affectation.decisionEquipe !== 'ACCEPTEE' ||
      intervention.affectation.contenuDossier.etatContenuDossier !== 'ACTIF' ||
      intervention.affectation.contenuDossier.dossier.statutDossier === 'CLOTURE'
    ) {
      throw new ConflictException('Seule une intervention en cours sur une affectation active peut recevoir des photos.');
    }
  }

  private async requireCurrentTeamMembership(
    tx: Transaction,
    actorId: string,
    idEquipe: string,
  ): Promise<void> {
    const now = new Date();
    const membership = await tx.appartenanceEquipe.findFirst({
      where: {
        idUtilisateur: actorId,
        idEquipe,
        dateDebut: { lte: now },
        OR: [{ dateFin: null }, { dateFin: { gt: now } }],
      },
      select: { idUtilisateur: true },
    });
    if (!membership) {
      throw new ForbiddenException('Une appartenance active à l’équipe est requise.');
    }
  }

  private async writeEvent(
    tx: Transaction,
    payload: {
      type: string;
      actorId: string;
      idSignalementCible?: string;
      idInterventionCible?: string;
      after: Record<string, unknown>;
    },
  ): Promise<void> {
    const now = new Date();
    await tx.evenementMetier.create({
      data: {
        typeEvenement: payload.type,
        dateEvenement: now,
        dateEnregistrement: now,
        origine: 'API',
        idActeur: payload.actorId,
        ...(payload.idSignalementCible ? { idSignalementCible: payload.idSignalementCible } : {}),
        ...(payload.idInterventionCible ? { idInterventionCible: payload.idInterventionCible } : {}),
        donneesApres: payload.after as Prisma.InputJsonObject,
        versionSchema: 1,
      },
    });
  }

  private async serializableWrite<T>(
    operation: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (isPrismaCode(error, 'P2002') || isPrismaCode(error, 'P2034')) {
        throw new ConflictException('Le média ou sa ressource a été modifié simultanément. Réessayez.');
      }
      throw error;
    }
  }
}
