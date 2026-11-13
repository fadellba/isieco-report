import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { BrandMark } from '../src/ui/BrandMark';

const slides = [
  {
    eyebrow: 'Une ville plus propre, ensemble',
    title: 'Chaque signalement peut déclencher une action.',
    body: 'ISIECO relie les citoyens qui signalent un problème aux équipes chargées de le traiter.',
    glyph: '⌖',
  },
  {
    eyebrow: 'Du terrain au bon service',
    title: 'Des informations utiles, sans parcours complexe.',
    body: 'Une photo et une localisation aident à décrire un dépôt. Les équipes disposent des informations nécessaires pour organiser leur intervention.',
    glyph: '＋',
  },
  {
    eyebrow: 'Un suivi adapté à votre rôle',
    title: 'Chaque profil a son espace de travail.',
    body: 'Les citoyens retrouvent leurs signalements. Les agents consultent leurs missions, interviennent et transmettent leur compte rendu.',
    glyph: '↗',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const current = slides[step];

  async function finish() {
    setBusy(true);
    try {
      await AsyncStorage.setItem('isieco.onboarding.v1.complete', 'true');
    } catch {
      // Keep onboarding non-blocking if local persistence is temporarily unavailable.
    } finally {
      setBusy(false);
      router.replace('/sign-in');
    }
  }

  if (!current) return null;

  return (
    <View className="flex-1 justify-between bg-surface-base px-6 pb-10 pt-16">
      <View className="flex-row items-center justify-between">
        <BrandMark />
        <Text className="text-xs font-bold text-ink-400">{step + 1} / {slides.length}</Text>
      </View>
      <View className="items-start">
        <View className="h-28 w-28 items-center justify-center rounded-[34px] bg-brand-mist">
          <Text className="text-6xl font-light text-brand-forest">{current.glyph}</Text>
        </View>
        <Text className="mt-9 text-xs font-bold uppercase tracking-[0.16em] text-brand-forest">{current.eyebrow}</Text>
        <Text className="mt-3 text-[34px] font-extrabold leading-[40px] tracking-tight text-ink-900">{current.title}</Text>
        <Text className="mt-4 text-base leading-7 text-ink-500">{current.body}</Text>
        <View className="mt-8 flex-row gap-2">
          {slides.map((slide, index) => (
            <View key={slide.title} className={index === step ? 'h-2 w-8 rounded-full bg-brand-forest' : 'h-2 w-2 rounded-full bg-line-strong'} />
          ))}
        </View>
      </View>
      <View>
        <TouchableOpacity
          disabled={busy}
          onPress={() => step < slides.length - 1 ? setStep((currentStep) => currentStep + 1) : void finish()}
          className="rounded-2xl bg-brand-forest px-5 py-4 disabled:opacity-50"
        >
          <Text className="text-center text-sm font-extrabold text-white">{step < slides.length - 1 ? 'Continuer' : busy ? 'Préparation…' : 'Commencer'}</Text>
        </TouchableOpacity>
        {step < slides.length - 1 ? (
          <TouchableOpacity onPress={() => void finish()} className="mt-4 py-2">
            <Text className="text-center text-xs font-semibold text-ink-500">Passer l’introduction</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
