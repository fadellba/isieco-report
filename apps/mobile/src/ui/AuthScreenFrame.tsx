import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from './BrandMark';

interface AuthScreenFrameProps extends PropsWithChildren {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function AuthScreenFrame({ title, description, children }: AuthScreenFrameProps) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand Logo Centered */}
          <View className="items-center mb-8">
            <BrandMark size="lg" />
          </View>

          {/* Clean Elevated White Card */}
          <View className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-sm">
            <View className="mb-6">
              <Text
                accessibilityRole="header"
                className="text-2xl font-black text-slate-900 tracking-tight"
              >
                {title}
              </Text>
              {description ? (
                <Text className="mt-1.5 text-xs text-slate-500 leading-relaxed">{description}</Text>
              ) : null}
            </View>

            {children}
          </View>

          <Text className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            ISIECO · Ensemble pour une ville plus propre
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
