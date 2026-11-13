import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  createReportIdempotencyKey,
  listAvailableWasteTypes,
  submitReportWithPhoto,
  type CreateReportPayload,
  type WasteTypeOption,
} from '../../../src/features/reports/reports-api';
import { parseOptionalCoordinate } from '../../../src/features/reports/report-format';
import {
  captureMobilePhoto,
  pickMobilePhotos,
  requestCurrentForegroundCoordinates,
  type PreparedMobilePhoto,
} from '../../../src/features/media/mobile-media';

const inputClass = 'mt-1 rounded-xl border border-line-strong bg-white px-4 py-3 text-base text-ink-900';

export default function NewCitizenReportScreen() {
  const router = useRouter();
  const [photo, setPhoto] = useState<PreparedMobilePhoto | null>(null);
  const [description, setDescription] = useState('');
  const [wasteTypes, setWasteTypes] = useState<WasteTypeOption[]>([]);
  const [selectedWasteTypeIds, setSelectedWasteTypeIds] = useState<string[]>([]);
  const [wasteTypesError, setWasteTypesError] = useState<string | null>(null);
  const [locationDescription, setLocationDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [precision, setPrecision] = useState('');
  const [mediaBusy, setMediaBusy] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    let active = true;
    listAvailableWasteTypes()
      .then((items) => { if (active) setWasteTypes(items); })
      .catch(() => {
        if (active) setWasteTypesError('Les catégories ne sont pas disponibles pour le moment. Vous pouvez tout de même envoyer votre signalement.');
      });
    return () => { active = false; };
  }, []);

  async function chooseGallery() {
    setMediaBusy(true);
    setError(null);
    try {
      const selected = (await pickMobilePhotos(1))[0] ?? null;
      if (selected) setPhoto(selected);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de sélectionner la photo.');
    } finally {
      setMediaBusy(false);
    }
  }

  async function takePhoto() {
    setMediaBusy(true);
    setError(null);
    try {
      const captured = await captureMobilePhoto();
      if (captured) setPhoto(captured);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de prendre la photo.');
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
      setError(reason instanceof Error ? reason.message : 'La position actuelle est indisponible. Vous pouvez saisir les coordonnées manuellement.');
    } finally {
      setGettingLocation(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!photo) {
      setError('Ajoutez une photo du dépôt pour envoyer le signalement.');
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
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(selectedWasteTypeIds.length
          ? { contenus: selectedWasteTypeIds.map((idTypeDechet) => ({ idTypeDechet })) }
          : {}),
        ...(locationDescription.trim() ? { descriptionLocalisation: locationDescription.trim() } : {}),
        ...(lat !== undefined && lon !== undefined
          ? {
              latitude: lat,
              longitude: lon,
              ...(precisionNumber !== undefined ? { precisionLocalisation: precisionNumber } : {}),
            }
          : {}),
      };
      const fingerprint = JSON.stringify({ payload, photoUri: photo.uri });
      if (!idempotencyRef.current || idempotencyRef.current.fingerprint !== fingerprint) {
        idempotencyRef.current = { fingerprint, key: createReportIdempotencyKey() };
      }

      setBusy(true);
      const result = await submitReportWithPhoto(payload, idempotencyRef.current.key, photo);
      idempotencyRef.current = null;
      router.replace({
        pathname: '/(citizen)/reports/[id]',
        params: { id: result.idSignalement },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible d’enregistrer le signalement.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-base"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-forest">Espace citoyen</Text>
      <Text className="mt-3 text-3xl font-extrabold text-ink-900">Signaler un dépôt</Text>
      <Text className="mt-2 text-sm leading-6 text-ink-500">
        Une photo pour commencer. La localisation, la description et le type de déchets vous aident à préciser le signalement.
      </Text>

      <View className="mt-6 gap-5">
        <View className="rounded-3xl border border-line-subtle bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-ink-900">1. Photo du dépôt</Text>
            <Text className="text-[10px] font-bold uppercase text-status-danger">Requise</Text>
          </View>
          {photo ? (
            <View className="mt-3">
              <Image source={{ uri: photo.uri }} resizeMode="cover" style={{ width: '100%', height: 220, borderRadius: 16 }} />
              <TouchableOpacity onPress={() => setPhoto(null)} className="mt-2 self-end px-2 py-2">
                <Text className="text-xs font-bold text-ink-500">Retirer la photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mt-3 min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface-base px-5 py-6">
              <Text className="text-4xl text-brand-forest">＋</Text>
              <Text className="mt-2 text-sm font-bold text-ink-800">Photographiez le dépôt</Text>
              <Text className="mt-1 text-center text-xs leading-5 text-ink-500">Prenez une photo maintenant ou choisissez-en une dans votre galerie.</Text>
            </View>
          )}
          <View className="mt-3 flex-row gap-2">
            <TouchableOpacity onPress={() => void takePhoto()} disabled={mediaBusy || busy} className="flex-1 rounded-xl bg-brand-forest px-3 py-3 disabled:opacity-50">
              <Text className="text-center text-xs font-bold text-white">Appareil photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void chooseGallery()} disabled={mediaBusy || busy} className="flex-1 rounded-xl border border-line-strong bg-white px-3 py-3 disabled:opacity-50">
              <Text className="text-center text-xs font-bold text-ink-800">Galerie</Text>
            </TouchableOpacity>
          </View>
          {mediaBusy ? <Text className="mt-2 text-xs text-ink-500">Préparation de la photo…</Text> : null}
        </View>

        <View className="rounded-3xl border border-line-subtle bg-white p-4">
          <Text className="text-sm font-extrabold text-ink-900">2. Localisation</Text>
          <Text className="mt-1 text-xs leading-5 text-ink-500">Autorisez la localisation ponctuelle ou saisissez les coordonnées si vous les connaissez.</Text>
          <TouchableOpacity onPress={() => void useCurrentLocation()} disabled={gettingLocation || busy} className="mt-3 rounded-xl bg-brand-mist px-4 py-3 disabled:opacity-50">
            <Text className="text-center text-xs font-extrabold text-brand-forest">{gettingLocation ? 'Localisation…' : 'Utiliser ma position actuelle'}</Text>
          </TouchableOpacity>
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="text-xs font-bold text-ink-700">Latitude</Text>
              <TextInput value={latitude} onChangeText={setLatitude} keyboardType="decimal-pad" placeholder="14.7167" placeholderTextColor="#8A948C" className={inputClass} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-ink-700">Longitude</Text>
              <TextInput value={longitude} onChangeText={setLongitude} keyboardType="decimal-pad" placeholder="-17.4677" placeholderTextColor="#8A948C" className={inputClass} />
            </View>
          </View>
          <TextInput
            value={locationDescription}
            onChangeText={setLocationDescription}
            maxLength={1000}
            placeholder="Repère, rue ou quartier (facultatif)"
            placeholderTextColor="#8A948C"
            className={inputClass + ' mt-3'}
          />
          {latitude && longitude ? <Text className="mt-2 text-[10px] text-status-success">Position enregistrée dans le signalement.</Text> : null}
        </View>

        <View className="rounded-3xl border border-line-subtle bg-white p-4">
          <Text className="text-sm font-extrabold text-ink-900">3. Description <Text className="font-medium text-ink-400">(facultative)</Text></Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={5000}
            textAlignVertical="top"
            placeholder="Ajoutez une précision utile sur la situation…"
            placeholderTextColor="#8A948C"
            className={inputClass + ' mt-3 min-h-[100px]'}
          />
        </View>

        <View className="rounded-3xl border border-line-subtle bg-white p-4">
          <Text className="text-sm font-extrabold text-ink-900">4. Type de déchets <Text className="font-medium text-ink-400">(facultatif)</Text></Text>
          <Text className="mt-1 text-xs leading-5 text-ink-500">Vous pouvez laisser la qualification à l’équipe chargée du traitement.</Text>
          {wasteTypesError ? <Text className="mt-2 text-xs text-ink-500">{wasteTypesError}</Text> : null}
          <View className="mt-3 flex-row flex-wrap gap-2">
            {wasteTypes.map((item) => {
              const selected = selectedWasteTypeIds.includes(item.idTypeDechet);
              return (
                <TouchableOpacity
                  key={item.idTypeDechet}
                  onPress={() => setSelectedWasteTypeIds((current) =>
                    selected ? current.filter((id) => id !== item.idTypeDechet) : [...current, item.idTypeDechet],
                  )}
                  className={selected ? 'rounded-full bg-brand-forest px-3 py-2.5' : 'rounded-full border border-line-strong bg-white px-3 py-2.5'}
                >
                  <Text className={selected ? 'text-xs font-bold text-white' : 'text-xs font-semibold text-ink-700'}>{item.libelle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {wasteTypes.length ? <Text className="mt-2 text-[10px] text-ink-400">{selectedWasteTypeIds.length} catégorie(s) sélectionnée(s).</Text> : null}
        </View>
      </View>

      {error ? <Text accessibilityRole="alert" className="mt-5 rounded-xl border border-status-danger/20 bg-status-danger/5 p-4 text-sm text-status-danger">{error}</Text> : null}
      <TouchableOpacity
        onPress={() => void handleSubmit()}
        disabled={busy || mediaBusy || gettingLocation || !photo}
        className="mt-7 rounded-2xl bg-brand-forest px-5 py-4 disabled:opacity-50"
      >
        <Text className="text-center font-extrabold text-white">{busy ? 'Envoi du signalement…' : 'Envoyer le signalement'}</Text>
      </TouchableOpacity>
      <Link href="/(citizen)/reports" className="mt-5 text-center text-sm font-semibold text-brand-forest">Annuler</Link>
    </ScrollView>
  );
}
