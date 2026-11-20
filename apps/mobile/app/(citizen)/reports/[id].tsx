import { useCallback, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  answerSupplement,
  getMyReport,
  getMyReportHistory,
  type ReportHistory,
  listReportSupplements,
  getReportPhotoUrl,
  uploadReportPhoto,
  type Report,
  type Supplement,
} from '../../../src/features/reports/reports-api';
import { dateLabel, reportStatusLabel } from '../../../src/features/reports/report-format';
import { deriveReportProgress } from '../../../src/features/reports/report-progress.mjs';
import { FeedbackBanner } from '../../../src/ui/FeedbackBanner';
import {
  captureMobilePhoto,
  pickMobilePhotos,
  type PreparedMobilePhoto,
} from '../../../src/features/media/mobile-media';

function reportBadgeInfo(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'SOUMIS':
      return { label: 'Reçu / En attente', bg: 'bg-amber-100', text: 'text-amber-800' };
    case 'EN_ATTENTE_COMPLEMENT':
      return { label: 'Complément demandé', bg: 'bg-orange-100', text: 'text-orange-800' };
    case 'COMPLEMENT_REPONDU':
      return { label: 'Complément transmis', bg: 'bg-blue-100', text: 'text-blue-800' };
    case 'QUALIFIE':
      return { label: 'Qualifié par les services', bg: 'bg-emerald-100', text: 'text-emerald-800' };
    case 'REJETE':
      return { label: 'Non retenu', bg: 'bg-rose-100', text: 'text-rose-800' };
    default:
      return { label: reportStatusLabel(status), bg: 'bg-slate-100', text: 'text-slate-800' };
  }
}

export default function CitizenReportDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; photosFailed?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [report, setReport] = useState<Report | null>(null);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [history, setHistory] = useState<ReportHistory | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photoLinks, setPhotoLinks] = useState<Record<string, { url: string; expiresAt: number }>>(
    {},
  );
  const [photoBusy, setPhotoBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError('Identifiant de signalement manquant.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [reportData, supplementData] = await Promise.all([
        getMyReport(id),
        listReportSupplements(id),
      ]);
      setReport(reportData);
      setSupplements(supplementData.demandes);

      // Auto-fetch photo URLs if available
      if (reportData.photos.length > 0) {
        for (const p of reportData.photos) {
          try {
            const result = await getReportPhotoUrl(id, p.idPhotoSignalement);
            setPhotoLinks((curr) => ({
              ...curr,
              [p.idPhotoSignalement]: {
                url: result.signedUrl,
                expiresAt: Date.now() + result.expiresInSeconds * 1000,
              },
            }));
          } catch {
            // Photo link will load on demand
          }
        }
      }

      try {
        setHistory(await getMyReportHistory(id));
      } catch {
        // Timeline fallback
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger ce signalement.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadSelectedPhotos(photos: PreparedMobilePhoto[]) {
    if (!id || !photos.length) return;
    setPhotoBusy(true);
    setError(null);
    setNotice(null);
    let failed = 0;
    for (const p of photos) {
      try {
        await uploadReportPhoto(id, p);
      } catch {
        failed += 1;
      }
    }
    await load();
    setPhotoBusy(false);
    setNotice(
      failed
        ? `${failed} photo(s) n’ont pas été envoyées.`
        : `${photos.length} photo(s) ajoutée(s) avec succès.`,
    );
  }

  async function choosePhotoGallery() {
    setPhotoBusy(true);
    try {
      const remaining = Math.max(0, 3 - (report?.photos.length ?? 0));
      if (remaining <= 0) {
        setError('Maximum 3 photos par signalement.');
        return;
      }
      const photos = await pickMobilePhotos(remaining);
      if (photos.length) await uploadSelectedPhotos(photos);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Erreur lors du choix de photos.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function takePhoto() {
    setPhotoBusy(true);
    try {
      if ((report?.photos.length ?? 0) >= 3) {
        setError('Maximum 3 photos par signalement.');
        return;
      }
      const photo = await captureMobilePhoto();
      if (photo) await uploadSelectedPhotos([photo]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Erreur lors de la capture.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function openPrivatePhoto(photoId: string) {
    if (!id) return;
    setPhotoBusy(true);
    try {
      const result = await getReportPhotoUrl(id, photoId);
      setPhotoLinks((current) => ({
        ...current,
        [photoId]: {
          url: result.signedUrl,
          expiresAt: Date.now() + result.expiresInSeconds * 1000,
        },
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Photo inaccessible.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function sendAnswer(demand: Supplement) {
    const contenu = answers[demand.idDemande]?.trim() ?? '';
    if (contenu.length < 10 || contenu.length > 4000) {
      setError('La réponse doit comporter entre 10 et 4000 caractères.');
      return;
    }
    setBusyId(demand.idDemande);
    setError(null);
    try {
      await answerSupplement(id!, demand.idDemande, contenu);
      setAnswers((c) => ({ ...c, [demand.idDemande]: '' }));
      setNotice('Votre réponse a été transmise au service.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Erreur de transmission.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !report) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F8FAF9]">
        <ActivityIndicator size="large" color="#174C3D" />
        <Text className="mt-4 text-sm font-semibold text-ink-500">
          Chargement du signalement...
        </Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View className="flex-1 justify-center bg-[#F8FAF9] px-6 py-10">
        <Text className="text-xl font-extrabold text-ink-900">Signalement introuvable</Text>
        <Text className="mt-2 text-sm text-ink-500">
          {error ?? 'Ce signalement est inaccessible.'}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(citizen)/reports')}
          className="mt-6 rounded-2xl bg-brand-forest py-4"
        >
          <Text className="text-center font-extrabold text-white">Retour à mes signalements</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const firstPhoto = report.photos[0];
  const firstPhotoUrl = firstPhoto ? photoLinks[firstPhoto.idPhotoSignalement]?.url : null;
  const displayTitle = report.contenus[0]?.typeDechet.libelle ?? 'Dépôt sauvage';
  const hasCoordinates = report.latitude !== null && report.longitude !== null;
  // The signalement status stops at QUALIFIE; operational progress comes from the dossier timeline.
  const progress = deriveReportProgress(report.statutSignalement, history?.events ?? []);
  const badge = progress.isStage4Done
    ? { label: 'Dossier clôturé', bg: 'bg-emerald-800', text: 'text-white' }
    : reportBadgeInfo(report.statutSignalement);
  const isStage2Done = progress.isStage2Done;
  const isStage3Active = progress.isStage3Active;
  const isStage3Done = progress.isStage3Done;
  const isStage4Done = progress.isStage4Done;
  const isRejected = report.statutSignalement === 'REJETE';

  return (
    <View className="flex-1 bg-[#F8FAF9]">
      {/* Top Bar matching mobile-screen.PNG */}
      <View className="flex-row items-center justify-between border-b border-line-subtle bg-white px-5 pb-3.5 pt-12">
        <TouchableOpacity
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/(citizen)/reports')
          }
          className="flex-row items-center gap-2"
        >
          <Text className="text-lg font-bold text-ink-700">←</Text>
          <Text className="text-base font-extrabold text-ink-900">Mon signalement</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => void load()}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-base"
        >
          <Text className="text-xs">🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 50 }}
      >
        {notice && (
          <View className="mb-4">
            <FeedbackBanner tone="success" message={notice} />
          </View>
        )}
        {error && (
          <View className="mb-4">
            <FeedbackBanner tone="error" message={error} />
          </View>
        )}

        {/* HERO REPORT CARD (Matching mobile-screen.PNG) */}
        <View className="overflow-hidden rounded-3xl border border-line-subtle bg-white p-4 shadow-sm">
          <View className="flex-row items-center gap-3.5">
            {firstPhotoUrl ? (
              <Image
                source={{ uri: firstPhotoUrl }}
                resizeMode="cover"
                style={{ width: 84, height: 84, borderRadius: 18 }}
              />
            ) : (
              <View className="h-[84px] w-[84px] items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100">
                <Text className="text-3xl">🗑️</Text>
              </View>
            )}
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-mono text-[11px] font-bold text-ink-400">
                  #IS-{report.idSignalement.slice(0, 8).toUpperCase()}
                </Text>
              </View>
              <Text className="mt-0.5 text-base font-extrabold text-ink-900" numberOfLines={1}>
                {displayTitle}
              </Text>
              <Text className="mt-1 text-xs text-ink-500" numberOfLines={1}>
                {report.descriptionLocalisation ||
                  (hasCoordinates ? 'Position GPS confirmée' : 'Signalé récemment')}
              </Text>
              <View className="mt-2.5 self-start">
                <View className={`rounded-full px-3 py-1 ${badge.bg}`}>
                  <Text className={`text-[11px] font-extrabold ${badge.text}`}>{badge.label}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* VERTICAL STEPPER (Matching mobile-screen.PNG & Screen 4) */}
        <View className="mt-5 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
          <Text className="text-sm font-extrabold text-ink-900">Évolution du signalement</Text>

          <View className="mt-5">
            {/* Step 1: Signalement envoyé */}
            <View className="flex-row">
              <View className="mr-3.5 items-center">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-700 shadow-sm">
                  <Text className="text-xs font-bold text-white">✓</Text>
                </View>
                <View
                  className={`w-0.5 flex-1 min-h-[32px] ${isStage2Done ? 'bg-emerald-700' : 'bg-slate-200'}`}
                />
              </View>
              <View className="flex-1 pb-4">
                <Text className="text-sm font-bold text-ink-900">Signalement envoyé</Text>
                <Text className="mt-0.5 text-xs text-ink-400">
                  {dateLabel(report.dateSoumission)}
                </Text>
              </View>
            </View>

            {/* Step 2: Signalement qualifié */}
            <View className="flex-row">
              <View className="mr-3.5 items-center">
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full shadow-sm ${
                    isStage2Done ? 'bg-emerald-700' : 'bg-slate-100 border border-slate-300'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${isStage2Done ? 'text-white' : 'text-slate-400'}`}
                  >
                    {isStage2Done ? '✓' : '2'}
                  </Text>
                </View>
                <View
                  className={`w-0.5 flex-1 min-h-[32px] ${
                    isStage3Done || isStage3Active ? 'bg-emerald-700' : 'bg-slate-200'
                  }`}
                />
              </View>
              <View className="flex-1 pb-4">
                <Text
                  className={`text-sm font-bold ${isStage2Done ? 'text-ink-900' : 'text-ink-400'}`}
                >
                  Validé par les services
                </Text>
                <Text className="mt-0.5 text-xs text-ink-400">
                  {isRejected
                    ? report.motifDecision || 'Les services n’ont pas retenu ce signalement.'
                    : isStage2Done
                      ? 'Catégorisation et vérification approuvées'
                      : report.statutSignalement === 'EN_ATTENTE_COMPLEMENT'
                        ? 'Des précisions sont attendues avant la qualification.'
                        : report.statutSignalement === 'COMPLEMENT_REPONDU'
                          ? 'Votre complément a été transmis et attend une revue.'
                          : 'En attente de revue administrative'}
                </Text>
              </View>
            </View>

            {/* Step 3: Intervention en cours */}
            <View className="flex-row">
              <View className="mr-3.5 items-center">
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full shadow-sm ${
                    isStage3Done
                      ? 'bg-emerald-700'
                      : isStage3Active
                        ? 'bg-emerald-600 ring-4 ring-emerald-100'
                        : 'bg-slate-100 border border-slate-300'
                  }`}
                >
                  <Text className="text-xs">{isStage3Done ? '✓' : '🚚'}</Text>
                </View>
                <View
                  className={`w-0.5 flex-1 min-h-[32px] ${isStage4Done ? 'bg-emerald-700' : 'bg-slate-200'}`}
                />
              </View>
              <View className="flex-1 pb-4">
                <Text
                  className={`text-sm font-bold ${
                    isStage3Active
                      ? 'text-emerald-900'
                      : isStage3Done
                        ? 'text-ink-900'
                        : 'text-ink-400'
                  }`}
                >
                  Intervention en cours
                </Text>
                <Text className="mt-0.5 text-xs text-ink-400">
                  {isStage3Active
                    ? 'Intervention démarrée ou reprise demandée par le vérificateur'
                    : isStage3Done
                      ? 'Compte rendu transmis, en attente de vérification'
                      : 'Planification par le centre opérationnel'}
                </Text>
              </View>
            </View>

            {/* Step 4: Dépôt nettoyé */}
            <View className="flex-row">
              <View className="mr-3.5 items-center">
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full shadow-sm ${
                    isStage4Done ? 'bg-emerald-700' : 'bg-slate-100 border border-slate-300'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${isStage4Done ? 'text-white' : 'text-slate-400'}`}
                  >
                    {isStage4Done ? '✓' : '4'}
                  </Text>
                </View>
              </View>
              <View className="flex-1">
                <Text
                  className={`text-sm font-bold ${isStage4Done ? 'text-ink-900' : 'text-ink-400'}`}
                >
                  Dépôt nettoyé
                </Text>
                <Text className="mt-0.5 text-xs text-ink-400">
                  {isStage4Done ? 'Le dossier a été clôturé après vérification' : 'En attente de clôture'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* LOCATION & MINI MAP CARD */}
        <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-ink-900">Localisation</Text>
            {hasCoordinates && (
              <View className="rounded-full bg-emerald-50 px-2.5 py-1">
                <Text className="text-[10px] font-bold text-emerald-800">GPS actif</Text>
              </View>
            )}
          </View>

          <View className="mt-3 flex-row items-start gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <Text className="text-base">📍</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-bold text-ink-800">
                {report.descriptionLocalisation || 'Adresse repérée'}
              </Text>
              {hasCoordinates && (
                <Text className="mt-0.5 font-mono text-[11px] text-ink-400">
                  {report.latitude}, {report.longitude}
                </Text>
              )}
            </View>
          </View>

          {hasCoordinates && (
            <TouchableOpacity
              onPress={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
                void Linking.openURL(url);
              }}
              className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 py-3"
            >
              <Text className="text-xs font-extrabold text-brand-forest">🧭 Voir sur la carte</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* PHOTOS DU SIGNALEMENT */}
        <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-ink-900">
              Photos du signalement ({report.photos.length}/3)
            </Text>
            {report.photos.length < 3 && (
              <TouchableOpacity
                onPress={() => void takePhoto()}
                disabled={photoBusy}
                className="rounded-full bg-brand-forest px-3 py-1"
              >
                <Text className="text-[10px] font-bold text-white">+ Ajouter</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="mt-3.5 gap-3">
            {report.photos.map((p) => {
              const link = photoLinks[p.idPhotoSignalement];
              const active = link && link.expiresAt > Date.now() ? link : null;
              return (
                <View
                  key={p.idPhotoSignalement}
                  className="overflow-hidden rounded-2xl border border-line-subtle bg-[#F8FAF9] p-3"
                >
                  {active ? (
                    <Image
                      source={{ uri: active.url }}
                      resizeMode="cover"
                      style={{ width: '100%', height: 180, borderRadius: 12 }}
                    />
                  ) : (
                    <View className="h-28 items-center justify-center rounded-xl bg-slate-100">
                      <TouchableOpacity
                        onPress={() => void openPrivatePhoto(p.idPhotoSignalement)}
                        className="rounded-xl bg-brand-forest px-3.5 py-2"
                      >
                        <Text className="text-xs font-bold text-white">Afficher la photo</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text className="mt-2 text-xs font-medium text-ink-500">
                    {p.description || 'Photo jointe'} • {dateLabel(p.dateAjout)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* DEMANDES DE COMPLÉMENT (SI DISPONIBLES) */}
        {supplements.length > 0 && (
          <View className="mt-4 rounded-3xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
            <Text className="text-sm font-extrabold text-amber-950">
              Demande de précision des services
            </Text>
            {supplements.map((demand) => (
              <View
                key={demand.idDemande}
                className="mt-3 rounded-2xl bg-white p-4 border border-amber-200"
              >
                <Text className="text-xs font-bold text-ink-900">{demand.motif}</Text>
                <Text className="mt-1 text-[10px] text-ink-400">
                  Demandé le {dateLabel(demand.dateDemande)}
                </Text>

                {demand.reponse ? (
                  <View className="mt-3 rounded-xl bg-emerald-50 p-3">
                    <Text className="text-[11px] font-bold text-emerald-950">Votre réponse :</Text>
                    <Text className="mt-1 text-xs text-emerald-900">{demand.reponse.contenu}</Text>
                  </View>
                ) : (
                  <View className="mt-3">
                    <TextInput
                      multiline
                      value={answers[demand.idDemande] ?? ''}
                      onChangeText={(val) => setAnswers((c) => ({ ...c, [demand.idDemande]: val }))}
                      placeholder="Précisez les informations demandées..."
                      placeholderTextColor="#94A3B8"
                      className="rounded-xl border border-line-strong bg-white p-3 text-xs text-ink-900"
                    />
                    <TouchableOpacity
                      onPress={() => void sendAnswer(demand)}
                      disabled={busyId === demand.idDemande}
                      className="mt-2 rounded-xl bg-brand-forest py-2.5"
                    >
                      <Text className="text-center text-xs font-extrabold text-white">
                        {busyId === demand.idDemande ? 'Envoi...' : 'Transmettre ma réponse'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
