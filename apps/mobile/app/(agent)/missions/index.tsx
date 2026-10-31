import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  getAgentProfile,
  listMyTeams,
  listTeamAssignments,
  listTeamInterventions,
  respondToAssignment,
  startIntervention,
  submitIntervention,
  type AgentTeam,
  type MobileAgentProfile,
  type TeamAssignment,
  type TeamIntervention,
} from '../../../src/features/interventions/agent-api';
import { dateLabel } from '../../../src/features/reports/report-format';

const inputClass = 'mt-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900';
const buttonClass = 'rounded-xl bg-eco-700 px-4 py-3 disabled:opacity-50';
const secondaryClass = 'rounded-xl border border-slate-200 bg-white px-4 py-3 disabled:opacity-50';

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Une erreur inattendue est survenue.';
}

export default function AgentMissionsScreen() {
  const [profile, setProfile] = useState<MobileAgentProfile | null>(null);
  const [teams, setTeams] = useState<AgentTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [interventions, setInterventions] = useState<TeamIntervention[]>([]);
  const [refusalReasons, setRefusalReasons] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [reports, setReports] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, 'TERMINEE' | 'PARTIELLE' | 'IMPOSSIBLE'>>({});
  const [exceptions, setExceptions] = useState<Record<string, string>>({});
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const latestByAssignment = useMemo(() => {
    const map = new Map<string, TeamIntervention>();
    for (const intervention of interventions) {
      const id = intervention.idAffectation;
      const current = map.get(id);
      if (!current || new Date(intervention.dateHeureDebut ?? 0).getTime() > new Date(current.dateHeureDebut ?? 0).getTime()) {
        map.set(id, intervention);
      }
    }
    return map;
  }, [interventions]);

  const loadTeams = useCallback(async () => {
    setLoadingTeams(true);
    setError(null);
    try {
      const [agent, myTeams] = await Promise.all([getAgentProfile(), listMyTeams()]);
      if (!agent.roles.some((role) => role.code === 'AGENT_TERRAIN')) {
        throw new Error('Le rôle AGENT_TERRAIN est requis pour accéder à cet espace.');
      }
      setProfile(agent);
      setTeams(myTeams);
      setSelectedTeamId((current) => myTeams.some((team) => team.idEquipe === current) ? current : myTeams[0]?.idEquipe ?? '');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const loadMissions = useCallback(async () => {
    if (!selectedTeamId) {
      setAssignments([]);
      setInterventions([]);
      return;
    }
    setLoadingMissions(true);
    setError(null);
    try {
      const [teamAssignments, teamInterventions] = await Promise.all([
        listTeamAssignments(selectedTeamId),
        listTeamInterventions(selectedTeamId),
      ]);
      setAssignments(teamAssignments);
      setInterventions(teamInterventions);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoadingMissions(false);
    }
  }, [selectedTeamId]);

  useFocusEffect(useCallback(() => { void loadTeams(); }, [loadTeams]));
  useEffect(() => { void loadMissions(); }, [loadMissions]);

  async function refresh(message?: string) {
    if (message) setNotice(message);
    await loadMissions();
  }

  async function respond(assignment: TeamAssignment, decision: 'ACCEPTEE' | 'REFUSEE') {
    const reason = refusalReasons[assignment.idAffectation]?.trim() ?? '';
    if (decision === 'REFUSEE' && reason.length < 5) {
      setError('Un motif d’au moins 5 caractères est obligatoire pour refuser une mission.');
      return;
    }
    setBusyKey(assignment.idAffectation);
    setError(null);
    setNotice(null);
    try {
      await respondToAssignment(
        assignment.idAffectation,
        decision,
        decision === 'REFUSEE' ? reason : undefined,
        observations[assignment.idAffectation]?.trim() || undefined,
      );
      await refresh(decision === 'ACCEPTEE' ? 'Mission acceptée.' : 'Mission refusée avec motif.');
    } catch (reason) {
      const message = errorMessage(reason);
      await loadMissions();
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  async function start(assignment: TeamAssignment) {
    setBusyKey(assignment.idAffectation);
    setError(null);
    setNotice(null);
    try {
      await startIntervention(assignment.idAffectation);
      await refresh('Intervention démarrée. Vous pouvez renseigner le compte rendu depuis cette page.');
    } catch (reason) {
      const message = errorMessage(reason);
      await loadMissions();
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  async function submit(intervention: TeamIntervention) {
    const id = intervention.idIntervention;
    const compteRendu = reports[id]?.trim() ?? '';
    const result = results[id] ?? 'TERMINEE';
    const motifException = exceptions[id]?.trim() ?? '';
    if (compteRendu.length < 20) {
      setError('Le compte rendu doit contenir au moins 20 caractères.');
      return;
    }
    if (result !== 'TERMINEE' && motifException.length < 5) {
      setError('Un motif d’exception d’au moins 5 caractères est obligatoire.');
      return;
    }
    setBusyKey(id);
    setError(null);
    setNotice(null);
    try {
      await submitIntervention(id, {
        resultatIntervention: result,
        compteRendu,
        ...(motifException ? { motifException } : {}),
      });
      setReports((current) => ({ ...current, [id]: '' }));
      setExceptions((current) => ({ ...current, [id]: '' }));
      await refresh('Compte rendu soumis pour vérification indépendante.');
    } catch (reason) {
      const message = errorMessage(reason);
      await loadMissions();
      setError(message);
    } finally {
      setBusyKey(null);
    }
  }

  const selectedTeam = teams.find((team) => team.idEquipe === selectedTeamId) ?? null;

  return (
    <ScrollView
      className="flex-1 bg-eco-50"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={loadingMissions} onRefresh={() => void loadMissions()} />}
    >
      <Text className="text-xs font-extrabold uppercase tracking-[0.18em] text-eco-700">Espace agent terrain</Text>
      <Text className="mt-3 text-3xl font-extrabold text-eco-950">Mes missions</Text>
      <Text className="mt-2 text-sm leading-6 text-slate-600">Les équipes affichées proviennent de vos appartenances actives. L’API contrôle de nouveau les droits à chaque opération.</Text>

      {error ? <Text className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</Text> : null}
      {notice ? <Text className="mt-4 rounded-xl bg-eco-100 p-4 text-sm text-eco-900">{notice}</Text> : null}

      {loadingTeams ? <View className="mt-8 items-center"><ActivityIndicator color="#166534" /><Text className="mt-3 text-sm text-slate-500">Chargement des équipes…</Text></View> : (
        <>
          {teams.length === 0 ? (
            <View className="mt-6 rounded-2xl border border-eco-100 bg-white p-5">
              <Text className="text-sm font-bold text-slate-800">Aucune équipe active</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600">Contactez le gestionnaire des référentiels pour vérifier vos appartenances.</Text>
            </View>
          ) : (
            <>
              <View className="mt-6">
                <Text className="text-xs font-bold text-slate-700">Équipe</Text>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {teams.map((team) => (
                    <TouchableOpacity
                      key={team.idEquipe}
                      onPress={() => setSelectedTeamId(team.idEquipe)}
                      className={selectedTeamId === team.idEquipe ? 'rounded-full bg-eco-700 px-4 py-3' : 'rounded-full border border-eco-200 bg-white px-4 py-3'}
                    >
                      <Text className={selectedTeamId === team.idEquipe ? 'text-xs font-bold text-white' : 'text-xs font-semibold text-slate-700'}>
                        {team.nomEquipe}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedTeam ? <Text className="mt-2 text-xs text-slate-500">{selectedTeam.fonction} · membre depuis {dateLabel(selectedTeam.dateDebut)}</Text> : null}
              </View>

              <View className="mt-7">
                <Text className="text-lg font-extrabold text-eco-950">Affectations de l’équipe</Text>
                {!loadingMissions && assignments.length === 0 ? <Text className="mt-3 text-sm text-slate-500">Aucune affectation active.</Text> : null}
                <View className="mt-3 gap-4">
                  {assignments.map((assignment) => {
                    const latest = latestByAssignment.get(assignment.idAffectation);
                    const verification = latest?.affectation.verifications[0];
                    const canStart = assignment.decisionEquipe === 'ACCEPTEE' && (
                      !latest ||
                      (latest.statutIntervention === 'SOUMISE' &&
                        verification?.etatVerification === 'REPRISE' &&
                        new Date(verification.dateVerification).getTime() >= new Date(latest.dateSoumissionCompteRendu ?? 0).getTime())
                    );
                    const isAuthor = latest?.renseignePar === profile?.utilisateurId;
                    return (
                      <View key={assignment.idAffectation} className="rounded-2xl border border-eco-100 bg-white p-5">
                        <Text className="text-base font-bold text-eco-950">{assignment.contenuDossier.dossier.referenceDossier}</Text>
                        <Text className="mt-1 text-sm text-slate-700">{assignment.contenuDossier.typeDechet.libelle}</Text>
                        <Text className="mt-1 text-xs text-slate-500">{assignment.decisionEquipe} · {assignment.etatAffectation}</Text>
                        {assignment.decisionEquipe === 'EN_ATTENTE' ? (
                          <View className="mt-4 gap-2">
                            <TextInput
                              value={refusalReasons[assignment.idAffectation] ?? ''}
                              onChangeText={(value) => setRefusalReasons((current) => ({ ...current, [assignment.idAffectation]: value }))}
                              placeholder="Motif obligatoire si refus (5 caractères minimum)"
                              multiline
                              className={inputClass}
                            />
                            <TextInput
                              value={observations[assignment.idAffectation] ?? ''}
                              onChangeText={(value) => setObservations((current) => ({ ...current, [assignment.idAffectation]: value }))}
                              placeholder="Observation (facultative)"
                              className={inputClass}
                            />
                            <View className="flex-row gap-2">
                              <TouchableOpacity onPress={() => void respond(assignment, 'REFUSEE')} disabled={busyKey === assignment.idAffectation} className={secondaryClass + ' flex-1'}>
                                <Text className="text-center text-xs font-bold text-slate-700">Refuser</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => void respond(assignment, 'ACCEPTEE')} disabled={busyKey === assignment.idAffectation} className={buttonClass + ' flex-1'}>
                                <Text className="text-center text-xs font-bold text-white">Accepter</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : null}

                        {latest ? (
                          <View className="mt-4 rounded-xl bg-slate-50 p-4">
                            <Text className="text-sm font-bold text-slate-800">Dernière intervention</Text>
                            <Text className="mt-1 text-xs text-slate-500">Démarrée le {dateLabel(latest.dateHeureDebut)}</Text>
                            {latest.statutIntervention === 'SOUMISE' ? (
                              <View className="mt-2">
                                <Text className="text-xs font-semibold text-slate-700">{latest.resultatIntervention} · {verification?.etatVerification === 'REPRISE' ? 'Reprise demandée' : verification?.etatVerification === 'VALIDEE' ? 'Validée' : 'En attente de vérification'}</Text>
                                {latest.compteRendu ? <Text className="mt-2 text-sm leading-6 text-slate-700">{latest.compteRendu}</Text> : null}
                              </View>
                            ) : null}
                            {latest.statutIntervention === 'EN_COURS' && isAuthor ? (
                              <View className="mt-3 gap-3">
                                <Text className="text-xs text-slate-600">Cette intervention est démarrée par votre compte. Vous pouvez soumettre son compte rendu.</Text>
                                <TextInput
                                  value={reports[latest.idIntervention] ?? ''}
                                  onChangeText={(value) => setReports((current) => ({ ...current, [latest.idIntervention]: value }))}
                                  multiline
                                  textAlignVertical="top"
                                  maxLength={10000}
                                  placeholder="Compte rendu détaillé (20 caractères minimum)"
                                  className={inputClass + ' min-h-[120px]'}
                                />
                                <Text className="text-xs font-bold text-slate-700">Résultat terrain</Text>
                                <View className="flex-row flex-wrap gap-2">
                                  {(['TERMINEE', 'PARTIELLE', 'IMPOSSIBLE'] as const).map((value) => (
                                    <TouchableOpacity key={value} onPress={() => setResults((current) => ({ ...current, [latest.idIntervention]: value }))} className={(results[latest.idIntervention] ?? 'TERMINEE') === value ? 'rounded-full bg-eco-700 px-3 py-2' : 'rounded-full border border-slate-200 bg-white px-3 py-2'}>
                                      <Text className={(results[latest.idIntervention] ?? 'TERMINEE') === value ? 'text-[10px] font-bold text-white' : 'text-[10px] font-semibold text-slate-700'}>{value}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                                {(results[latest.idIntervention] ?? 'TERMINEE') !== 'TERMINEE' ? (
                                  <TextInput
                                    value={exceptions[latest.idIntervention] ?? ''}
                                    onChangeText={(value) => setExceptions((current) => ({ ...current, [latest.idIntervention]: value }))}
                                    multiline
                                    placeholder="Motif d’exception obligatoire (5 caractères minimum)"
                                    className={inputClass}
                                  />
                                ) : null}
                                <TouchableOpacity onPress={() => void submit(latest)} disabled={busyKey === latest.idIntervention} className={buttonClass}>
                                  <Text className="text-center text-xs font-bold text-white">{busyKey === latest.idIntervention ? 'Soumission…' : 'Soumettre le compte rendu'}</Text>
                                </TouchableOpacity>
                              </View>
                            ) : latest.statutIntervention === 'EN_COURS' ? (
                              <Text className="mt-2 text-xs text-slate-500">Cette intervention a été démarrée par un autre membre de l’équipe. Seul son auteur peut soumettre le compte rendu.</Text>
                            ) : null}
                          </View>
                        ) : null}

                        {canStart ? (
                          <TouchableOpacity onPress={() => void start(assignment)} disabled={busyKey === assignment.idAffectation} className={buttonClass + ' mt-4'}>
                            <Text className="text-center text-xs font-bold text-white">{busyKey === assignment.idAffectation ? 'Démarrage…' : latest ? 'Démarrer la reprise' : 'Démarrer l’intervention'}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </>
      )}
      <Link href="/" className="mt-8 text-center text-sm font-semibold text-eco-700">Retour à l’accueil</Link>
    </ScrollView>
  );
}
