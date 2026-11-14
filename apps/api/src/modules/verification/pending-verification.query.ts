import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Canonical eligibility predicate for work awaiting an independent verifier.
 * Keep the aggregate counter and the verifier's paginated queue on this predicate.
 */
export function pendingVerificationWhere(excludeAuthorId?: string): Prisma.InterventionWhereInput {
  return {
    statutIntervention: 'SOUMISE',
    dateSoumissionCompteRendu: { not: null },
    dateHeureDebut: { not: null },
    resultatIntervention: { not: null },
    compteRendu: { not: null },
    verification: null,
    ...(excludeAuthorId ? { renseignePar: { not: excludeAuthorId } } : {}),
    affectation: {
      dateFinAffectation: null,
      etatAffectation: 'ACTIVE',
      decisionEquipe: 'ACCEPTEE',
      contenuDossier: {
        etatContenuDossier: 'ACTIF',
        etatPriseEnCharge: 'EN_COURS',
        dossier: { statutDossier: { not: 'CLOTURE' } },
      },
    },
  };
}
