import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Pool } = pg;

const STAGING_PROJECT_REF = 'mlhbdautaxufubaybzyt';
const STAGING_SUPABASE_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
const SEED_MARKER = 'isieco-staging-e2e-v1';
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'isieco-private-media';
const PAGE_SIZE = 1000;

const ALL_FUNCTIONAL_ROLES = [
  'CITOYEN',
  'AGENT_QUALIFICATION',
  'RESPONSABLE_TRAITEMENT',
  'RESPONSABLE_AFFECTATION',
  'AGENT_TERRAIN',
  'VERIFICATEUR_CLOTURE',
  'GESTIONNAIRE_REFERENTIEL',
  'ADMINISTRATEUR_COMPTES',
];

// Comptes d'utilisateurs réalistes
const usersData = [
  {
    slug: 'superadmin',
    email: 'admin.global@isieco.sn',
    legacyEmail: 'e2e.superadmin@staging.isieco.test',
    nom: 'Faye',
    prenom: 'Abdoulaye',
    telephone: '+221 77 123 45 67',
    label: 'Directeur des Opérations & Superadmin',
    roles: ALL_FUNCTIONAL_ROLES,
    isSuperadmin: true,
  },
  {
    slug: 'citoyen',
    email: 'fatou.diallo@gmail.com',
    legacyEmail: 'e2e.citoyen@staging.isieco.test',
    nom: 'Diallo',
    prenom: 'Fatou',
    telephone: '+221 77 234 56 78',
    label: 'Citoyenne engagée',
    roles: ['CITOYEN'],
  },
  {
    slug: 'citoyen-secondaire',
    email: 'moussa.ba@outlook.com',
    legacyEmail: 'e2e.citoyen-secondaire@staging.isieco.test',
    nom: 'Ba',
    prenom: 'Moussa',
    telephone: '+221 78 345 67 89',
    label: 'Citoyen bénévole',
    roles: ['CITOYEN'],
    passwordKey: 'CITOYEN_SECONDARY',
  },
  {
    slug: 'agent-qualification',
    email: 'mariama.sow@isieco.sn',
    legacyEmail: 'e2e.agent-qualification@staging.isieco.test',
    nom: 'Sow',
    prenom: 'Mariama',
    telephone: '+221 76 456 78 90',
    label: 'Agent de qualification et triage',
    roles: ['AGENT_QUALIFICATION'],
  },
  {
    slug: 'responsable-traitement',
    email: 'amadou.fall@isieco.sn',
    legacyEmail: 'e2e.responsable-traitement@staging.isieco.test',
    nom: 'Fall',
    prenom: 'Amadou',
    telephone: '+221 70 567 89 01',
    label: 'Chef de division traitement des dossiers',
    roles: ['RESPONSABLE_TRAITEMENT'],
  },
  {
    slug: 'responsable-affectation',
    email: 'awa.ndiaye@isieco.sn',
    legacyEmail: 'e2e.responsable-affectation@staging.isieco.test',
    nom: 'Ndiaye',
    prenom: 'Awa',
    telephone: '+221 77 678 90 12',
    label: 'Responsable logistique & affectation',
    roles: ['RESPONSABLE_AFFECTATION'],
  },
  {
    slug: 'agent-terrain',
    email: 'cheikh.diop@isieco.sn',
    legacyEmail: 'e2e.agent-terrain@staging.isieco.test',
    nom: 'Diop',
    prenom: 'Cheikh',
    telephone: '+221 77 789 01 23',
    label: "Chef d'équipe intervention terrain",
    roles: ['AGENT_TERRAIN'],
  },
  {
    slug: 'verificateur-cloture',
    email: 'oumy.traore@isieco.sn',
    legacyEmail: 'e2e.verificateur-cloture@staging.isieco.test',
    nom: 'Traoré',
    prenom: 'Oumy',
    telephone: '+221 78 890 12 34',
    label: 'Inspectrice de salubrité & conformité',
    roles: ['VERIFICATEUR_CLOTURE'],
  },
  {
    slug: 'gestionnaire-referentiel',
    email: 'ibrahima.kane@isieco.sn',
    legacyEmail: 'e2e.gestionnaire-referentiel@staging.isieco.test',
    nom: 'Kane',
    prenom: 'Ibrahima',
    telephone: '+221 76 901 23 45',
    label: 'Gestionnaire des référentiels & équipes',
    roles: ['GESTIONNAIRE_REFERENTIEL'],
  },
  {
    slug: 'administrateur-comptes',
    email: 'aminata.gueye@isieco.sn',
    legacyEmail: 'e2e.administrateur-comptes@staging.isieco.test',
    nom: 'Gueye',
    prenom: 'Aminata',
    telephone: '+221 70 012 34 56',
    label: 'Administratrice de la plateforme',
    roles: ['ADMINISTRATEUR_COMPTES'],
  },
];

// Référentiel des types de déchets réalistes
const realisticWasteTypes = [
  { codeType: 'PLASTIQUE', libelle: 'Plastiques et emballages', description: 'Bouteilles, sachets, bidons et emballages polymères non biodégradables' },
  { codeType: 'MENAGER', libelle: 'Ordures ménagères résiduelles', description: 'Déchets de cuisine, restes alimentaires et résidus du quotidien' },
  { codeType: 'GRAVATS', libelle: 'Gravats et déblais de chantier', description: 'Béton, briques, tuiles, ciment et débris de construction' },
  { codeType: 'ENCOMBRANTS', libelle: 'Encombrants et mobiliers', description: "Matelas, meubles hors d'usage, électroménager et ferrailles" },
  { codeType: 'VEGETAUX', libelle: 'Déchets verts et élagage', description: "Branches d'arbres, feuilles mortes, tontes d'herbes et branchages" },
  { codeType: 'ELECTRONIQUE', libelle: 'Déchets électroniques (D3E)', description: 'Téléphones, composants informatiques, téléviseurs et câblages' },
];

// Équipes d'intervention terrain réalistes
const realisticTeams = [
  {
    nom: 'Brigade Verte Dakar-Centre',
    description: "Équipe mobile d'intervention rapide pour le Plateau, Médina et Fann",
    competences: ['PLASTIQUE', 'MENAGER', 'ENCOMBRANTS'],
  },
  {
    nom: 'Équipe Salubrité Almadies & Ngor',
    description: 'Nettoyage des zones côtières, plages et axes touristiques',
    competences: ['PLASTIQUE', 'VEGETAUX', 'MENAGER'],
  },
  {
    nom: 'Unité Déblaiement & BTP Grand-Dakar',
    description: 'Engins lourds et camions bennes pour les gravats et dépôts volumineux',
    competences: ['GRAVATS', 'ENCOMBRANTS'],
  },
  {
    nom: 'Éco-Patrouille Parcelles & Guédiawaye',
    description: 'Sensibilisation et évacuation des points noirs urbains',
    competences: ['MENAGER', 'PLASTIQUE', 'VEGETAUX'],
  },
];

// URLs d'images réelles haute définition
const REAL_PHOTOS = {
  plasticDump: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80',
  largeDump: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80',
  streetLitter: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80',
  overflowingTrash: 'https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&w=800&q=80',
  constructionDebris: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80',
  cleanedStreet: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80',
  cleanedSquare: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80',
  cleanedPark: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80',
};

// Exemples de signalements réalistes ancrés géographiquement à Dakar
const realisticReportsSeed = [
  {
    code: 'SIG-MEDINA-01',
    description: "Accumulation inquiétante de bouteilles plastiques et cartons près de l'école primaire, bloquant le caniveau d'évacuation.",
    localisation: 'Angle Rue 22 x Rue 11, Médina, Dakar',
    latitude: 14.686500,
    longitude: -17.449800,
    wasteCode: 'PLASTIQUE',
    quantite: 4.5,
    volume: 3.2,
    photoUrl: REAL_PHOTOS.plasticDump,
    stage: 'CLOTURE', // Complet de bout en bout: Qualifié -> Dossier -> Affecté -> Intervention terminée -> Vérifié & Clôturé
    interventionPhotoBefore: REAL_PHOTOS.plasticDump,
    interventionPhotoAfter: REAL_PHOTOS.cleanedStreet,
  },
  {
    code: 'SIG-ALMADIES-02',
    description: "Dépôt sauvage de gravats de maçonnerie et dalles de béton suite à des travaux nocturnes sur le bas-côté de la route.",
    localisation: "Route des Almadies, en face de l'Hôtel King Fahd, Dakar",
    latitude: 14.745200,
    longitude: -17.518600,
    wasteCode: 'GRAVATS',
    quantite: 12.0,
    volume: 8.5,
    photoUrl: REAL_PHOTOS.constructionDebris,
    stage: 'INTERVENTION_EN_COURS', // Dossier ouvert et affecté, équipe sur le terrain
  },
  {
    code: 'SIG-PLATEAU-03',
    description: 'Poubelles publiques éventrées et ordures ménagères débordant sur la chaussée, forte odeur de décomposition.',
    localisation: 'Avenue Peytavin x Rue Carnot, Dakar-Plateau',
    latitude: 14.671800,
    longitude: -17.436200,
    wasteCode: 'MENAGER',
    quantite: 2.8,
    volume: 2.0,
    photoUrl: REAL_PHOTOS.overflowingTrash,
    stage: 'AFFECTE', // Dossier créé et affecté à l'équipe, en attente d'intervention
  },
  {
    code: 'SIG-FANN-04',
    description: "Tas important de résidus d'emballages et détritus divers obstruant le passage piéton le long de la corniche.",
    localisation: 'Corniche Ouest, proximité Université Cheikh Anta Diop, Fann',
    latitude: 14.693400,
    longitude: -17.472100,
    wasteCode: 'PLASTIQUE',
    quantite: 3.5,
    volume: 2.5,
    photoUrl: REAL_PHOTOS.streetLitter,
    stage: 'QUALIFIE', // Qualifié par l'agent de qualification, prêt à être rattaché à un dossier
  },
  {
    code: 'SIG-OUAKAM-05',
    description: 'Amas de ferrailles, vieux canapés et carcasses métalliques abandonnés sous un baobab.',
    localisation: 'Cité Assemblée, Ouakam, Dakar',
    latitude: 14.722500,
    longitude: -17.491200,
    wasteCode: 'ENCOMBRANTS',
    quantite: 6.0,
    volume: 5.0,
    photoUrl: REAL_PHOTOS.largeDump,
    stage: 'EN_ATTENTE', // Fraîchement déposé par le citoyen, en attente de triage
  },
];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function assertStagingTargets() {
  const supabaseUrl = new URL(requiredEnv('SUPABASE_URL'));
  if (
    supabaseUrl.protocol !== 'https:' ||
    supabaseUrl.hostname !== `${STAGING_PROJECT_REF}.supabase.co` ||
    supabaseUrl.pathname !== '/'
  ) {
    throw new Error('SUPABASE_URL does not target the approved staging Supabase project.');
  }

  const databaseUrl = new URL(requiredEnv('DIRECT_URL'));
  const expectedUsername = `postgres.${STAGING_PROJECT_REF}`;
  const sslMode = databaseUrl.searchParams.get('sslmode');

  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DIRECT_URL must be a PostgreSQL connection string.');
  }
  if (!databaseUrl.hostname.endsWith('.pooler.supabase.com')) {
    throw new Error('DIRECT_URL must use the Supabase Session Pooler.');
  }
  if (databaseUrl.port !== '5432') {
    throw new Error('DIRECT_URL must use Session Pooler port 5432.');
  }
  if (decodeURIComponent(databaseUrl.username) !== expectedUsername) {
    throw new Error('DIRECT_URL does not target the approved staging project.');
  }
  if (databaseUrl.pathname !== '/postgres') {
    throw new Error('DIRECT_URL must target the postgres database.');
  }
  if (!['require', 'verify-ca', 'verify-full'].includes(sslMode)) {
    throw new Error('DIRECT_URL must require TLS using sslmode=require, verify-ca, or verify-full.');
  }
  if (!databaseUrl.password) {
    throw new Error('DIRECT_URL is missing its password.');
  }
}

async function fetchImageBuffer(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 ISI-Eco Staging Seeder' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}: status ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function listAuthUsers(admin) {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw new Error(`Supabase Auth listUsers failed: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) return users;
  }
  throw new Error('Supabase Auth user listing exceeded 100 pages.');
}

async function ensureAuthUser(admin, userConfig, password, usersByEmail) {
  // Check either realistic email or legacy test email
  let existing = usersByEmail.get(userConfig.email.toLowerCase());
  if (!existing && userConfig.legacyEmail) {
    existing = usersByEmail.get(userConfig.legacyEmail.toLowerCase());
  }

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      email: userConfig.email,
      password,
      email_confirm: true,
      user_metadata: {
        nom: userConfig.nom,
        prenom: userConfig.prenom,
        telephone: userConfig.telephone,
        full_name: `${userConfig.prenom} ${userConfig.nom}`,
      },
      app_metadata: { ...existing.app_metadata, isieco_seed: SEED_MARKER },
    });
    if (error || !data.user) {
      throw new Error(`Supabase Auth updateUserById failed for ${userConfig.email}: ${error?.message ?? 'No user returned'}`);
    }
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: userConfig.email,
    password,
    email_confirm: true,
    user_metadata: {
      nom: userConfig.nom,
      prenom: userConfig.prenom,
      telephone: userConfig.telephone,
      full_name: `${userConfig.prenom} ${userConfig.nom}`,
    },
    app_metadata: { isieco_seed: SEED_MARKER },
  });
  if (error || !data.user) {
    throw new Error(`Supabase Auth createUser failed for ${userConfig.email}: ${error?.message ?? 'No user returned'}`);
  }
  usersByEmail.set(userConfig.email.toLowerCase(), data.user);
  return data.user;
}

async function uploadToStorage(storageAdmin, path, buffer, contentType = 'image/jpeg') {
  const { error } = await storageAdmin.storage.from(STORAGE_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.warn(`Storage upload warning for ${path}: ${error.message}`);
  }
}

async function main() {
  assertStagingTargets();

  const commonPassword = process.env.STAGING_COMMON_PASSWORD?.trim() || 'IsiEco2026!Test';
  const caCertificate = requiredEnv('STAGING_SUPABASE_CA_CERT').trim();

  const databaseUrl = new URL(requiredEnv('DIRECT_URL'));
  for (const parameter of ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'ssl']) {
    databaseUrl.searchParams.delete(parameter);
  }

  const supabaseSecretKey = requiredEnv('SUPABASE_SECRET_KEY');
  const admin = createClient(STAGING_SUPABASE_URL, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const pool = new Pool({
    connectionString: databaseUrl.toString(),
    ssl: { ca: caCertificate, rejectUnauthorized: true },
    max: 2,
    connectionTimeoutMillis: 10000,
    application_name: 'isieco-realistic-data-seed',
  });

  try {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');

      console.log('1. Synchronisation du catalogue des rôles...');
      for (const roleCode of ALL_FUNCTIONAL_ROLES) {
        await db.query(
          `INSERT INTO public.role (id_role, code_role, libelle_role, description)
           VALUES ($1::uuid, $2, $3, $4)
           ON CONFLICT (code_role) DO NOTHING`,
          [randomUUID(), roleCode, roleCode.replace(/_/g, ' '), 'Rôle métier ISI-Eco'],
        );
      }

      console.log('2. Provisioning des types de déchets réalistes...');
      const wasteTypeMap = new Map();
      for (const wt of realisticWasteTypes) {
        const res = await db.query(
          `INSERT INTO public.type_dechet (id_type_dechet, code_type, libelle, description, actif)
           VALUES ($1::uuid, $2, $3, $4, true)
           ON CONFLICT (code_type)
           DO UPDATE SET libelle = EXCLUDED.libelle, description = EXCLUDED.description, actif = true
           RETURNING id_type_dechet, code_type`,
          [randomUUID(), wt.codeType, wt.libelle, wt.description],
        );
        wasteTypeMap.set(res.rows[0].code_type, res.rows[0].id_type_dechet);
      }

      console.log('3. Provisioning des comptes utilisateurs réalistes...');
      const authUsers = await listAuthUsers(admin);
      const usersByEmail = new Map(
        authUsers.filter((u) => typeof u.email === 'string').map((u) => [u.email.toLowerCase(), u]),
      );

      const provisionedProfiles = new Map(); // slug -> userProfileId
      for (const userConfig of usersData) {
        const authUser = await ensureAuthUser(admin, userConfig, commonPassword, usersByEmail);

        const profileResult = await db.query(
          `INSERT INTO public.utilisateur (id_utilisateur, auth_user_id, nom, prenom, email, telephone, etat_compte)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, 'ACTIF')
           ON CONFLICT (auth_user_id)
           DO UPDATE SET
             nom = EXCLUDED.nom,
             prenom = EXCLUDED.prenom,
             email = EXCLUDED.email,
             telephone = EXCLUDED.telephone,
             etat_compte = 'ACTIF'
           RETURNING id_utilisateur`,
          [randomUUID(), authUser.id, userConfig.nom, userConfig.prenom, userConfig.email, userConfig.telephone],
        );
        const profileId = profileResult.rows[0].id_utilisateur;
        provisionedProfiles.set(userConfig.slug, profileId);

        // Attribution des rôles
        for (const roleCode of userConfig.roles) {
          const roleRow = await db.query('SELECT id_role FROM public.role WHERE code_role = $1', [roleCode]);
          if (roleRow.rowCount > 0) {
            const roleId = roleRow.rows[0].id_role;
            await db.query(
              `INSERT INTO public.utilisateur_role (id_utilisateur, id_role, motif)
               SELECT $1::uuid, $2::uuid, 'Attribution profil réaliste'
               WHERE NOT EXISTS (
                 SELECT 1 FROM public.utilisateur_role
                  WHERE id_utilisateur = $1::uuid AND id_role = $2::uuid AND date_fin IS NULL
               )`,
              [profileId, roleId],
            );
          }
        }
      }

      console.log('4. Création des équipes d\'intervention réalistes...');
      const teamMap = new Map();
      const terrainAgentId = provisionedProfiles.get('agent-terrain');
      const superadminId = provisionedProfiles.get('superadmin');

      for (const teamConfig of realisticTeams) {
        const teamRes = await db.query(
          `INSERT INTO public.equipe (id_equipe, nom_equipe, description, etat_equipe)
           VALUES ($1::uuid, $2, $3, 'ACTIF')
           ON CONFLICT DO NOTHING
           RETURNING id_equipe`,
          [randomUUID(), teamConfig.nom, teamConfig.description],
        );
        let teamId = teamRes.rows[0]?.id_equipe;
        if (!teamId) {
          const existing = await db.query('SELECT id_equipe FROM public.equipe WHERE nom_equipe = $1', [teamConfig.nom]);
          teamId = existing.rows[0].id_equipe;
        }
        teamMap.set(teamConfig.nom, teamId);

        // Associer les compétences
        for (const wtCode of teamConfig.competences) {
          const wtId = wasteTypeMap.get(wtCode);
          if (wtId) {
            await db.query(
              `INSERT INTO public.competence_equipe (id_competence_equipe, id_equipe, id_type_dechet, actif, commentaire)
               VALUES ($1::uuid, $2::uuid, $3::uuid, true, 'Compétence opérationnelle certifiée')
               ON CONFLICT (id_equipe, id_type_dechet) DO NOTHING`,
              [randomUUID(), teamId, wtId],
            );
          }
        }

        // Affecter les agents de terrain à l'équipe
        for (const memberId of [terrainAgentId, superadminId]) {
          if (memberId) {
            await db.query(
              `INSERT INTO public.appartenance_equipe (id_utilisateur, id_equipe, date_debut, fonction)
               SELECT $1::uuid, $2::uuid, CURRENT_TIMESTAMP, 'Agent d''intervention'
               WHERE NOT EXISTS (
                 SELECT 1 FROM public.appartenance_equipe
                  WHERE id_utilisateur = $1::uuid AND id_equipe = $2::uuid AND date_fin IS NULL
               )`,
              [memberId, teamId],
            );
          }
        }
      }

      console.log('5. Pré-téléchargement des images réelles depuis le web...');
      const imageBuffers = new Map();
      for (const [key, url] of Object.entries(REAL_PHOTOS)) {
        try {
          console.log(`- Téléchargement ${key}...`);
          const buf = await fetchImageBuffer(url);
          imageBuffers.set(key, buf);
        } catch (err) {
          console.warn(`Could not download image ${key}: ${err.message}`);
        }
      }

      const reportsMissingRequiredPhotos = realisticReportsSeed.filter((report) => {
        const photoKey = Object.keys(REAL_PHOTOS).find((key) => REAL_PHOTOS[key] === report.photoUrl);
        return !photoKey || !imageBuffers.has(photoKey);
      });
      if (reportsMissingRequiredPhotos.length > 0) {
        const missingCodes = reportsMissingRequiredPhotos.map((report) => report.code).join(', ');
        throw new Error(
          `Staging seed aborted before report creation: required citizen photos are unavailable for ${missingCodes}.`,
        );
      }

      console.log('6. Création des signalements, dossiers et interventions réalistes...');
      const citizenId = provisionedProfiles.get('citoyen');
      const qualificationId = provisionedProfiles.get('agent-qualification');
      const treatmentManagerId = provisionedProfiles.get('responsable-traitement');
      const assignmentManagerId = provisionedProfiles.get('responsable-affectation');
      const verifierId = provisionedProfiles.get('verificateur-cloture');
      const primaryTeamId = Array.from(teamMap.values())[0];

      const oneYearMs = 365 * 24 * 60 * 60 * 1000;
      const now = new Date();

      for (const rep of realisticReportsSeed) {
        const reportId = randomUUID();
        const wtId = wasteTypeMap.get(rep.wasteCode);
        const reportStatus = rep.stage === 'EN_ATTENTE' ? 'TRANSMIS' : (rep.stage === 'QUALIFIE' ? 'QUALIFIE' : 'CLOS');

        // Création du signalement citoyen
        await db.query(
          `INSERT INTO public.signalement (
             id_signalement, id_utilisateur, date_constat, date_soumission,
             description, description_localisation, latitude, longitude,
             precision_localisation, statut_signalement, cle_idempotence
           ) VALUES (
             $1::uuid, $2::uuid, $3, $3,
             $4, $5, $6, $7,
             10.5, $8, $9
           )`,
          [
            reportId,
            citizenId,
            new Date(Date.now() - 3600000 * 24 * 3), // Soumis il y a 3 jours
            rep.description,
            rep.localisation,
            rep.latitude,
            rep.longitude,
            reportStatus,
            `idemp-${rep.code}`,
          ],
        );

        // Photo du signalement
        const photoKey = Object.keys(REAL_PHOTOS).find((k) => REAL_PHOTOS[k] === rep.photoUrl);
        const photoBuf = photoKey ? imageBuffers.get(photoKey) : null;
        if (photoBuf) {
          const photoId = randomUUID();
          const storagePath = `reports/${reportId}/${photoId}.jpg`;
          await uploadToStorage(admin, storagePath, photoBuf);

          await db.query(
            `INSERT INTO public.photo_signalement (
               id_photo_signalement, id_signalement, reference_photo, description,
               date_ajout, date_expiration
             ) VALUES (
               $1::uuid, $2::uuid, $3, 'Constat photographique par citoyen',
               $4, $5
             )`,
            [photoId, reportId, storagePath, now, new Date(now.getTime() + oneYearMs)],
          );
        }

        // Contenu du signalement
        const isQualified = rep.stage !== 'EN_ATTENTE';
        await db.query(
          `INSERT INTO public.contenu_signalement (
             id_contenu_signalement, id_signalement, id_type_dechet,
             quantite_estimee, volume_estime, remarque,
             etat_qualification, qualifie_par, date_qualification
           ) VALUES (
             $1::uuid, $2::uuid, $3::uuid,
             $4, $5, $6,
             $7, $8::uuid, $9
           )`,
          [
            randomUUID(),
            reportId,
            wtId,
            rep.quantite,
            rep.volume,
            'Estimation visuelle confirmée sur le terrain',
            isQualified ? 'VALIDE' : 'EN_ATTENTE',
            isQualified ? qualificationId : null,
            isQualified ? new Date(Date.now() - 3600000 * 24 * 2) : null,
          ],
        );

        // Historique de statut initial
        await db.query(
          `INSERT INTO public.historique_statut_signalement (
             id_historique_statut, id_signalement, id_utilisateur, ancien_statut, nouveau_statut, motif
           ) VALUES ($1::uuid, $2::uuid, $3::uuid, NULL, 'TRANSMIS', 'Dépôt citoyen avec géolocalisation et photo')`,
          [randomUUID(), reportId, citizenId],
        );

        // Si le signalement fait l'objet d'un dossier
        if (rep.stage === 'AFFECTE' || rep.stage === 'INTERVENTION_EN_COURS' || rep.stage === 'CLOTURE') {
          const dossierId = randomUUID();
          const refDossier = `DOS-${rep.code.replace('SIG-', '')}-${now.getFullYear()}`;
          const isClosed = rep.stage === 'CLOTURE';

          await db.query(
            `INSERT INTO public.dossier_traitement (
               id_dossier, reference_dossier, description_synthese, date_creation_dossier,
               statut_dossier, priorite, latitude, longitude,
               precision_localisation, description_localisation, date_cloture, cree_par
             ) VALUES (
               $1::uuid, $2, $3, $4,
               $5, 'HAUTE', $6, $7,
               10.5, $8, $9, $10::uuid
             )`,
            [
              dossierId,
              refDossier,
              `Prise en charge prioritaire : ${rep.description}`,
              new Date(Date.now() - 3600000 * 24 * 2),
              isClosed ? 'CLOTURE' : 'OUVERT',
              rep.latitude,
              rep.longitude,
              rep.localisation,
              isClosed ? now : null,
              treatmentManagerId,
            ],
          );

          // R rattacher le signalement au dossier
          await db.query('UPDATE public.signalement SET id_dossier = $1::uuid WHERE id_signalement = $2::uuid', [
            dossierId,
            reportId,
          ]);

          // Contenu du dossier
          const idContenuDossier = randomUUID();
          await db.query(
            `INSERT INTO public.contenu_dossier (
               id_contenu_dossier, id_dossier, id_type_dechet, quantite_estimee,
               unite_quantite, volume_estime, remarque, etat_contenu_dossier, etat_prise_en_charge
             ) VALUES (
               $1::uuid, $2::uuid, $3::uuid, $4,
               'Tonnes', $5, 'Lot principal à évacuer',
               $6, $7
             )`,
            [
              idContenuDossier,
              dossierId,
              wtId,
              rep.quantite,
              rep.volume,
              isClosed ? 'TRAITE' : 'EN_COURS',
              isClosed ? 'EVACUE' : 'EN_COURS',
            ],
          );

          // Compétence de l'équipe
          const compRow = await db.query(
            'SELECT id_competence_equipe FROM public.competence_equipe WHERE id_equipe = $1::uuid AND id_type_dechet = $2::uuid LIMIT 1',
            [primaryTeamId, wtId],
          );
          let compId = compRow.rows[0]?.id_competence_equipe;
          if (!compId) {
            compId = randomUUID();
            await db.query(
              `INSERT INTO public.competence_equipe (id_competence_equipe, id_equipe, id_type_dechet, actif)
               VALUES ($1::uuid, $2::uuid, $3::uuid, true) ON CONFLICT DO NOTHING`,
              [compId, primaryTeamId, wtId],
            );
          }

          // Affectation
          const idAffectation = randomUUID();
          await db.query(
            `INSERT INTO public.affectation (
               id_affectation, id_contenu_dossier, id_equipe, id_competence_equipe,
               date_heure_affectation, id_decideur, etat_affectation, motif,
               decision_equipe, repondu_par, date_reponse_equipe
             ) VALUES (
               $1::uuid, $2::uuid, $3::uuid, $4::uuid,
               $5, $6::uuid, $7, 'Intervention d''urgence demandée',
               'ACCEPTE', $8::uuid, $5
             )`,
            [
              idAffectation,
              idContenuDossier,
              primaryTeamId,
              compId,
              new Date(Date.now() - 3600000 * 24),
              assignmentManagerId,
              isClosed ? 'CLOTUREE' : 'EN_COURS',
              terrainAgentId,
            ],
          );

          // Intervention terrain
          if (rep.stage === 'INTERVENTION_EN_COURS' || rep.stage === 'CLOTURE') {
            const idIntervention = randomUUID();
            await db.query(
              `INSERT INTO public.intervention (
                 id_intervention, id_affectation, date_heure_debut, date_heure_fin,
                 date_soumission_compte_rendu, statut_intervention, resultat_intervention,
                 compte_rendu, renseigne_par
               ) VALUES (
                 $1::uuid, $2::uuid, $3, $4,
                 $4, $5, $6,
                 $7, $8::uuid
               )`,
              [
                idIntervention,
                idAffectation,
                new Date(Date.now() - 3600000 * 6),
                isClosed ? new Date(Date.now() - 3600000 * 2) : null,
                isClosed ? 'TERMINEE' : 'EN_COURS',
                isClosed ? 'CONFORME' : null,
                isClosed ? 'Nettoyage complet effectué avec évacuation des déchets vers le centre de transfert.' : 'Démarrage du ramassage et tri sur place.',
                terrainAgentId,
              ],
            );

            // Photos d'intervention avant et après
            if (isClosed && rep.interventionPhotoBefore && rep.interventionPhotoAfter) {
              const beforeBuf = imageBuffers.get('plasticDump');
              const afterBuf = imageBuffers.get('cleanedStreet');

              if (beforeBuf) {
                const pBeforeId = randomUUID();
                const pathBefore = `interventions/${idIntervention}/before_${pBeforeId}.jpg`;
                await uploadToStorage(admin, pathBefore, beforeBuf);
                await db.query(
                  `INSERT INTO public.photo_intervention (
                     id_photo_intervention, id_intervention, reference_photo, contexte_photo,
                     description, date_ajout, date_expiration
                   ) VALUES ($1::uuid, $2::uuid, $3, 'AVANT', 'État initial du site', $4, $5)`,
                  [pBeforeId, idIntervention, pathBefore, now, new Date(now.getTime() + oneYearMs)],
                );
              }

              if (afterBuf) {
                const pAfterId = randomUUID();
                const pathAfter = `interventions/${idIntervention}/after_${pAfterId}.jpg`;
                await uploadToStorage(admin, pathAfter, afterBuf);
                await db.query(
                  `INSERT INTO public.photo_intervention (
                     id_photo_intervention, id_intervention, reference_photo, contexte_photo,
                     description, date_ajout, date_expiration
                   ) VALUES ($1::uuid, $2::uuid, $3, 'APRES', 'Site entièrement dégagé et balayé', $4, $5)`,
                  [pAfterId, idIntervention, pathAfter, now, new Date(now.getTime() + oneYearMs)],
                );
              }

              // Contrôle de conformité / Vérification clôture
              await db.query(
                `INSERT INTO public.verification (
                   id_verification, id_intervention, id_verificateur, date_verification,
                   resultat_verification, motif
                 ) VALUES (
                   $1::uuid, $2::uuid, $3::uuid, $4,
                   'CONFORME', 'Inspection de conformité validée sur site. Aucun détritus restant.'
                 )`,
                [randomUUID(), idIntervention, verifierId, now],
              );
            }
          }
        }
      }

      await db.query('COMMIT');
      console.log('✅ Jeu de données réalistes inséré avec succès !');
      console.log('Comptes de test réalistes avec mot de passe commun :', commonPassword);
      for (const u of usersData) {
        console.log(`- ${u.prenom} ${u.nom} (${u.label}) : ${u.email}`);
      }
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    } finally {
      db.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('SEED_REALISTIC_DATA_FAILURE:', error?.stack || error);
  process.exitCode = 1;
});
