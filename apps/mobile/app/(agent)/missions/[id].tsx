import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Image, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import {
  getAgentProfile, listMyTeams, listTeamAssignments, listTeamInterventions,
  respondToAssignment, startIntervention, submitIntervention, uploadInterventionPhoto,
  type AgentTeam, type MobileAgentProfile, type TeamAssignment, type TeamIntervention,
} from '../../../src/features/interventions/agent-api';
import { dateLabel } from '../../../src/features/reports/report-format';
import { captureMobilePhoto, pickMobilePhotos, type PreparedMobilePhoto } from '../../../src/features/media/mobile-media';
import { FeedbackBanner, type FeedbackTone } from '../../../src/ui/FeedbackBanner';
import { StatusBadge, type StatusTone } from '../../../src/ui/StatusBadge';

const inputClass = 'mt-2 rounded-xl border border-line-strong bg-white px-4 py-3 text-sm text-ink-900';
const primaryButton = 'rounded-xl bg-brand-forest px-4 py-3.5 disabled:opacity-50';
const secondaryButton = 'rounded-xl border border-line-strong bg-white px-4 py-3.5 disabled:opacity-50';

function latestFor(id: string, items: TeamIntervention[]): TeamIntervention | undefined {
  return items.filter((item) => item.idAffectation === id)
    .sort((a, b) => new Date(b.dateHeureDebut ?? 0).getTime() - new Date(a.dateHeureDebut ?? 0).getTime())[0];
}
function resultLabel(result: TeamIntervention['resultatIntervention']): string {
  if (result === 'TERMINEE') return 'Terminée';
  if (result === 'PARTIELLE') return 'Partielle';
  if (result === 'IMPOSSIBLE') return 'Impossible';
  return 'Non renseigné';
}
function statusFor(assignment: TeamAssignment, intervention: TeamIntervention | undefined): { label: string; tone: StatusTone } {
  if (assignment.decisionEquipe === 'EN_ATTENTE') return { label: 'À accepter', tone: 'warning' };
  if (assignment.decisionEquipe === 'REFUSEE') return { label: 'Refusée', tone: 'danger' };
  if (!intervention) return { label: 'À démarrer', tone: 'info' };
  if (intervention.statutIntervention === 'EN_COURS') return { label: 'En cours', tone: 'brand' };
  if (intervention.verification?.etatVerification === 'REPRISE') return { label: 'Reprise demandée', tone: 'warning' };
  if (intervention.verification?.etatVerification === 'VALIDEE') return { label: 'Validée', tone: 'success' };
  return { label: 'À vérifier', tone: 'info' };
}
function nextFor(assignment: TeamAssignment, intervention: TeamIntervention | undefined, author: boolean): { title: string; body: string; tone: FeedbackTone } {
  if (assignment.decisionEquipe === 'EN_ATTENTE') return { title: 'Répondre à l’affectation', body: 'Acceptez la mission pour la prendre en charge ou refusez-la avec un motif précis.', tone: 'warning' };
  if (assignment.decisionEquipe === 'REFUSEE') return { title: 'Aucune action attendue', body: 'Cette affectation a été refusée. Le service responsable pourra organiser une nouvelle affectation.', tone: 'warning' };
  if (!intervention) return { title: 'Démarrer l’intervention', body: 'L’affectation a été acceptée. Démarrez l’intervention lorsque votre équipe est prête à agir sur le terrain.', tone: 'info' };
  if (intervention.statutIntervention === 'EN_COURS') return author
    ? { title: 'Documenter l’intervention', body: 'Ajoutez les preuves utiles, décrivez le résultat puis transmettez le compte rendu. Un motif est obligatoire si le résultat est partiel ou impossible.', tone: 'info' }
    : { title: 'Intervention en cours', body: 'Cette intervention a été démarrée par un autre membre de l’équipe. Seul son auteur peut transmettre le compte rendu.', tone: 'warning' };
  if (intervention.verification?.etatVerification === 'REPRISE') return { title: 'Effectuer la reprise', body: intervention.verification.motif || 'Une vérification indépendante a demandé une nouvelle intervention.', tone: 'warning' };
  if (intervention.verification?.etatVerification === 'VALIDEE') return { title: 'Résolution vérifiée', body: 'Le compte rendu a été validé par un vérificateur indépendant.', tone: 'success' };
  return { title: 'Vérification indépendante', body: 'Le compte rendu a été transmis. La décision de clôture appartient à un vérificateur distinct de son auteur.', tone: 'info' };
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

  const author = Boolean(intervention && profile && intervention.renseignePar === profile.utilisateurId);
  const status = useMemo(() => assignment ? statusFor(assignment, intervention) : null, [assignment, intervention]);
  const next = useMemo(() => assignment ? nextFor(assignment, intervention, author) : null, [assignment, intervention, author]);

  const load = useCallback(async () => {
    if (!id || !teamId) {
      setError('La référence de cette mission est incomplète. Revenez à la liste des missions.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [agent, memberships] = await Promise.all([getAgentProfile(), listMyTeams()]);
      if (!agent.roles.some((role) => role.code === 'AGENT_TERRAIN')) throw new Error('Le rôle AGENT_TERRAIN est requis pour consulter cette mission.');
      if (!memberships.some((team) => team.idEquipe === teamId)) throw new Error('Cette équipe ne fait plus partie de vos appartenances actives.');
      const [assignments, interventions] = await Promise.all([listTeamAssignments(teamId), listTeamInterventions(teamId)]);
      const selected = assignments.find((item) => item.idAffectation === id);
      if (!selected) throw new Error('Cette affectation est introuvable dans l’équipe sélectionnée.');
      setProfile(agent);
      setTeams(memberships);
      setAssignment(selected);
      setIntervention(latestFor(id, interventions));
    } catch (reason) {
      setAssignment(null);
      setIntervention(undefined);
      setError(reason instanceof Error ? reason.message : 'Impossible de charger le détail de cette mission.');
    } finally {
      setLoading(false);
    }
  }, [id, teamId]);

  useEffect(() => { void load(); }, [load]);

  async function respond(decision: 'ACCEPTEE' | 'REFUSEE') {
    if (!assignment) return;
    if (decision === 'REFUSEE' && refusalReason.trim().length < 5) {
      setError('Un motif d’au moins 5 caractères est obligatoire pour refuser une mission.');
      return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      await respondToAssignment(assignment.idAffectation, decision, decision === 'REFUSEE' ? refusalReason.trim() : undefined, observation.trim() || undefined);
      setNotice(decision === 'ACCEPTEE' ? 'Affectation acceptée. Vous pouvez maintenant préparer l’intervention.' : 'Affectation refusée. Le motif a été transmis au service.');
      await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Impossible d’enregistrer votre réponse.';
      await load(); setError(message);
    } finally { setBusy(false); }
  }

  const canStart = Boolean(assignment?.decisionEquipe === 'ACCEPTEE' && (
    !intervention || (
      intervention.statutIntervention === 'SOUMISE' &&
      intervention.verification?.etatVerification === 'REPRISE' &&
      new Date(intervention.verification.dateVerification).getTime() >= new Date(intervention.dateSoumissionCompteRendu ?? 0).getTime()
    )
  ));

  async function start() {
    if (!assignment) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await startIntervention(assignment.idAffectation);
      setNotice(intervention ? 'Nouvelle intervention démarrée pour traiter la reprise.' : 'Intervention démarrée. Vous pouvez documenter les opérations réalisées.');
      setProof(null); setReport(''); setExceptionReason('');
      await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Impossible de démarrer cette intervention.';
      await load(); setError(message);
    } finally { setBusy(false); }
  }

  async function chooseProof(source: 'camera' | 'gallery') {
    setPhotoBusy(true); setError(null);
    try {
      const selected = source === 'camera' ? await captureMobilePhoto() : (await pickMobilePhotos(1))[0] ?? null;
      if (selected) setProof(selected);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de préparer la photo.');
    } finally { setPhotoBusy(false); }
  }

  async function uploadProof() {
    if (!intervention || !proof) { setError('Choisissez une photo avant de l’envoyer.'); return; }
    const context = proofContext.trim();
    if (context.length < 3 || context.length > 100) { setError('Le contexte doit contenir entre 3 et 100 caractères.'); return; }
    setPhotoBusy(true); setError(null); setNotice(null);
    try {
      await uploadInterventionPhoto(intervention.idIntervention, proof, context, proofDescription.trim() || undefined);
      setProof(null); setProofContext(''); setProofDescription('');
      setNotice('Preuve photo privée ajoutée à l’intervention.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’envoyer la preuve photo.');
    } finally { setPhotoBusy(false); }
  }

  function confirmSubmit() {
    if (!intervention || !author) return;
    if (report.trim().length < 20) { setError('Le compte rendu doit contenir au moins 20 caractères.'); return; }
    if (result !== 'TERMINEE' && exceptionReason.trim().length < 5) {
      setError('Un motif d’exception d’au moins 5 caractères est obligatoire pour un résultat partiel ou impossible.');
      return;
    }
    Alert.alert(
      'Transmettre le compte rendu ?',
      'Votre saisie sera transmise à une vérification indépendante. La clôture du dossier n’intervient qu’après cette vérification.',
      [
        { text: 'Continuer la saisie', style: 'cancel' },
        { text: 'Transmettre', onPress: () => void submitReport() },
      ],
    );
  }

  async function submitReport() {
    if (!intervention || !author) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await submitIntervention(intervention.idIntervention, {
        resultatIntervention: result,
        compteRendu: report.trim(),
        ...(exceptionReason.trim() ? { motifException: exceptionReason.trim() } : {}),
      });
      setNotice('Compte rendu transmis. Il attend maintenant la vérification indépendante.');
      setReport(''); setExceptionReason('');
      await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Impossible de transmettre le compte rendu.';
      await load(); setError(message);
    } finally { setBusy(false); }
  }

  async function openNavigation() {
    const location = assignment?.contenuDossier.dossier;
    if (!location || location.latitude === null || location.longitude === null) {
      setError('Aucune coordonnée GPS n’est associée à cette affectation. Utilisez le repère textuel pour localiser le dépôt.');
      return;
    }
    try {
      const target = encodeURIComponent(location.latitude + ',' + location.longitude);
      await Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=' + target);
    } catch {
      setError('Impossible d’ouvrir l’application de navigation sur cet appareil.');
    }
  }

  if (loading && !assignment) {
    return <View className="flex-1 items-center justify-center bg-surface-base px-8"><ActivityIndicator color="#174C3D" size="large" /><Text className="mt-4 text-sm font-semibold text-ink-500">Chargement du détail de mission…</Text></View>;
  }
  if (!assignment) {
    return (
      <View className="flex-1 justify-center bg-surface-base px-6 py-10">
        <Text className="text-xs font-extrabold uppercase tracking-[0.15em] text-brand-petrol">ESPACE AGENT · MISSION</Text>
        <Text className="mt-3 text-2xl font-extrabold text-ink-900">Mission indisponible</Text>
        <View className="mt-4"><FeedbackBanner tone="error" message={error ?? 'Cette mission ne peut pas être affichée.'} /></View>
        <Pressable onPress={() => void load()} className="mt-5 rounded-xl bg-brand-forest px-4 py-3"><Text className="text-center text-sm font-extrabold text-white">Réessayer</Text></Pressable>
        <Pressable onPress={() => router.back()} className="mt-4 rounded-xl border border-line-strong bg-white px-4 py-3"><Text className="text-center text-sm font-bold text-brand-forest">Retour aux missions</Text></Pressable>
      </View>
    );
  }

  const location = assignment.contenuDossier.dossier;
  const canReport = intervention?.statutIntervention === 'EN_COURS' && author;
  const options = [
    { value: 'TERMINEE' as const, label: 'Terminée' },
    { value: 'PARTIELLE' as const, label: 'Partielle' },
    { value: 'IMPOSSIBLE' as const, label: 'Impossible' },
  ];

  return (
    <ScrollView className="flex-1 bg-surface-base" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#174C3D" />}>
      <Pressable onPress={() => router.back()} className="self-start rounded-full border border-line-strong bg-white px-3 py-2"><Text className="text-xs font-bold text-brand-forest">‹  Retour aux missions</Text></Pressable>
      <View className="mt-5 overflow-hidden rounded-3xl bg-brand-forest p-5">
        <Text className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-lime">DÉTAIL DE MISSION</Text>
        <Text className="mt-2 text-2xl font-extrabold text-white">{location.referenceDossier}</Text>
        <Text className="mt-1 text-sm text-white/75">{assignment.contenuDossier.typeDechet.libelle}</Text>
        <View className="mt-4 flex-row flex-wrap gap-2">
          {status ? <StatusBadge label={status.label} tone={status.tone} /> : null}
          <StatusBadge label={assignment.decisionEquipe === 'ACCEPTEE' ? 'Acceptée' : assignment.decisionEquipe === 'REFUSEE' ? 'Refusée' : 'En attente'} tone={assignment.decisionEquipe === 'ACCEPTEE' ? 'success' : assignment.decisionEquipe === 'REFUSEE' ? 'danger' : 'warning'} />
        </View>
        <Text className="mt-4 text-[10px] font-semibold text-white/65">Affectée le {dateLabel(assignment.dateHeureAffectation)}</Text>
      </View>

      {error ? <View className="mt-4"><FeedbackBanner tone="error" message={error} /></View> : null}
      {notice ? <View className="mt-4"><FeedbackBanner tone="success" message={notice} /></View> : null}

      <View className="mt-5 rounded-2xl border border-line-subtle bg-white p-4">
        <Text className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-petrol">PROCHAINE ÉTAPE</Text>
        {next ? <View className="mt-3"><FeedbackBanner tone={next.tone} title={next.title} message={next.body} /></View> : null}
        <View className="mt-4 flex-row items-center">
          {[
            { label: 'Affectation', active: true },
            { label: 'Intervention', active: Boolean(intervention) },
            { label: 'Vérification', active: intervention?.statutIntervention === 'SOUMISE' },
          ].map((item) => (
            <View key={item.label} className="min-w-0 flex-1 items-center">
              <View className={item.active ? 'h-2.5 w-2.5 rounded-full bg-brand-forest' : 'h-2.5 w-2.5 rounded-full bg-line-strong'} />
              <Text className="mt-2 text-center text-[9px] font-bold text-ink-500">{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mt-4 rounded-2xl border border-line-subtle bg-white p-4">
        <Text className="text-base font-extrabold text-ink-900">Localisation du dépôt</Text>
        <Text className="mt-2 text-sm leading-6 text-ink-600">{location.descriptionLocalisation || 'Aucun repère textuel n’a été communiqué.'}</Text>
        {location.latitude !== null && location.longitude !== null
          ? <Text className="mt-2 text-xs text-ink-400">{Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}{location.precisionLocalisation ? ' · précision ' + location.precisionLocalisation + ' m' : ''}</Text>
          : <Text className="mt-2 text-xs text-ink-400">Coordonnées GPS non renseignées.</Text>}
        <Pressable onPress={() => void openNavigation()} disabled={location.latitude === null || location.longitude === null} className="mt-4 rounded-xl border border-line-strong bg-surface-base px-4 py-3 disabled:opacity-45">
          <Text className="text-center text-xs font-extrabold text-brand-forest">Ouvrir l’itinéraire GPS</Text>
        </Pressable>
        <View className="mt-4 border-t border-line-subtle pt-3">
          <Text className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-petrol">ÉQUIPE AFFECTÉE</Text>
          <Text className="mt-1 text-sm font-bold text-ink-800">{teams.find((team) => team.idEquipe === teamId)?.nomEquipe ?? 'Équipe opérationnelle'}</Text>
        </View>
      </View>

      {assignment.decisionEquipe === 'EN_ATTENTE' ? (
        <View className="mt-4 rounded-2xl border border-line-subtle bg-white p-4">
          <Text className="text-base font-extrabold text-ink-900">Répondre à l’affectation</Text>
          <Text className="mt-1 text-xs leading-5 text-ink-500">L’acceptation engage votre équipe à prendre en charge cette mission. Un refus doit être motivé.</Text>
          <Text className="mt-4 text-xs font-bold text-ink-700">Motif de refus · obligatoire en cas de refus</Text>
          <TextInput value={refusalReason} onChangeText={setRefusalReason} minLength={5} maxLength={2000} multiline placeholder="Expliquez pourquoi l’équipe ne peut pas prendre cette mission…" placeholderTextColor="#8A968D" className={inputClass + ' min-h-[88px]'} textAlignVertical="top" />
          <Text className="mt-3 text-xs font-bold text-ink-700">Observation · facultative</Text>
          <TextInput value={observation} onChangeText={setObservation} maxLength={2000} placeholder="Ajouter une précision à l’équipe de coordination" placeholderTextColor="#8A968D" className={inputClass} />
          <View className="mt-4 flex-row gap-2">
            <Pressable onPress={() => void respond('REFUSEE')} disabled={busy} className={secondaryButton + ' flex-1'}><Text className="text-center text-xs font-extrabold text-ink-700">{busy ? 'Enregistrement…' : 'Refuser'}</Text></Pressable>
            <Pressable onPress={() => void respond('ACCEPTEE')} disabled={busy} className={primaryButton + ' flex-1'}><Text className="text-center text-xs font-extrabold text-white">{busy ? 'Enregistrement…' : 'Accepter la mission'}</Text></Pressable>
          </View>
        </View>
      ) : null}

      {canStart ? (
        <View className="mt-4 rounded-2xl border border-brand-mist bg-white p-4">
          <Text className="text-base font-extrabold text-ink-900">{intervention ? 'Nouvelle intervention' : 'Démarrer la mission'}</Text>
          <Text className="mt-1 text-xs leading-5 text-ink-500">{intervention ? 'Une reprise a été demandée par la vérification indépendante. Une nouvelle intervention sera créée dans le même parcours d’affectation.' : 'Le démarrage ouvre la phase de travail terrain. Le compte rendu sera soumis séparément après l’intervention.'}</Text>
          <Pressable onPress={() => void start()} disabled={busy} className={primaryButton + ' mt-4'}><Text className="text-center text-sm font-extrabold text-white">{busy ? 'Démarrage…' : intervention ? 'Démarrer la reprise' : 'Démarrer l’intervention'}</Text></Pressable>
        </View>
      ) : null}

      {intervention?.statutIntervention === 'EN_COURS' ? (
        <View className="mt-4 rounded-2xl border border-line-subtle bg-white p-4">
          <Text className="text-base font-extrabold text-ink-900">Exécution de l’intervention</Text>
          <Text className="mt-1 text-xs leading-5 text-ink-500">{author ? 'Votre intervention est en cours. Les preuves sont facultatives, mais leur contexte est obligatoire. Vous pourrez ensuite transmettre le compte rendu.' : 'Cette intervention a été démarrée par un autre membre de l’équipe. Vous pouvez consulter son état, mais seul son auteur peut transmettre le compte rendu.'}</Text>
          {author ? (
            <>
              <View className="mt-4 rounded-xl border border-line-subtle bg-surface-base p-3">
                <Text className="text-xs font-extrabold text-ink-800">Ajouter une preuve photo · facultatif</Text>
                <View className="mt-3 flex-row gap-2">
                  <Pressable onPress={() => void chooseProof('camera')} disabled={photoBusy} className={secondaryButton + ' flex-1'}><Text className="text-center text-xs font-bold text-ink-700">Appareil photo</Text></Pressable>
                  <Pressable onPress={() => void chooseProof('gallery')} disabled={photoBusy} className={primaryButton + ' flex-1'}><Text className="text-center text-xs font-bold text-white">Galerie</Text></Pressable>
                </View>
                {proof ? <Image source={{ uri: proof.uri }} resizeMode="cover" style={{ width: '100%', height: 170, borderRadius: 12, marginTop: 12 }} /> : null}
                <TextInput value={proofContext} onChangeText={setProofContext} maxLength={100} placeholder="Contexte obligatoire : avant collecte, pendant ou après l’intervention…" placeholderTextColor="#8A968D" className={inputClass + ' mt-3'} />
                <TextInput value={proofDescription} onChangeText={setProofDescription} maxLength={500} placeholder="Description complémentaire · facultative" placeholderTextColor="#8A968D" className={inputClass} />
                <Pressable onPress={() => void uploadProof()} disabled={!proof || photoBusy} className={primaryButton + ' mt-3'}><Text className="text-center text-xs font-extrabold text-white">{photoBusy ? 'Envoi…' : 'Envoyer la preuve privée'}</Text></Pressable>
                <Text className="mt-2 text-[10px] leading-4 text-ink-400">Les photos sont stockées dans un espace privé. Le contexte décrit le moment de l’intervention représenté.</Text>
              </View>

              <View className="mt-5 border-t border-line-subtle pt-4">
                <Text className="text-base font-extrabold text-ink-900">Compte rendu terrain</Text>
                <Text className="mt-1 text-xs leading-5 text-ink-500">Décrivez les opérations réalisées. Minimum 20 caractères. Si le résultat est partiel ou impossible, un motif d’au moins 5 caractères est requis.</Text>
                <TextInput value={report} onChangeText={setReport} maxLength={10000} multiline textAlignVertical="top" placeholder="Décrivez l’intervention, les actions réalisées et le résultat constaté…" placeholderTextColor="#8A968D" className={inputClass + ' min-h-[130px]'} />
                <Text className="mt-4 text-xs font-extrabold text-ink-700">Résultat de l’intervention</Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {options.map((option) => {
                    const selected = result === option.value;
                    return <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setResult(option.value)} className={selected ? 'rounded-full bg-brand-forest px-3 py-2.5' : 'rounded-full border border-line-strong bg-white px-3 py-2.5'}><Text className={selected ? 'text-xs font-extrabold text-white' : 'text-xs font-bold text-ink-700'}>{option.label}</Text></Pressable>;
                  })}
                </View>
                {result !== 'TERMINEE' ? (
                  <>
                    <Text className="mt-4 text-xs font-bold text-ink-700">Motif d’exception · obligatoire</Text>
                    <TextInput value={exceptionReason} onChangeText={setExceptionReason} minLength={5} maxLength={2000} multiline placeholder="Expliquez pourquoi le dépôt n’a pas pu être entièrement traité…" placeholderTextColor="#8A968D" className={inputClass + ' min-h-[88px]'} textAlignVertical="top" />
                  </>
                ) : null}
                <Pressable onPress={confirmSubmit} disabled={busy} className={primaryButton + ' mt-4'}><Text className="text-center text-sm font-extrabold text-white">{busy ? 'Transmission…' : 'Vérifier et transmettre le compte rendu'}</Text></Pressable>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {intervention?.statutIntervention === 'SOUMISE' ? (
        <View className="mt-4 rounded-2xl border border-line-subtle bg-white p-4">
          <Text className="text-base font-extrabold text-ink-900">Compte rendu transmis</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <StatusBadge label={'Résultat : ' + resultLabel(intervention.resultatIntervention)} tone={intervention.resultatIntervention === 'TERMINEE' ? 'success' : intervention.resultatIntervention === 'PARTIELLE' ? 'warning' : 'danger'} />
            <StatusBadge label={intervention.verification?.etatVerification === 'REPRISE' ? 'Reprise demandée' : intervention.verification?.etatVerification === 'VALIDEE' ? 'Vérification validée' : 'En attente de vérification'} tone={intervention.verification?.etatVerification === 'REPRISE' ? 'warning' : intervention.verification?.etatVerification === 'VALIDEE' ? 'success' : 'info'} />
          </View>
          {intervention.compteRendu ? <Text className="mt-3 text-sm leading-6 text-ink-700">{intervention.compteRendu}</Text> : null}
          {intervention.motifException ? <View className="mt-3 rounded-xl bg-surface-base p-3"><Text className="text-xs font-extrabold text-ink-700">Motif d’exception</Text><Text className="mt-1 text-sm leading-5 text-ink-600">{intervention.motifException}</Text></View> : null}
          {intervention.verification?.motif ? <View className="mt-3 rounded-xl bg-status-warning/10 p-3"><Text className="text-xs font-extrabold text-status-warning">Retour du vérificateur</Text><Text className="mt-1 text-sm leading-5 text-ink-700">{intervention.verification.motif}</Text></View> : null}
          <Text className="mt-3 text-[10px] text-ink-400">Transmis le {dateLabel(intervention.dateSoumissionCompteRendu)}. La décision de clôture reste indépendante de l’intervention.</Text>
        </View>
      ) : null}

      <View className="mt-5 rounded-2xl border border-line-subtle bg-white p-4">
        <Text className="text-xs font-extrabold uppercase tracking-[0.13em] text-brand-petrol">RAPPEL DE LA PROCÉDURE</Text>
        <Text className="mt-2 text-xs leading-5 text-ink-600">Une intervention terminée n’est pas automatiquement clôturée. Le compte rendu doit être examiné par un vérificateur indépendant. Il peut valider la résolution ou demander une reprise motivée.</Text>
      </View>
      <Pressable onPress={() => router.back()} className="mt-5 rounded-xl border border-line-strong bg-white px-4 py-3"><Text className="text-center text-sm font-bold text-brand-forest">Retour à la file des missions</Text></Pressable>
    </ScrollView>
  );
}
