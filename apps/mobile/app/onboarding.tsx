import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { BrandMark } from '../src/ui/BrandMark';

const slides = [
  {
    eyebrow: 'Ensemble, plus propres',
    title: 'Votre quartier mérite mieux.',
    body: 'Repérez un dépôt ou un problème de propreté et signalez-le directement depuis votre téléphone.',
    glyph: '⌖',
  },
  {
    eyebrow: 'Simple et utile',
    title: 'Une photo suffit pour commencer.',
    body: 'Ajoutez une photo, vérifiez le lieu et envoyez votre signalement. La description et le type de déchets restent facultatifs.',
    glyph: '＋',
  },
  {
    eyebrow: 'Un suivi transparent',
    title: 'Suivez les actions jusqu’à la résolution.',
    body: 'Retrouvez vos signalements et consultez les étapes de leur traitement depuis votre espace personnel.',
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
      router.replace('/sign-in');
    } finally {
      setBusy(false);
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
