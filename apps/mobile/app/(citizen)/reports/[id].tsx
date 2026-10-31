import { useCallback, useEffect, useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  answerSupplement,
  getMyReport,
  listReportSupplements,
  getReportPhotoUrl,
  uploadReportPhoto,
  type Report,
  type Supplement,
} from '../../../src/features/reports/reports-api';
import { dateLabel, reportStatusLabel } from '../../../src/features/reports/report-format';

const inputClass = 'mt-2 min-h-[100px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900';

export default function CitizenReportDetailScreen() {
  const params = useLocalSearchParams<{ id: string; photosFailed?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [report, setReport] = useState<Report | null>(null);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photoLinks, setPhotoLinks] = useState<Record<string, { url: string; expiresAt: number }>>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [reportData, supplementData] = await Promise.all([
        getMyReport(id),
        listReportSupplements(id),
      ]);
      setReport(reportData);
      setSupplements(supplementData.demandes);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger ce signalement.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const failed = Number(params.photosFailed ?? 0);
    if (Number.isFinite(failed) && failed > 0) {
      setNotice(failed + ' photo(s) n’ont pas pu être envoyées. Vous pouvez réessayer depuis cette page.');
    }
  }, [params.photosFailed]);

  async function uploadSelectedPhotos(photos: PreparedMobilePhoto[]) {
    if (!id || !photos.length) {
      setPhotoBusy(false);
      return;
    }
    setPhotoBusy(true);
    setError(null);
    setNotice(null);
    let failed = 0;
    for (const photo of photos) {
      try {
        await uploadReportPhoto(id, photo);
      } catch {
        failed += 1;
      }
    }
    await load();
    setPhotoBusy(false);
    setNotice(failed
      ? failed + ' photo(s) n’ont pas été envoyées. Vérifiez le réseau et réessayez.'
      : photos.length + ' photo(s) ajoutée(s) au signalement.');
  }

  async function choosePhotoGallery() {
    setPhotoBusy(true);
    setError(null);
    try {
      const photos = await pickMobilePhotos(3);
      if (photos.length) await uploadSelectedPhotos(photos);
      else setPhotoBusy(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de sélectionner les photos.');
      setPhotoBusy(false);
    }
  }

  async function takeReportPhoto() {
    setPhotoBusy(true);
    setError(null);
    try {
      const photo = await captureMobilePhoto();
      if (photo) await uploadSelectedPhotos([photo]);
      else setPhotoBusy(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de prendre une photo.');
      setPhotoBusy(false);
    }
  }

  async function openPrivatePhoto(photoId: string) {
    if (!id) return;
    setPhotoBusy(true);
    setError(null);
    try {
      const result = await getReportPhotoUrl(id, photoId);
      setPhotoLinks((current) => ({
        ...current,
        [photoId]: { url: result.signedUrl, expiresAt: Date.now() + result.expiresInSeconds * 1000 },
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger cette photo.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function sendAnswer(demand: Supplement) {
    const contenu = answers[demand.idDemande]?.trim() ?? '';
    if (contenu.length < 10 || contenu.length > 4000) {
      setError('La réponse doit contenir entre 10 et 4000 caractères.');
      return;
    }
    setBusyId(demand.idDemande);
    setError(null);
    setNotice(null);
    try {
      await answerSupplement(id!, demand.idDemande, contenu);
      setAnswers((current) => ({ ...current, [demand.idDemande]: '' }));
      setNotice('Votre complément a été transmis.');
      await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Impossible de transmettre votre réponse.';
      await load();
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !report) {
    return <View className="flex-1 items-center justify-center bg-eco-50"><ActivityIndicator color="#166534" /><Text className="mt-3 text-sm text-slate-500">Chargement…</Text></View>;
  }

  return (
    <ScrollView className="flex-1 bg-eco-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 }}>
      <Text className="text-xs font-extrabold uppercase tracking-[0.18em] text-eco-700">Suivi citoyen</Text>
      <Text className="mt-3 text-2xl font-extrabold text-eco-950">Détail du signalement</Text>
      {error ? <Text className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</Text> : null}
      {notice ? <Text className="mt-4 rounded-xl bg-eco-100 p-4 text-sm text-eco-900">{notice}</Text> : null}
      {report ? (
        <>
          <View className="mt-5 rounded-2xl border border-eco-100 bg-white p-5">
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <Text className="font-mono text-xs text-slate-500">#{report.idSignalement.slice(0, 8).toUpperCase()}</Text>
              <Text className="rounded-full bg-eco-50 px-3 py-1 text-xs font-bold text-eco-800">{reportStatusLabel(report.statutSignalement)}</Text>
            </View>
            <Text className="mt-4 text-base font-bold text-slate-900">Description</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-700">{report.description || 'Aucune description.'}</Text>
            <Text className="mt-4 text-xs text-slate-500">Soumis le {dateLabel(report.dateSoumission)}</Text>
            {report.dateConstat ? <Text className="mt-1 text-xs text-slate-500">Constaté le {dateLabel(report.dateConstat)}</Text> : null}
            {report.descriptionLocalisation ? <Text className="mt-3 text-sm text-slate-600">Lieu : {report.descriptionLocalisation}</Text> : null}
            {report.latitude && report.longitude ? <Text className="mt-1 text-xs text-slate-500">Coordonnées : {report.latitude}, {report.longitude}</Text> : null}
            {report.motifDecision ? <Text className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Motif de décision : {report.motifDecision}</Text> : null}
            {report.contenus.length ? (
              <View className="mt-5 border-t border-slate-100 pt-4">
                <Text className="text-sm font-bold text-slate-800">Catégories qualifiées</Text>
                {report.contenus.map((item) => <Text key={item.idTypeDechet} className="mt-2 text-sm text-slate-600">• {item.typeDechet.libelle}</Text>)}
              </View>
            ) : null}
          </View>

          <View className="mt-6 rounded-2xl border border-eco-100 bg-white p-5">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-base font-bold text-slate-900">Photos du signalement</Text>
              <Text className="text-xs text-slate-500">{report.photos.length}</Text>
            </View>
            <Text className="mt-1 text-xs leading-5 text-slate-500">Les photos sont privées. Un lien temporaire est obtenu uniquement lorsque vous demandez à les afficher.</Text>
            <View className="mt-3 flex-row gap-2">
              <TouchableOpacity onPress={() => void choosePhotoGallery()} disabled={photoBusy} className="flex-1 rounded-lg border border-eco-200 bg-white px-3 py-3 disabled:opacity-50">
                <Text className="text-center text-xs font-bold text-eco-800">Ajouter depuis la galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void takeReportPhoto()} disabled={photoBusy} className="flex-1 rounded-lg bg-eco-700 px-3 py-3 disabled:opacity-50">
                <Text className="text-center text-xs font-bold text-white">Prendre une photo</Text>
              </TouchableOpacity>
            </View>
            {photoBusy ? <Text className="mt-2 text-xs text-slate-500">Traitement…</Text> : null}
            <View className="mt-3 gap-3">
              {report.photos.map((photo) => {
                const link = photoLinks[photo.idPhotoSignalement];
                const active = link && link.expiresAt > Date.now() ? link : null;
                return (
                  <View key={photo.idPhotoSignalement} className="rounded-xl border border-slate-100 p-3">
                    {active ? (
                      <Image source={{ uri: active.url }} resizeMode="contain" style={{ width: '100%', height: 180, borderRadius: 8 }} />
                    ) : null}
                    <Text className="mt-2 text-xs text-slate-600">{photo.description || 'Photo du signalement'}</Text>
                    <Text className="mt-1 text-[10px] text-slate-400">Ajoutée le {dateLabel(photo.dateAjout)} · {photo.etatPublication}</Text>
                    <TouchableOpacity onPress={() => void openPrivatePhoto(photo.idPhotoSignalement)} disabled={photoBusy} className="mt-2 self-start">
                      <Text className="text-xs font-bold text-eco-700">{active ? 'Renouveler le lien privé (60 s)' : 'Afficher la photo (60 s)'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              {!report.photos.length ? <Text className="text-xs text-slate-500">Aucune photo jointe pour le moment.</Text> : null}
            </View>
          </View>

          <Text className="mt-7 text-lg font-extrabold text-eco-950">Demandes de complément</Text>
          {!supplements.length ? <Text className="mt-2 text-sm text-slate-500">Aucune demande de complément.</Text> : null}
          <View className="mt-3 gap-3">
            {supplements.map((demand) => (
              <View key={demand.idDemande} className="rounded-2xl border border-eco-100 bg-white p-5">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="text-xs font-bold text-slate-600">Demandé le {dateLabel(demand.dateDemande)}</Text>
                  <Text className="text-[10px] font-bold text-amber-700">{demand.etatDemande}</Text>
                </View>
                <Text className="mt-3 text-sm leading-6 text-slate-800">{demand.motif}</Text>
                {demand.reponse ? (
                  <View className="mt-4 rounded-lg bg-eco-50 p-3">
                    <Text className="text-xs font-bold text-eco-800">Votre réponse · {dateLabel(demand.reponse.dateReponse)}</Text>
                    <Text className="mt-2 text-sm leading-6 text-slate-700">{demand.reponse.contenu}</Text>
                  </View>
                ) : null}
                {demand.etatDemande === 'OUVERTE' ? (
                  <View className="mt-4">
                    <Text className="text-xs font-bold text-slate-700">Votre réponse (10 à 4000 caractères)</Text>
                    <TextInput
                      multiline
                      textAlignVertical="top"
                      value={answers[demand.idDemande] ?? ''}
                      onChangeText={(value) => setAnswers((current) => ({ ...current, [demand.idDemande]: value }))}
                      maxLength={4000}
                      className={inputClass}
                      placeholder="Précisez les informations demandées…"
                    />
                    <TouchableOpacity onPress={() => void sendAnswer(demand)} disabled={busyId === demand.idDemande} className="mt-3 rounded-xl bg-eco-700 px-4 py-3 disabled:opacity-50">
                      <Text className="text-center text-sm font-bold text-white">{busyId === demand.idDemande ? 'Envoi…' : 'Transmettre la réponse'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Link href="/(citizen)/reports" className="mt-8 text-center text-sm font-semibold text-eco-700">Retour à mes signalements</Link>
    </ScrollView>
  );
}
