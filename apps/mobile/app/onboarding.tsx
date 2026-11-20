import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from '../src/ui/BrandMark';

const ONBOARDING_KEY = 'isieco.onboarding.v2.complete';

const onboardingSlides = [
  {
    icon: '📸',
    title: 'Signalez les dépôts sauvages autour de vous',
    subtitle:
      'En quelques secondes, photographiez un problème et ajoutez sa localisation si vous le souhaitez.',
  },
  {
    icon: '📍',
    title: 'Localisation à votre demande',
    subtitle:
      'Votre position est demandée uniquement lorsque vous appuyez sur « Détecter ma position ». Vous pouvez aussi décrire le lieu manuellement.',
  },
  {
    icon: '🚚',
    title: 'Suivi transparent des interventions',
    subtitle:
      'Suivez la prise en charge, le passage des agents et la résolution finale sur un suivi clair.',
  },
  {
    icon: '🌱',
    title: 'Ensemble pour une ville durable',
    subtitle:
      'Une chaîne opérationnelle citoyenne et professionnelle pour un cadre de vie sain et préservé.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  async function handleFinish() {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Continue anyway
    }
    router.replace('/sign-in');
  }

  function handleNext() {
    if (index < onboardingSlides.length - 1) {
      setIndex(index + 1);
    } else {
      void handleFinish();
    }
  }

  const current = onboardingSlides[index] ?? onboardingSlides[0]!;

  return (
    <SafeAreaView className="flex-1 bg-white justify-between px-6 py-6">
      {/* Header */}
      <View className="flex-row items-center justify-between pt-2">
        <BrandMark compact size="sm" />
        <Pressable onPress={() => void handleFinish()} hitSlop={10}>
          <Text className="text-xs font-bold text-slate-400">Passer</Text>
        </Pressable>
      </View>

      {/* Hero Visual Card matching Screen 2 */}
      <View className="my-auto items-center">
        <View className="w-full aspect-[4/3] bg-emerald-50 rounded-3xl border border-emerald-100 items-center justify-center p-8 relative overflow-hidden shadow-sm">
          {/* Decorative background circles */}
          <View className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-emerald-100/60" />
          <View className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-emerald-200/40" />

          {/* Center Phone Camera Framing Illustration */}
          <View className="w-28 h-44 rounded-2xl bg-white border-2 border-emerald-500 shadow-xl items-center justify-center p-3 relative">
            <View className="w-8 h-1 bg-slate-200 rounded-full mb-auto" />
            <View className="w-14 h-14 rounded-xl bg-emerald-100/70 border border-emerald-300 items-center justify-center">
              <Text style={{ fontSize: 26 }}>{current.icon}</Text>
            </View>
            <View className="w-6 h-6 rounded-full border border-emerald-500 mt-auto items-center justify-center">
              <View className="w-3 h-3 rounded-full bg-emerald-500" />
            </View>
          </View>
        </View>

        {/* Copy */}
        <View className="mt-8 items-center px-4">
          <Text className="text-2xl font-black text-slate-900 text-center tracking-tight leading-tight">
            {current.title}
          </Text>
          <Text className="mt-3 text-sm text-slate-500 text-center leading-relaxed">
            {current.subtitle}
          </Text>
        </View>

        {/* 4 Pagination Dots matching mockup */}
        <View className="flex-row items-center gap-2 mt-8">
          {onboardingSlides.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-6 bg-emerald-600' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </View>
      </View>

      {/* Bottom Actions */}
      <View className="w-full pb-4">
        <Pressable
          onPress={handleNext}
          className="w-full h-14 bg-emerald-600 active:bg-emerald-700 rounded-2xl items-center justify-center shadow-lg shadow-emerald-950/20"
        >
          <Text className="text-white font-extrabold text-base">
            {index === onboardingSlides.length - 1 ? 'Commencer' : 'Suivant'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
