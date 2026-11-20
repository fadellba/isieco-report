import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ApiRequestError } from '@isieco/api-client';
import { useMobileAuth } from '../../../src/features/auth/mobile-auth-context';
import { queueOfflineReport } from '../../../src/features/reports/offline-report-outbox';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  createReportIdempotencyKey,
  listAvailableWasteTypes,
  submitReportWithPhoto,
  type CreateReportPayload,
  type WasteTypeOption,
} from '../../../src/features/reports/reports-api';
import { parseOptionalCoordinate } from '../../../src/features/reports/report-format';
import { FeedbackBanner } from '../../../src/ui/FeedbackBanner';
import {
  captureMobilePhoto,
  pickMobilePhotos,
  requestCurrentForegroundCoordinates,
  type PreparedMobilePhoto,
} from '../../../src/features/media/mobile-media';

export default function NewCitizenReportScreen() {
  const router = useRouter();
  const { profile } = useMobileAuth();
  const [photo, setPhoto] = useState<PreparedMobilePhoto | null>(null);
  const [description, setDescription] = useState('');
  const [wasteTypes, setWasteTypes] = useState<WasteTypeOption[]>([]);
  const [selectedWasteTypeIds, setSelectedWasteTypeIds] = useState<string[]>([]);
  const [locationDescription, setLocationDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [precision, setPrecision] = useState('');
  const [locationSource, setLocationSource] = useState<'current' | 'last-known' | null>(null);
  const [wasteTypesUnavailable, setWasteTypesUnavailable] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  // Load optional waste categories. GPS remains opt-in.
  useEffect(() => {
    let active = true;
    listAvailableWasteTypes()
      .then((items) => {
        if (active) {
          setWasteTypes(items);
          setWasteTypesUnavailable(items.length === 0);
        }
      })
      .catch(() => {
        if (active) setWasteTypesUnavailable(true);
      });

    // GPS permission is requested only from the explicit location button.

    return () => {
      active = false;
    };
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

  async function refreshLocation() {
    setGettingLocation(true);
    setError(null);
    try {
      const coordinates = await requestCurrentForegroundCoordinates();
      setLocationSource(coordinates.source);
      setLatitude(coordinates.latitude.toFixed(6));
      setLongitude(coordinates.longitude.toFixed(6));
      setPrecision(
        coordinates.precisionLocalisation === undefined
          ? ''
          : String(coordinates.precisionLocalisation),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Position GPS indisponible pour le moment.',
      );
    } finally {
      setGettingLocation(false);
    }
  }

  async function handleSubmit() {
    if (busy || mediaBusy || gettingLocation) return;
    setError(null);

    // Mandatory photo check as required by user
    if (!photo) {
      setError('La photo du dépôt est obligatoire pour enregistrer votre signalement.');
      return;
    }

    try {
      const lat = parseOptionalCoordinate(latitude, -90, 90);
      const lon = parseOptionalCoordinate(longitude, -180, 180);
      const precisionNumber = precision.trim()
        ? Number(precision.trim().replace(',', '.'))
        : undefined;

      if ((lat === undefined) !== (lon === undefined)) {
        throw new Error(
          'Renseignez la latitude et la longitude ensemble, ou laissez les deux vides.',
        );
      }

      const payload: CreateReportPayload = {
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(selectedWasteTypeIds.length
          ? { contenus: selectedWasteTypeIds.map((idTypeDechet) => ({ idTypeDechet })) }
          : {}),
        ...(locationDescription.trim()
          ? { descriptionLocalisation: locationDescription.trim() }
          : {}),
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
      const idempotencyKey = idempotencyRef.current.key;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      try {
        const result = await submitReportWithPhoto(
          payload,
          idempotencyKey,
          photo,
          controller.signal,
        );
        idempotencyRef.current = null;
        router.replace({
          pathname: '/(citizen)/reports/[id]',
          params: { id: result.idSignalement },
        });
      } catch (submissionError) {
        const networkFailure =
          submissionError instanceof TypeError ||
          submissionError instanceof ApiRequestError &&
            (submissionError.status === 408 ||
              submissionError.status === 429 ||
              submissionError.status >= 500) ||
          typeof submissionError === 'object' &&
            submissionError !== null &&
            'name' in submissionError &&
            (submissionError.name === 'AbortError' || submissionError.name === 'NetworkError');

        if (!networkFailure) throw submissionError;
        if (!profile?.utilisateurId) {
          throw new Error('Votre profil doit être chargé avant de conserver un signalement hors ligne.');
        }

        await queueOfflineReport({
          ownerId: profile.utilisateurId,
          idempotencyKey,
          payload,
          photo,
        });
        idempotencyRef.current = null;
        router.replace('/(citizen)/home');
      } finally {
        clearTimeout(timeout);
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Impossible d’enregistrer le signalement.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-[#F8FAF9]"
    >
      {/* Top Header bar */}
      <View className="flex-row items-center justify-between border-b border-line-subtle bg-white px-5 pb-3.5 pt-12">
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(citizen)/home'))}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-base"
        >
          <Text className="text-base font-bold text-ink-700">←</Text>
        </TouchableOpacity>
        <Text className="text-base font-extrabold text-ink-900">Nouveau signalement</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(citizen)/home')}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-base"
        >
          <Text className="text-sm font-bold text-ink-500">✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. PHOTO DU DÉPÔT (OBLIGATOIRE) */}
        <View className="rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-ink-900">1. Photo du dépôt</Text>
            <View className="rounded-full bg-emerald-50 px-2.5 py-1">
              <Text className="text-[10px] font-extrabold uppercase text-emerald-800">
                Obligatoire
              </Text>
            </View>
          </View>

          {photo ? (
            <View className="mt-4">
              <View className="relative overflow-hidden rounded-2xl border border-line-subtle">
                <Image
                  source={{ uri: photo.uri }}
                  resizeMode="cover"
                  style={{ width: '100%', height: 220 }}
                />
                <TouchableOpacity
                  onPress={() => setPhoto(null)}
                  className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-ink-900/70"
                >
                  <Text className="text-xs font-bold text-white">✕</Text>
                </TouchableOpacity>
              </View>
              <View className="mt-3 flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <View className="h-2 w-2 rounded-full bg-emerald-600" />
                  <Text className="text-xs font-semibold text-emerald-800">Photo enregistrée</Text>
                </View>
                <TouchableOpacity
                  onPress={() => void takePhoto()}
                  disabled={mediaBusy || busy}
                  className="rounded-full border border-line-strong bg-white px-3 py-1.5"
                >
                  <Text className="text-xs font-bold text-ink-700">Changer la photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="mt-4">
              <View className="min-h-[160px] items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-6 text-center">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <Text className="text-2xl">📷</Text>
                </View>
                <Text className="mt-3 text-sm font-extrabold text-ink-900">
                  Photographiez le dépôt
                </Text>
                <Text className="mt-1 text-center text-xs leading-5 text-ink-500">
                  Prenez une photo claire pour que nos équipes puissent intervenir rapidement.
                </Text>
              </View>

              <View className="mt-3.5 flex-row gap-2.5">
                <TouchableOpacity
                  onPress={() => void takePhoto()}
                  disabled={mediaBusy || busy}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-brand-forest py-3.5 shadow-sm disabled:opacity-50"
                >
                  <Text className="text-sm">📷</Text>
                  <Text className="text-xs font-extrabold text-white">Prendre une photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void chooseGallery()}
                  disabled={mediaBusy || busy}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-line-strong bg-white py-3.5 disabled:opacity-50"
                >
                  <Text className="text-sm">🖼️</Text>
                  <Text className="text-xs font-extrabold text-ink-800">Galerie</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mediaBusy && (
            <View className="mt-3 flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#174C3D" />
              <Text className="text-xs text-ink-500">Préparation de l’image...</Text>
            </View>
          )}
        </View>

        {/* 2. LOCALISATION */}
        <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-ink-900">2. Localisation</Text>
            {latitude && longitude ? (
              <View className="rounded-full bg-emerald-50 px-2.5 py-1">
                <Text className="text-[10px] font-extrabold text-emerald-800">
                  📍 Position détectée
                </Text>
              </View>
            ) : (
              <Text className="text-[10px] font-bold uppercase text-ink-400">Au choix</Text>
            )}
          </View>

          {latitude && longitude ? (
            <View className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5">
              <View className="flex-row items-center justify-between">
                <View className="min-w-0 flex-1 pr-2">
                  <Text className="text-xs font-bold text-emerald-950">
                    {locationSource === 'last-known'
                      ? 'Dernière position GPS récente utilisée'
                      : 'Coordonnées GPS enregistrées'}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-emerald-800">
                    {latitude}, {longitude}{' '}
                    {precision ? `(±${Math.round(Number(precision))}m)` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => void refreshLocation()}
                  disabled={gettingLocation || busy}
                  className="rounded-lg bg-white px-2.5 py-1.5 border border-emerald-200"
                >
                  <Text className="text-[10px] font-bold text-emerald-900">
                    {gettingLocation ? '...' : 'Actualiser'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => void refreshLocation()}
              disabled={gettingLocation || busy}
              className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 py-3 disabled:opacity-50"
            >
              {gettingLocation ? (
                <ActivityIndicator size="small" color="#174C3D" />
              ) : (
                <Text className="text-xs font-bold text-brand-forest">
                  📍 Détecter ma position GPS
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TextInput
            value={locationDescription}
            onChangeText={setLocationDescription}
            maxLength={1000}
            placeholder="Précision d'adresse, n° de rue ou repère visuel..."
            placeholderTextColor="#94A3B8"
            className="mt-3 rounded-xl border border-line-strong bg-white px-4 py-3 text-sm text-ink-900"
          />
        </View>

        {/* 3. DESCRIPTION (FACULTATIF) */}
        <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-ink-900">3. Description</Text>
            <Text className="text-[10px] font-bold uppercase text-ink-400">Facultatif</Text>
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={5000}
            textAlignVertical="top"
            placeholder="Décrivez brièvement le problème (ex: matelas et décombres abandonnés sur le trottoir)..."
            placeholderTextColor="#94A3B8"
            className="mt-3 min-h-[90px] rounded-xl border border-line-strong bg-white px-4 py-3 text-sm text-ink-900"
          />
        </View>

        {/* 4. TYPE DE DÉCHETS (FACULTATIF) */}
        <View className="mt-4 rounded-3xl border border-line-subtle bg-white p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-ink-900">4. Type de déchets</Text>
            <Text className="text-[10px] font-bold uppercase text-ink-400">Facultatif</Text>
          </View>
          <Text className="mt-1 text-xs text-ink-500">
            Sélectionnez les catégories si vous les identifiez.
          </Text>

          <View className="mt-3 flex-row flex-wrap gap-2">
            {wasteTypesUnavailable ? (
              <Text className="text-xs leading-5 text-amber-800">
                Les catégories ne sont pas disponibles pour le moment. Vous pouvez envoyer le signalement sans en sélectionner.
              </Text>
            ) : null}
            {wasteTypes.map((item) => {
              const selected = selectedWasteTypeIds.includes(item.idTypeDechet);
              return (
                <TouchableOpacity
                  key={item.idTypeDechet}
                  onPress={() =>
                    setSelectedWasteTypeIds((current) =>
                      selected
                        ? current.filter((id) => id !== item.idTypeDechet)
                        : [...current, item.idTypeDechet],
                    )
                  }
                  className={`rounded-full px-3.5 py-2 transition-all ${
                    selected ? 'bg-brand-forest shadow-sm' : 'border border-line-strong bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      selected ? 'font-bold text-white' : 'text-ink-700'
                    }`}
                  >
                    {item.libelle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Errors banner */}
        {error && (
          <View className="mt-4">
            <FeedbackBanner tone="error" message={error} />
          </View>
        )}

        {/* Submit button */}
        <TouchableOpacity
          onPress={() => void handleSubmit()}
          disabled={busy || mediaBusy || gettingLocation}
          className={`mt-6 flex-row items-center justify-center gap-2 rounded-2xl py-4 shadow-sm ${
            !photo ? 'bg-brand-forest/60' : 'bg-brand-forest'
          } disabled:opacity-50`}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text className="text-center font-extrabold text-white text-base">
                {photo ? 'Envoyer le signalement' : 'Prendre une photo pour envoyer'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(citizen)/home')} className="mt-4 py-2">
          <Text className="text-center text-xs font-bold text-ink-500">Annuler</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
