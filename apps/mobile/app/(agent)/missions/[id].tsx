import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getAgentProfile,
  getInterventionPhotoUrl,
  listMyTeams,
  listTeamAssignments,
  listTeamInterventions,
  respondToAssignment,
  startIntervention,
  submitIntervention,
  uploadInterventionPhoto,
  type AgentTeam,
  type MobileAgentProfile,
  type TeamAssignment,
  type TeamIntervention,
  type TeamInterventionPhoto,
} from '../../../src/features/interventions/agent-api';
import { dateLabel } from '../../../src/features/reports/report-format';
import {
  captureMobilePhoto,
  pickMobilePhotos,
  type PreparedMobilePhoto,
} from '../../../src/features/media/mobile-media';
import { FeedbackBanner, type FeedbackTone } from '../../../src/ui/FeedbackBanner';
import { StatusBadge, type StatusTone } from '../../../src/ui/StatusBadge';

const inputClass =
  'mt-2 rounded-xl border border-line-strong bg-white px-4 py-3 text-sm text-ink-900';
const primaryButton = 'rounded-2xl bg-brand-forest px-4 py-3.5 disabled:opacity-50 shadow-sm';
const secondaryButton =
  'rounded-2xl border border-line-strong bg-white px-4 py-3.5 disabled:opacity-50';

type LoadedInterventionPhoto = TeamInterventionPhoto & { signedUrl: string };

function latestFor(id: string, items: TeamIntervention[]): TeamIntervention | undefined {
  return items
    .filter((item) => item.idAffectation === id)
    .sort(
      (a, b) =>
        new Date(b.dateHeureDebut ?? 0).getTime() - new Date(a.dateHeureDebut ?? 0).getTime(),
    )[0];
}

function resultLabel(result: TeamIntervention['resultatIntervention']): string {
  if (result === 'TERMINEE') return 'Terminée';
  if (result === 'PARTIELLE') return 'Partielle';
  if (result === 'IMPOSSIBLE') return 'Impossible';
  return 'Non renseigné';
}

function statusFor(
  assignment: TeamAssignment,
  intervention: TeamIntervention | undefined,
): { label: string; tone: StatusTone } {
  if (assignment.decisionEquipe === 'EN_ATTENTE') return { label: 'À accepter', tone: 'warning' };
  if (assignment.decisionEquipe === 'REFUSEE') return { label: 'Refusée', tone: 'danger' };
  if (!intervention) return { label: 'À démarrer', tone: 'info' };
  if (intervention.statutIntervention === 'EN_COURS') return { label: 'En cours', tone: 'brand' };
  if (intervention.verification?.etatVerification === 'REPRISE')
    return { label: 'Reprise demandée', tone: 'warning' };
  if (intervention.verification?.etatVerification === 'VALIDEE')
    return { label: 'Validée', tone: 'success' };
  return { label: 'À vérifier', tone: 'info' };
}

function nextFor(
  assignment: TeamAssignment,
  intervention: TeamIntervention | undefined,
  author: boolean,
): { title: string; body: string; tone: FeedbackTone } {
  if (assignment.decisionEquipe === 'EN_ATTENTE') {
    return {
      title: 'Répondre à l’affectation',
      body: 'Acceptez la mission pour la prendre en charge ou refusez-la avec un motif précis.',
      tone: 'warning',
    };
  }
  if (assignment.decisionEquipe === 'REFUSEE') {
    return {
      title: 'Aucune action attendue',
      body: 'Cette affectation a été refusée. Le service responsable pourra organiser une nouvelle affectation.',
      tone: 'warning',
    };
  }
  if (!intervention) {
    return {
      title: 'Démarrer l’intervention',
      body: 'L’affectation a été acceptée. Démarrez l’intervention lorsque votre équipe est sur place.',
      tone: 'info',
    };
  }
  if (intervention.statutIntervention === 'EN_COURS') {
    return author
      ? {
          title: 'Documenter l’intervention',
          body: 'Ajoutez les preuves utiles puis transmettez le compte rendu. Un motif est obligatoire si le résultat est partiel.',
          tone: 'info',
        }
      : {
          title: 'Intervention en cours',
          body: 'Cette intervention a été démarrée par un autre équipier. Seul son auteur peut transmettre le compte rendu.',
          tone: 'warning',
        };
  }
  if (intervention.verification?.etatVerification === 'REPRISE') {
    return {
      title: 'Effectuer la reprise',
      body:
        intervention.verification.motif ||
        'Une vérification indépendante a demandé une nouvelle intervention.',
      tone: 'warning',
    };
  }
  if (intervention.verification?.etatVerification === 'VALIDEE') {
    return {
      title: 'Résolution vérifiée',
      body: 'Le compte rendu a été validé par un vérificateur indépendant.',
      tone: 'success',
    };
  }
  return {
    title: 'Vérification indépendante en cours',
    body: 'Le compte rendu a été transmis. La clôture finale est soumise à vérification.',
    tone: 'info',
  };
}

export default function AgentMissionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; teamId: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const teamId = Array.isArray(params.teamId) ? params.teamId[0] : params.teamId;
  const [profile, setProfile] = useState<MobileAgentProfile | null>(null);
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [assignment, setAssignment] = useState<TeamAssignment | null>(null);
  const [intervention, setIntervention] = useState<TeamIntervention>();
  const [proofPhotos, setProofPhotos] = useState<LoadedInterventionPhoto[]>([]);
  const [refusalReason, setRefusalReason] = useState('');
  const [observation, setObservation] = useState('');
  const [result, setResult] = useState<'TERMINEE' | 'PARTIELLE' | 'IMPOSSIBLE'>('TERMINEE');
  const [report, setReport] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [proof, setProof] = useState<PreparedMobilePhoto | null>(null);
  const [proofContext, setProofContext] = useState('');
  const [proofDescription, setProofDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const author = Boolean(
    intervention && profile && intervention.renseignePar === profile.utilisateurId,
  );
  const status = useMemo(
    () => (assignment ? statusFor(assignment, intervention) : null),
    [assignment, intervention],
  );
  const next = useMemo(
    () => (assignment ? nextFor(assignment, intervention, author) : null),
    [assignment, intervention, author],
  );

  const load = useCallback(async () => {
    if (!id || !teamId) {
      setError('La référence de cette mission est incomplète.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [agent, memberships] = await Promise.all([getAgentProfile(), listMyTeams()]);
      if (!agent.roles.some((role) => role.code === 'AGENT_TERRAIN')) {
        throw new Error('Le rôle AGENT_TERRAIN est requis pour consulter cette mission.');
      }
      if (!memberships.some((team) => team.idEquipe === teamId)) {
        throw new Error('Cette équipe ne fait plus partie de vos appartenances actives.');
      }
      const [assignments, interventions] = await Promise.all([
        listTeamAssignments(teamId),
        listTeamInterventions(teamId),
      ]);
      const selected = assignments.find((item) => item.idAffectation === id);
      if (!selected) throw new Error('Cette affectation est introuvable.');
      setProfile(agent);
      setTeams(memberships);
      setAssignment(selected);
      const currentIntervention = latestFor(id, interventions);
      setIntervention(currentIntervention);
      if (currentIntervention?.photos.length) {
        const signedPhotos = await Promise.all(
          currentIntervention.photos.map(async (photo) => {
            try {
              const signed = await getInterventionPhotoUrl(
                currentIntervention.idIntervention,
                photo.idPhotoIntervention,
              );
              return { ...photo, signedUrl: signed.signedUrl };
            } catch {
              return null;
            }
          }),
        );
        setProofPhotos(signedPhotos.filter(
          (photo): photo is LoadedInterventionPhoto => photo !== null,
        ));
      } else {
        setProofPhotos([]);
      }
    } catch (reason) {
      setAssignment(null);
      setIntervention(undefined);
      setProofPhotos([]);
      setError(reason instanceof Error ? reason.message : 'Impossible de charger la mission.');
    } finally {
      setLoading(false);
    }
  }, [id, teamId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(decision: 'ACCEPTEE' | 'REFUSEE') {
    if (!assignment) return;
    if (decision === 'REFUSEE' && refusalReason.trim().length < 5) {
      setError('Un motif d’au moins 5 caractères est obligatoire pour refuser une mission.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await respondToAssignment(
        assignment.idAffectation,
        decision,
        decision === 'REFUSEE' ? refusalReason.trim() : undefined,
        observation.trim() || undefined,
      );
      setNotice(
        decision === 'ACCEPTEE'
          ? 'Affectation acceptée. Vous pouvez maintenant démarrer l’intervention.'
          : 'Affectation refusée avec motif.',
      );
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Erreur d’enregistrement.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  const canStart = Boolean(
    assignment?.decisionEquipe === 'ACCEPTEE' &&
      (!intervention ||
        (intervention.statutIntervention === 'SOUMISE' &&
          intervention.verification?.etatVerification === 'REPRISE' &&
          new Date(intervention.verification.dateVerification).getTime() >=
            new Date(intervention.dateSoumissionCompteRendu ?? 0).getTime())),
  );

  async function start() {
    if (!assignment) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await startIntervention(assignment.idAffectation);
      setNotice('Intervention démarrée. Documentez les opérations sur le terrain.');
      setProof(null);
      setReport('');
      setExceptionReason('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de démarrer l’intervention.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function chooseProof(source: 'camera' | 'gallery') {
    setPhotoBusy(true);
    setError(null);
    try {
      const selected =
        source === 'camera' ? await captureMobilePhoto() : ((await pickMobilePhotos(1))[0] ?? null);
      if (selected) setProof(selected);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger la photo.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function uploadProof() {
    if (!intervention || !proof) {
      setError('Sélectionnez une photo.');
      return;
    }
    const context = proofContext.trim();
    if (context.length < 3 || context.length > 100) {
      setError('Le contexte doit comporter entre 3 et 100 caractères.');
      return;
    }
    setPhotoBusy(true);
    setError(null);
    setNotice(null);
    try {
      await uploadInterventionPhoto(
        intervention.idIntervention,
        proof,
        context,
        proofDescription.trim() || undefined,
      );
      setProof(null);
      setProofContext('');
      setProofDescription('');
      setNotice('Preuve photo ajoutée avec succès.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Échec de l’envoi de la preuve.');
    } finally {
      setPhotoBusy(false);
    }
  }

  function confirmSubmit() {
    if (!intervention || !author) return;
    if (report.trim().length < 20) {
      setError('Le compte rendu doit contenir au moins 20 caractères.');
      return;
    }
    if (result !== 'TERMINEE' && exceptionReason.trim().length < 5) {
      setError(
        'Un motif d’exception d’au moins 5 caractères est requis si le résultat n’est pas complet.',
      );
      return;
    }
    Alert.alert(
      'Transmettre le compte rendu ?',
      'Votre rapport sera transmis au centre de contrôle pour vérification indépendante.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer et envoyer', onPress: () => void submitReport() },
      ],
    );
  }

  async function submitReport() {
    if (!intervention || !author) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await submitIntervention(intervention.idIntervention, {
        resultatIntervention: result,
        compteRendu: report.trim(),
        ...(exceptionReason.trim() ? { motifException: exceptionReason.trim() } : {}),
      });
      setNotice('Compte rendu transmis. En attente de validation indépendante.');
      setReport('');
      setExceptionReason('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Erreur lors de la transmission.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function openNavigation() {
    const location = assignment?.contenuDossier.dossier;
    if (!location || location.latitude === null || location.longitude === null) {
      setError('Coordonnées GPS absentes. Utilisez le repère textuel.');
      return;
    }
    try {
      const target = encodeURIComponent(`${location.latitude},${location.longitude}`);
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${target}`);
    } catch {
      setError('Application de cartes indisponible.');
    }
  }

  if (loading && !assignment) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAF9] px-8">
        <ActivityIndicator color="#174C3D" size="large" />
        <Text className="mt-4 text-xs font-semibold text-ink-500">Chargement de la mission...</Text>
      </View>
    );
  }

  if (!assignment) {
    return (
      <View className="flex-1 justify-center bg-[#F8FAF9] px-6 py-10">
        <Text className="text-xl font-extrabold text-ink-900">Mission indisponible</Text>
        <Text className="mt-2 text-xs text-ink-500">
          {error ?? 'Cette mission est introuvable.'}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 rounded-2xl bg-brand-forest py-4"
        >
          <Text className="text-center font-extrabold text-white">Retour aux missions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const location = assignment.contenuDossier.dossier;
  const options = [
    { value: 'TERMINEE' as const, label: 'Terminée' },
    { value: 'PARTIELLE' as const, label: 'Partielle' },
    { value: 'IMPOSSIBLE' as const, label: 'Impossible' },
  ];

  return (
    <View className="flex-1 bg-[#F8FAF9]">
      {/* Top Bar */}
      <View className="flex-row items-center justify-between border-b border-line-subtle bg-white px-5 pb-3.5 pt-12">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2">
          <Text className="text-base font-bold text-ink-700">←</Text>
          <Text className="text-base font-extrabold text-ink-900">Détail de mission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void load()}
          className="h-8 w-8 items-center justify-center rounded-full bg-surface-base"
        >
          <Text className="text-xs">🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#174C3D" />
        }
      >
        {/* Banner card */}
        <View className="overflow-hidden rounded-3xl bg-[#0A261E] p-5 shadow-sm">
          <Text className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
            Dossier d’intervention
          </Text>
          <Text className="mt-1 text-2xl font-extrabold text-white">
            {location.referenceDossier}
          </Text>
          <Text className="mt-1 text-xs text-emerald-100">
            {assignment.contenuDossier.typeDechet.libelle}
          </Text>
          <View className="mt-4 flex-row flex-wrap gap-2">
            {status ? <StatusBadge label={status.label} tone={status.tone} /> : null}
            <StatusBadge
              label={
                assignment.decisionEquipe === 'ACCEPTEE'
                  ? 'Acceptée'
                  : assignment.decisionEquipe === 'REFUSEE'
                    ? 'Refusée'
                    : 'En attente'
              }
              tone={
                assignment.decisionEquipe === 'ACCEPTEE'
                  ? 'success'
                  : assignment.decisionEquipe === 'REFUSEE'
                    ? 'danger'
                    : 'warning'
              }
            />
          </View>
        </View>

        {error && (
          <View className="mt-4">
            <FeedbackBanner tone="error" message={error} />
          </View>
        )}
        {notice && (
          <View className="mt-4">
            <FeedbackBanner tone="success" message={notice} />
          </View>
        )}

        {/* Next step notice */}
        {next && (
          <View className="mt-4">
            <FeedbackBanner tone={next.tone} title={next.title} message={next.body} />
          </View>
        )}

        {/* Location & Navigation */}
        <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
          <Text className="text-sm font-extrabold text-ink-900">Localisation</Text>
          <Text className="mt-2 text-xs leading-5 text-ink-700">
            {location.descriptionLocalisation || 'Repère textuel non spécifié'}
          </Text>
          {location.latitude !== null && location.longitude !== null && (
            <Text className="mt-1 font-mono text-[11px] text-ink-400">
              GPS : {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}
            </Text>
          )}

          <TouchableOpacity
            onPress={() => void openNavigation()}
            disabled={location.latitude === null || location.longitude === null}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 py-3 disabled:opacity-50"
          >
            <Text className="text-xs font-extrabold text-brand-forest">
              🧭 Ouvrir l’itinéraire GPS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Respond to assignment */}
        {assignment.decisionEquipe === 'EN_ATTENTE' && (
          <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
            <Text className="text-sm font-extrabold text-ink-900">Répondre à l’affectation</Text>
            <Text className="mt-1 text-xs text-ink-500">
              Confirmez la prise en charge de cette mission par votre équipe.
            </Text>

            <TextInput
              value={refusalReason}
              onChangeText={setRefusalReason}
              maxLength={2000}
              multiline
              placeholder="Motif si refus (ex: équipement inadapté, indisponibilité)..."
              placeholderTextColor="#94A3B8"
              className="mt-3 min-h-[70px] rounded-xl border border-line-strong bg-white p-3 text-xs text-ink-900"
            />

            <View className="mt-4 flex-row gap-2.5">
              <TouchableOpacity
                onPress={() => void respond('REFUSEE')}
                disabled={busy}
                className="flex-1 rounded-2xl border border-rose-300 bg-rose-50 py-3.5"
              >
                <Text className="text-center text-xs font-bold text-rose-800">Refuser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void respond('ACCEPTEE')}
                disabled={busy}
                className="flex-1 rounded-2xl bg-brand-forest py-3.5 shadow-sm"
              >
                <Text className="text-center text-xs font-extrabold text-white">
                  Accepter la mission
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Start intervention button */}
        {canStart && (
          <View className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm">
            <Text className="text-sm font-extrabold text-emerald-950">
              {intervention ? 'Démarrer la reprise' : 'Prêt à intervenir'}
            </Text>
            <Text className="mt-1 text-xs leading-5 text-emerald-900">
              Démarrez l’intervention sur place pour mesurer la durée et documenter vos opérations.
            </Text>
            <TouchableOpacity
              onPress={() => void start()}
              disabled={busy}
              className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl bg-brand-forest py-4 shadow-sm"
            >
              <Text className="text-sm font-extrabold text-white">
                {busy ? 'Démarrage...' : '🚀 Démarrer l’intervention'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Intervention in progress: proof photos & report */}
        {intervention?.statutIntervention === 'EN_COURS' && (
          <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
            <Text className="text-sm font-extrabold text-ink-900">Intervention en cours</Text>
            {author ? (
              <>
                {/* Proof photo upload */}
                <View className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 p-4">
                  <Text className="text-xs font-extrabold text-ink-800">
                    Preuve photo terrain (facultative)
                  </Text>
                  <View className="mt-2.5 flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => void chooseProof('camera')}
                      disabled={photoBusy}
                      className="flex-1 rounded-xl bg-brand-forest py-2.5"
                    >
                      <Text className="text-center text-xs font-bold text-white">
                        📷 Appareil photo
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void chooseProof('gallery')}
                      disabled={photoBusy}
                      className="flex-1 rounded-xl border border-line-strong bg-white py-2.5"
                    >
                      <Text className="text-center text-xs font-bold text-ink-800">🖼️ Galerie</Text>
                    </TouchableOpacity>
                  </View>

                  {proof && (
                    <View className="mt-3">
                      <Image
                        source={{ uri: proof.uri }}
                        resizeMode="cover"
                        style={{ width: '100%', height: 160, borderRadius: 12 }}
                      />
                      <TextInput
                        value={proofContext}
                        onChangeText={setProofContext}
                        maxLength={100}
                        placeholder="Contexte (ex: avant ramassage, après nettoyage)..."
                        placeholderTextColor="#94A3B8"
                        className="mt-2 rounded-xl border border-line-strong bg-white px-3 py-2 text-xs text-ink-900"
                      />
                      <TouchableOpacity
                        onPress={() => void uploadProof()}
                        disabled={photoBusy}
                        className="mt-2.5 rounded-xl bg-brand-forest py-2.5"
                      >
                        <Text className="text-center text-xs font-extrabold text-white">
                          {photoBusy ? 'Envoi...' : 'Transmettre la photo'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Report form */}
                <View className="mt-5 border-t border-line-subtle pt-4">
                  <Text className="text-sm font-extrabold text-ink-900">
                    Compte rendu d’intervention
                  </Text>
                  <TextInput
                    value={report}
                    onChangeText={setReport}
                    maxLength={10000}
                    multiline
                    textAlignVertical="top"
                    placeholder="Détaillez les actions réalisées, le volume collecté, etc. (min 20 caractères)..."
                    placeholderTextColor="#94A3B8"
                    className="mt-2.5 min-h-[110px] rounded-xl border border-line-strong bg-white p-3 text-xs text-ink-900"
                  />

                  <Text className="mt-4 text-xs font-extrabold text-ink-800">
                    Résultat constaté
                  </Text>
                  <View className="mt-2 flex-row gap-2">
                    {options.map((opt) => {
                      const sel = result === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setResult(opt.value)}
                          className={`flex-1 rounded-full py-2 ${
                            sel ? 'bg-brand-forest' : 'border border-line-strong bg-white'
                          }`}
                        >
                          <Text
                            className={`text-center text-xs ${
                              sel ? 'font-bold text-white' : 'font-medium text-ink-700'
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {result !== 'TERMINEE' && (
                    <TextInput
                      value={exceptionReason}
                      onChangeText={setExceptionReason}
                      maxLength={2000}
                      multiline
                      placeholder="Motif obligatoire si partiel ou impossible..."
                      placeholderTextColor="#94A3B8"
                      className="mt-3 min-h-[60px] rounded-xl border border-line-strong bg-white p-3 text-xs text-ink-900"
                    />
                  )}

                  <TouchableOpacity
                    onPress={confirmSubmit}
                    disabled={busy}
                    className="mt-5 rounded-2xl bg-brand-forest py-4 shadow-sm"
                  >
                    <Text className="text-center font-extrabold text-white text-sm">
                      {busy ? 'Transmission...' : 'Transmettre le compte rendu'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text className="mt-2 text-xs text-ink-500">
                Intervention initiée par un équipier. Seul le déclarant initial valide le compte
                rendu.
              </Text>
            )}
          </View>
        )}

        {proofPhotos.length > 0 && (
          <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
            <Text className="text-sm font-extrabold text-ink-900">Preuves photo transmises</Text>
            <Text className="mt-1 text-xs text-ink-500">
              Les images sont privées et visibles temporairement après authentification.
            </Text>
            <View className="mt-3 gap-3">
              {proofPhotos.map((photo) => (
                <View key={photo.idPhotoIntervention} className="overflow-hidden rounded-2xl border border-line-subtle">
                  <Image
                    source={{ uri: photo.signedUrl }}
                    resizeMode="cover"
                    style={{ width: '100%', height: 170 }}
                  />
                  <View className="p-3">
                    <Text className="text-xs font-bold text-ink-800">{photo.contextePhoto}</Text>
                    {photo.description ? (
                      <Text className="mt-1 text-xs text-ink-600">{photo.description}</Text>
                    ) : null}
                    <Text className="mt-1 text-[10px] text-ink-400">
                      Ajoutée le {dateLabel(photo.dateAjout)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Submitted report summary */}
        {intervention?.statutIntervention === 'SOUMISE' && (
          <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
            <Text className="text-sm font-extrabold text-ink-900">Compte rendu d’intervention</Text>
            <View className="mt-3 flex-row gap-2">
              <StatusBadge
                label={`Résultat : ${resultLabel(intervention.resultatIntervention)}`}
                tone={intervention.resultatIntervention === 'TERMINEE' ? 'success' : 'warning'}
              />
            </View>
            {intervention.compteRendu && (
              <Text className="mt-3 text-xs leading-5 text-ink-700">
                {intervention.compteRendu}
              </Text>
            )}
            <Text className="mt-3 text-[10px] text-ink-400">
              Soumis le {dateLabel(intervention.dateSoumissionCompteRendu)}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
