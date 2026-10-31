import { useRef, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  createReportIdempotencyKey,
  submitReport,
  type CreateReportPayload,
} from '../../../src/features/reports/reports-api';
import { localDateTimeToIso, parseOptionalCoordinate } from '../../../src/features/reports/report-format';
import { uploadReportPhoto } from '../../../src/features/reports/reports-api';
import { captureMobilePhoto, pickMobilePhotos, prepareMobilePhoto, requestCurrentForegroundCoordinates, type PreparedMobilePhoto } from '../../../src/features/media/mobile-media';

const inputClass = 'mt-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900';

export default function NewCitizenReportScreen() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [dateConstat, setDateConstat] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [precision, setPrecision] = useState('');
  const [pickedPhotos, setPickedPhotos] = useState<PreparedMobilePhoto[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  async function handleSubmit() {
    setError(null);
    setNotice(null);
    const cleanDescription = description.trim();
    if (cleanDescription.length < 10 || cleanDescription.length > 5000) {
      setError('La description doit contenir entre 10 et 5000 caractères.');
      return;
    }

    try {
      const lat = parseOptionalCoordinate(latitude, -90, 90);
      const lon = parseOptionalCoordinate(longitude, -180, 180);
      const precisionNumber = precision.trim() ? Number(precision.trim().replace(',', '.')) : undefined;
      if ((lat === undefined) !== (lon === undefined)) {
        throw new Error('Renseignez la latitude et la longitude ensemble, ou laissez les deux vides.');
      }
      if (precisionNumber !== undefined && lat === undefined) {
        throw new Error('La précision ne peut être renseignée que si les coordonnées sont fournies.');
      }
      if (precisionNumber !== undefined && (!Number.isFinite(precisionNumber) || precisionNumber < 0 || precisionNumber > 100000)) {
        throw new Error('La précision doit être comprise entre 0 et 100000 mètres.');
      }
      const payload: CreateReportPayload = {
        description: cleanDescription,
        ...(dateConstat.trim() ? { dateConstat: localDateTimeToIso(dateConstat) } : {}),
        ...(locationDescription.trim() ? { descriptionLocalisation: locationDescription.trim() } : {}),
        ...(lat !== undefined && lon !== undefined
          ? { latitude: lat, longitude: lon, ...(precisionNumber !== undefined ? { precisionLocalisation: precisionNumber } : {}) }
          : {}),
      };
      const fingerprint = JSON.stringify(payload);
      if (!idempotencyRef.current || idempotencyRef.current.fingerprint !== fingerprint) {
        idempotencyRef.current = { fingerprint, key: createReportIdempotencyKey() };
      }
      setBusy(true);
      const result = await submitReport(payload, idempotencyRef.current.key);
      idempotencyRef.current = null;

      let photosFailed = 0;
      for (const photo of pickedPhotos) {
        try {
          await uploadReportPhoto(result.idSignalement, photo);
        } catch {
          photosFailed += 1;
        }
      }

      router.replace({
        pathname: '/(citizen)/reports/[id]',
        params: { id: result.idSignalement, photosFailed: String(photosFailed) },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’enregistrer le signalement.');
    } finally {
      setBusy(false);
    }
  }

  async function chooseGallery() {
    setMediaBusy(true);
    setError(null);
    try {
      const remaining = Math.max(0, 3 - pickedPhotos.length);
      if (!remaining) {
        setError('Vous pouvez joindre au maximum 3 photos par signalement.');
        return;
      }
      const photos = await pickMobilePhotos(remaining);
      if (photos.length) setPickedPhotos((current) => [...current, ...photos].slice(0, 3));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de sélectionner les photos.');
    } finally {
      setMediaBusy(false);
    }
  }

  async function takePhoto() {
    setMediaBusy(true);
    setError(null);
    try {
      if (pickedPhotos.length >= 3) {
        setError('Vous pouvez joindre au maximum 3 photos par signalement.');
        return;
      }
      const photo = await captureMobilePhoto();
      if (photo) setPickedPhotos((current) => [...current, photo].slice(0, 3));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de prendre une photo.');
    } finally {
      setMediaBusy(false);
    }
  }

  async function useCurrentLocation() {
    setGettingLocation(true);
    setError(null);
    try {
      const coordinates = await requestCurrentForegroundCoordinates();
      setLatitude(coordinates.latitude.toFixed(6));
      setLongitude(coordinates.longitude.toFixed(6));
      setPrecision(coordinates.precisionLocalisation === undefined ? '' : String(coordinates.precisionLocalisation));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'La position actuelle est indisponible.');
    } finally {
      setGettingLocation(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-eco-50" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 }}>
      <Text className="text-xs font-extrabold uppercase tracking-[0.18em] text-eco-700">Espace citoyen</Text>
      <Text className="mt-3 text-3xl font-extrabold text-eco-950">Nouveau signalement</Text>
      <Text className="mt-2 text-sm leading-6 text-slate-600">
        Décrivez le problème environnemental observé. La localisation est facultative et peut être ajoutée manuellement.
      </Text>

      <View className="mt-6 gap-4">
        <View>
          <Text className="text-xs font-bold text-slate-700">Description (10 à 5000 caractères) *</Text>
          <TextInput value={description} onChangeText={setDescription} multiline maxLength={5000} textAlignVertical="top" placeholder="Décrivez le dépôt, le type de problème, les éléments visibles…" className={inputClass + ' mt-2 min-h-[150px]'} />
          <Text className="mt-1 text-right text-[10px] text-slate-400">{description.trim().length}/5000</Text>
        </View>
        <View>
          <Text className="text-xs font-bold text-slate-700">Date et heure du constat (facultatif)</Text>
          <TextInput value={dateConstat} onChangeText={setDateConstat} placeholder="2026-10-31T14:30" autoCapitalize="none" className={inputClass} />
          <Text className="mt-1 text-[10px] leading-4 text-slate-400">Format : AAAA-MM-JJTHH:mm. Laissez vide si vous ne connaissez pas la date.</Text>
        </View>
        <View>
          <Text className="text-xs font-bold text-slate-700">Description du lieu (facultatif)</Text>
          <TextInput value={locationDescription} onChangeText={setLocationDescription} maxLength={1000} placeholder="Quartier, rue, repère à proximité…" className={inputClass} />
        </View>
        <View className="rounded-xl border border-eco-100 bg-white p-4">
          <Text className="text-xs font-bold text-slate-700">Localisation facultative</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-500">La position n’est lue qu’après votre action. Aucune localisation en arrière-plan n’est utilisée.</Text>
          <TouchableOpacity onPress={() => void useCurrentLocation()} disabled={gettingLocation} className="mt-3 rounded-lg bg-eco-700 px-4 py-3 disabled:opacity-50">
            <Text className="text-center text-xs font-bold text-white">{gettingLocation ? 'Lecture de la position…' : 'Utiliser ma position actuelle'}</Text>
          </TouchableOpacity>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700">Latitude</Text>
              <TextInput value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" placeholder="14.7167" className={inputClass} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700">Longitude</Text>
              <TextInput value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" placeholder="-17.4677" className={inputClass} />
            </View>
          </View>
          <Text className="mt-1 text-[10px] text-slate-400">Vous pouvez aussi saisir les coordonnées manuellement ou refuser la permission.</Text>
        </View>
        <View>
          <Text className="text-xs font-bold text-slate-700">Précision estimée en mètres (facultatif)</Text>
          <TextInput value={precision} onChangeText={setPrecision} keyboardType="decimal-pad" placeholder="Ex. 15" className={inputClass} />
        </View>

        <View className="rounded-xl border border-eco-100 bg-white p-4">
          <Text className="text-xs font-bold text-slate-700">Photos du signalement (facultatif, 3 maximum)</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-500">Les photos sont converties en JPEG avant l’envoi et stockées dans l’espace privé du signalement.</Text>
          <View className="mt-3 flex-row gap-2">
            <TouchableOpacity onPress={() => void chooseGallery()} disabled={mediaBusy || pickedPhotos.length >= 3} className="flex-1 rounded-lg border border-eco-200 bg-white px-3 py-3 disabled:opacity-50">
              <Text className="text-center text-xs font-bold text-eco-800">Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void takePhoto()} disabled={mediaBusy || pickedPhotos.length >= 3} className="flex-1 rounded-lg bg-eco-700 px-3 py-3 disabled:opacity-50">
              <Text className="text-center text-xs font-bold text-white">Appareil photo</Text>
            </TouchableOpacity>
          </View>
          {mediaBusy ? <Text className="mt-2 text-xs text-slate-500">Préparation des images…</Text> : null}
          <View className="mt-3 flex-row flex-wrap gap-2">
            {pickedPhotos.map((photo, index) => (
              <View key={photo.uri} className="relative">
                <Image source={{ uri: photo.uri }} style={{ width: 88, height: 88, borderRadius: 10 }} />
                <TouchableOpacity
                  onPress={() => setPickedPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  className="mt-1 rounded-md bg-slate-100 px-2 py-1"
                >
                  <Text className="text-center text-[10px] font-semibold text-slate-700">Retirer</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <Text className="mt-2 text-[10px] text-slate-400">{pickedPhotos.length}/3 photo(s) sélectionnée(s). Limite serveur : 10 Mo par image.</Text>
        </View>
      </View>

      {notice ? <Text className="mt-5 rounded-xl bg-eco-100 p-4 text-sm text-eco-900">{notice}</Text> : null}
      {error ? <Text className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</Text> : null}
      <TouchableOpacity onPress={() => void handleSubmit()} disabled={busy} className="mt-7 rounded-xl bg-eco-700 px-5 py-4 disabled:opacity-50">
        <Text className="text-center font-bold text-white">{busy ? 'Envoi en cours…' : 'Envoyer le signalement'}</Text>
      </TouchableOpacity>
      <Link href="/(citizen)/reports" className="mt-6 text-center text-sm font-semibold text-eco-700">Annuler</Link>
    </ScrollView>
  );
}
