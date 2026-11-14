import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from '../src/ui/BrandMark';

const ONBOARDING_KEY = 'isieco.onboarding.v2.complete';

type VisualKind = 'territory' | 'workflow' | 'field';

const slides: Array<{
  eyebrow: string;
  title: string;
  body: string;
  visual: VisualKind;
}> = [
  {
    eyebrow: 'Une action collective',
    title: 'La propreté urbaine commence par un signalement utile.',
    body: 'ISIECO relie les citoyens, les équipes de terrain et les services qui organisent le traitement des dépôts sauvages.',
    visual: 'territory',
  },
  {
    eyebrow: 'Du signalement au traitement',
    title: 'Chaque dépôt suit un parcours clair.',
    body: 'Décrivez le lieu et la situation. Une photo peut aider, mais elle n’est pas obligatoire. Le signalement est ensuite qualifié et orienté vers le bon traitement.',
    visual: 'workflow',
  },
  {
    eyebrow: 'De l’affectation à la vérification',
    title: 'Les interventions sont suivies jusqu’à leur validation.',
    body: 'Les agents acceptent une mission, interviennent et transmettent leur compte rendu. Une vérification indépendante valide la clôture ou demande une reprise.',
    visual: 'field',
  },
];

function TerritoryVisual() {
  return (
    <View style={styles.territory}>
      <View style={styles.territoryRoadHorizontal} />
      <View style={styles.territoryRoadVertical} />
      <View style={styles.territoryRoadDiagonal} />
      <View style={[styles.territoryBlock, styles.territoryBlockOne]} />
      <View style={[styles.territoryBlock, styles.territoryBlockTwo]} />
      <View style={[styles.territoryBlock, styles.territoryBlockThree]} />
      <View style={styles.territoryMarkerOuter}>
        <View style={styles.territoryMarkerInner} />
      </View>
      <View style={styles.territoryTag}>
        <Text style={styles.territoryTagEyebrow}>POINT LOCALISÉ</Text>
        <Text style={styles.territoryTagTitle}>Dépôt à signaler</Text>
        <Text style={styles.territoryTagBody}>Lieu · description · suivi</Text>
      </View>
      <View style={styles.territoryCaption}>
        <View style={styles.captionDot} />
        <Text style={styles.territoryCaptionText}>LE TERRITOIRE, AU CŒUR DE L’ACTION</Text>
      </View>
    </View>
  );
}

function WorkflowVisual() {
  const items = [
    { number: '01', label: 'Signalé', detail: 'Par un citoyen' },
    { number: '02', label: 'Qualifié', detail: 'Par le service' },
    { number: '03', label: 'Affecté', detail: 'À une équipe' },
  ];

  return (
    <View style={styles.workflow}>
      <Text style={styles.visualEyebrow}>LE PARCOURS D’UN SIGNALEMENT</Text>
      <View style={styles.workflowLine} />
      <View style={styles.workflowItems}>
        {items.map((item, index) => (
          <View key={item.number} style={styles.workflowItem}>
            <View style={[styles.workflowNode, index === 0 ? styles.workflowNodeActive : null]}>
              <Text style={[styles.workflowNodeNumber, index === 0 ? styles.workflowNodeNumberActive : null]}>
                {item.number}
              </Text>
            </View>
            <Text style={styles.workflowLabel}>{item.label}</Text>
            <Text style={styles.workflowDetail}>{item.detail}</Text>
          </View>
        ))}
      </View>
      <View style={styles.workflowNote}>
        <Text style={styles.workflowNoteText}>Vous gardez une trace de l’évolution du signalement.</Text>
      </View>
    </View>
  );
}

function FieldVisual() {
  const steps = [
    { label: 'Mission acceptée', detail: 'L’affectation est prise en charge.' },
    { label: 'Intervention documentée', detail: 'Le résultat est transmis au service.' },
    { label: 'Vérification indépendante', detail: 'Clôture ou demande de reprise.' },
  ];

  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <View>
          <Text style={styles.fieldEyebrow}>ESPACE AGENT</Text>
          <Text style={styles.fieldTitle}>Suivi d’intervention</Text>
        </View>
        <View style={styles.fieldStatus}>
          <View style={styles.fieldStatusDot} />
          <Text style={styles.fieldStatusText}>EN COURS</Text>
        </View>
      </View>
      <View style={styles.fieldDivider} />
      {steps.map((step, index) => (
        <View key={step.label} style={styles.fieldStep}>
          <View style={[styles.fieldStepNumber, index === 0 ? styles.fieldStepNumberActive : null]}>
            <Text style={[styles.fieldStepNumberText, index === 0 ? styles.fieldStepNumberTextActive : null]}>
              {String(index + 1).padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.fieldStepCopy}>
            <Text style={styles.fieldStepTitle}>{step.label}</Text>
            <Text style={styles.fieldStepDetail}>{step.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function OnboardingVisual({ kind }: { kind: VisualKind }) {
  if (kind === 'territory') return <TerritoryVisual />;
  if (kind === 'workflow') return <WorkflowVisual />;
  return <FieldVisual />;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const current = slides[step];

  async function finish() {
    if (busy) return;
    setBusy(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {
      // Onboarding must remain accessible even if local persistence is unavailable.
    } finally {
      setBusy(false);
      router.replace('/sign-in');
    }
  }

  if (!current) return null;

  const lastStep = step === slides.length - 1;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BrandMark />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Passer la présentation"
          disabled={busy || lastStep}
          onPress={() => void finish()}
          style={({ pressed }) => [styles.skipButton, pressed ? styles.pressed : null, lastStep ? styles.hidden : null]}
        >
          <Text style={styles.skipText}>Passer</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>DÉCOUVRIR ISIECO</Text>
          <Text style={styles.progressCount}>{String(step + 1).padStart(2, '0')} / 03</Text>
        </View>

        <View style={styles.visualWrap}>
          <OnboardingVisual kind={current.visual} />
        </View>

        <Text style={styles.eyebrow}>{current.eyebrow}</Text>
        <Text accessibilityRole="header" style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        {lastStep ? (
          <View style={styles.accountNote}>
            <Text style={styles.accountNoteTitle}>Votre accès à ISIECO</Text>
            <Text style={styles.accountNoteBody}>
              Les citoyens peuvent créer un compte dans l’application. Les agents utilisent les identifiants fournis par leur organisation.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination} accessibilityLabel={'Étape ' + (step + 1) + ' sur ' + slides.length}>
          {slides.map((slide, index) => (
            <View
              key={slide.eyebrow}
              style={[styles.paginationDot, index === step ? styles.paginationDotActive : null]}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={lastStep ? 'Accéder à la connexion' : 'Continuer vers l’étape suivante'}
          disabled={busy}
          onPress={() => lastStep ? void finish() : setStep((currentStep) => currentStep + 1)}
          style={({ pressed }) => [styles.primaryButton, pressed ? styles.primaryButtonPressed : null, busy ? styles.disabled : null]}
        >
          <Text style={styles.primaryButtonText}>{busy ? 'Préparation…' : lastStep ? 'Se connecter' : 'Continuer'}</Text>
          <Text style={styles.primaryButtonArrow}>›</Text>
        </Pressable>
        <Text style={styles.footerHint}>SIGNALER · INTERVENIR · SUIVRE</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = {
  screen: { flex: 1, backgroundColor: '#F6F7F2' },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  skipButton: { paddingHorizontal: 10, paddingVertical: 9 },
  skipText: { color: '#63756B', fontSize: 13, fontWeight: '700' as const },
  hidden: { opacity: 0 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 18 },
  progressHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 12,
  },
  progressLabel: { color: '#2F7773', fontSize: 10, fontWeight: '800' as const, letterSpacing: 1.4 },
  progressCount: { color: '#849188', fontSize: 11, fontWeight: '800' as const, letterSpacing: 1 },
  visualWrap: { marginBottom: 24 },
  eyebrow: { color: '#2F7773', fontSize: 10, lineHeight: 16, fontWeight: '800' as const, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  title: { marginTop: 9, color: '#192820', fontSize: 30, lineHeight: 36, fontWeight: '850' as const, letterSpacing: -0.8 },
  body: { marginTop: 12, color: '#637269', fontSize: 15, lineHeight: 24, fontWeight: '400' as const },
  accountNote: { marginTop: 18, padding: 15, borderRadius: 15, backgroundColor: '#E8F0E7', borderWidth: 1, borderColor: '#DCE8DC' },
  accountNoteTitle: { color: '#174C3D', fontSize: 12, fontWeight: '800' as const },
  accountNoteBody: { marginTop: 5, color: '#52675C', fontSize: 12, lineHeight: 19 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  pagination: { flexDirection: 'row' as const, justifyContent: 'center' as const, alignItems: 'center' as const, gap: 7, marginBottom: 15 },
  paginationDot: { width: 7, height: 7, borderRadius: 8, backgroundColor: '#C9D5C9' },
  paginationDotActive: { width: 25, backgroundColor: '#174C3D' },
  primaryButton: {
    minHeight: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 17,
    backgroundColor: '#174C3D',
    shadowColor: '#103B31',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  primaryButtonPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' as const },
  primaryButtonArrow: { position: 'absolute' as const, right: 20, top: 10, color: '#D7E6A5', fontSize: 28, lineHeight: 34, fontWeight: '400' as const },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
  footerHint: { marginTop: 13, textAlign: 'center' as const, color: '#8A968D', fontSize: 9, fontWeight: '800' as const, letterSpacing: 1.4 },
  territory: { height: 214, overflow: 'hidden' as const, borderRadius: 24, backgroundColor: '#E8F0E7', position: 'relative' as const },
  territoryRoadHorizontal: { position: 'absolute' as const, left: -20, right: -20, top: 96, height: 25, backgroundColor: '#FFFFFF', transform: [{ rotate: '-9deg' }] },
  territoryRoadVertical: { position: 'absolute' as const, top: -30, bottom: -20, left: '57%' as const, width: 22, backgroundColor: '#FFFFFF', transform: [{ rotate: '18deg' }] },
  territoryRoadDiagonal: { position: 'absolute' as const, left: -10, right: -20, top: 36, height: 12, backgroundColor: '#D3E2D2', transform: [{ rotate: '22deg' }] },
  territoryBlock: { position: 'absolute' as const, borderRadius: 9, backgroundColor: '#D5E4D3' },
  territoryBlockOne: { width: 62, height: 40, top: 22, left: 25 },
  territoryBlockTwo: { width: 48, height: 45, top: 142, right: 34 },
  territoryBlockThree: { width: 58, height: 34, top: 20, right: 32 },
  territoryMarkerOuter: {
    position: 'absolute' as const,
    top: 54,
    left: '47%' as const,
    width: 44,
    height: 44,
    borderRadius: 24,
    backgroundColor: '#174C3D',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    shadowColor: '#103B31',
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 3,
  },
  territoryMarkerInner: { width: 10, height: 10, borderRadius: 8, backgroundColor: '#D7E6A5' },
  territoryTag: {
    position: 'absolute' as const,
    left: 18,
    bottom: 18,
    minWidth: 190,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#103B31',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  territoryTagEyebrow: { color: '#2F7773', fontSize: 8, fontWeight: '800' as const, letterSpacing: 1.1 },
  territoryTagTitle: { marginTop: 3, color: '#192820', fontSize: 12, fontWeight: '800' as const },
  territoryTagBody: { marginTop: 2, color: '#718078', fontSize: 9, fontWeight: '600' as const },
  territoryCaption: { position: 'absolute' as const, top: 16, right: 15, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  captionDot: { width: 6, height: 6, borderRadius: 5, backgroundColor: '#2F7773' },
  territoryCaptionText: { color: '#52675C', fontSize: 7, fontWeight: '800' as const, letterSpacing: 0.7 },
  workflow: { height: 214, justifyContent: 'center' as const, overflow: 'hidden' as const, borderRadius: 24, paddingHorizontal: 18, backgroundColor: '#123F36' },
  visualEyebrow: { color: '#D7E6A5', fontSize: 9, fontWeight: '800' as const, letterSpacing: 1.2 },
  workflowLine: { position: 'absolute' as const, left: '18%' as const, right: '18%' as const, top: 105, height: 2, backgroundColor: '#527C6E' },
  workflowItems: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, justifyContent: 'space-between' as const, marginTop: 25 },
  workflowItem: { width: '31%' as const, alignItems: 'center' as const },
  workflowNode: { width: 49, height: 49, borderRadius: 25, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: '#285D50', borderWidth: 1, borderColor: '#5B8977' },
  workflowNodeActive: { backgroundColor: '#D7E6A5', borderColor: '#D7E6A5' },
  workflowNodeNumber: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' as const },
  workflowNodeNumberActive: { color: '#174C3D' },
  workflowLabel: { marginTop: 12, color: '#FFFFFF', fontSize: 11, fontWeight: '800' as const },
  workflowDetail: { marginTop: 4, color: '#B8CFC1', fontSize: 9, textAlign: 'center' as const },
  workflowNote: { marginTop: 23, borderTopWidth: 1, borderTopColor: '#315D50', paddingTop: 10 },
  workflowNoteText: { color: '#DDE9DE', fontSize: 10, textAlign: 'center' as const, fontWeight: '600' as const },
  field: { height: 214, justifyContent: 'center' as const, paddingHorizontal: 18, borderRadius: 24, backgroundColor: '#E8F0E7' },
  fieldHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 12 },
  fieldEyebrow: { color: '#2F7773', fontSize: 8, fontWeight: '800' as const, letterSpacing: 1.3 },
  fieldTitle: { marginTop: 4, color: '#192820', fontSize: 15, fontWeight: '850' as const },
  fieldStatus: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFFFFF' },
  fieldStatusDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#A8671A' },
  fieldStatusText: { color: '#A8671A', fontSize: 7, fontWeight: '800' as const, letterSpacing: 0.6 },
  fieldDivider: { height: 1, backgroundColor: '#D4E1D3', marginBottom: 5 },
  fieldStep: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 11, paddingVertical: 9 },
  fieldStepNumber: { width: 30, height: 30, borderRadius: 10, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: '#FFFFFF' },
  fieldStepNumberActive: { backgroundColor: '#174C3D' },
  fieldStepNumberText: { color: '#63756B', fontSize: 9, fontWeight: '800' as const },
  fieldStepNumberTextActive: { color: '#FFFFFF' },
  fieldStepCopy: { flex: 1 },
  fieldStepTitle: { color: '#24342B', fontSize: 11, fontWeight: '800' as const },
  fieldStepDetail: { marginTop: 2, color: '#68776E', fontSize: 9, lineHeight: 13 },
};