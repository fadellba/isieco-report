import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from './BrandMark';

interface AuthScreenFrameProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
}

export function AuthScreenFrame({ eyebrow, title, description, children }: AuthScreenFrameProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-between">
            <BrandMark />
            <View className="rounded-full border border-line-subtle bg-white px-3 py-2">
              <Text className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-brand-petrol">Espace sécurisé</Text>
            </View>
          </View>

          <View className="mt-10 overflow-hidden rounded-[28px] bg-brand-forest px-5 py-6">
            <View className="absolute -right-7 -top-8 h-36 w-36 rounded-full border-[22px] border-white/5" />
            <View className="absolute -bottom-14 right-20 h-32 w-32 rounded-full border-[18px] border-brand-lime/10" />
            <Text className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-lime">{eyebrow}</Text>
            <Text accessibilityRole="header" className="mt-3 text-[30px] font-extrabold leading-9 tracking-tight text-white">{title}</Text>
            <Text className="mt-3 text-sm leading-6 text-white/75">{description}</Text>
          </View>

          <View className="mt-5 rounded-3xl border border-line-subtle bg-white p-5" style={{ shadowColor: '#103B31', shadowOpacity: 0.05, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 2 }}>
            {children}
          </View>

          <Text className="mt-6 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-400">
            ISIECO · Propreté urbaine · Du signalement à la résolution
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
