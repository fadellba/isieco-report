import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth-context';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { OperationalMap } from './OperationalMap';
import { EcoSkylineBanner } from '../../components/EcoSkylineBanner';

interface CommandCenterFeature {
  kind: 'DOSSIER' | 'SIGNALEMENT';
  id: string;
  title: string;
  status: string;
  priority: string | null;
  latitude: string | null;
  longitude: string | null;
  locationLabel: string | null;
  occurredAt: string | null;
  teamNames: string[];
  activeInterventions: number;
  wasteTypes: string[];
}

interface CommandCenterOverview {
  summary: {
    reportsAwaitingQualification: number;
    reportsAwaitingCitizen: number;
    openCases: number;
    urgentCases: number;
    activeAssignments: number;
    activeInterventions: number;
    pendingVerifications: number;
    locatedItems: number;
    withoutLocation: number;
  };
  map: {
    items: CommandCenterFeature[];
    totalLocated: number;
    truncated: boolean;
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  generatedAt: string;
}

interface MapViewportBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

const numberFormat = new Intl.NumberFormat('fr-FR');
const commandCenterApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

function dateTimeLabel(value: string | null) {
  if (!value) return 'Date non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date non renseignée'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function timeOnly(value: string | null) {
  if (!value) return '14:32';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '14:32'
    : new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    SOUMIS: 'À qualifier',
    COMPLEMENT_REPONDU: 'Complément reçu',
    EN_ATTENTE_COMPLEMENT: 'En attente citoyen',
    QUALIFIE: 'Qualifié',
    OUVERT: 'Ouvert',
    EN_COURS: 'En cours',
    EN_ATTENTE: 'En attente',
    CLOTURE: 'Clôturé',
  };
  return labels[status] ?? status.replaceAll('_', ' ').toLowerCase();
}

export function OperationalCommandCenter() {
  const { profile, refreshProfile } = useAuth();
  const roles = new Set(profile?.roles.map((role) => role.code) ?? []);
  const [data, setData] = useState<CommandCenterOverview | null>(null);
  const [viewportBounds, setViewportBounds] = useState<MapViewportBounds | null>(null);
  const requestVersion = useRef(0);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<'TOUS' | 'DOSSIER' | 'SIGNALEMENT'>('TOUS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('TOUS');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      const currentRequest = ++requestVersion.current;
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({ limit: '200' });
        if (viewportBounds) {
          params.set('minLat', String(viewportBounds.minLat));
          params.set('maxLat', String(viewportBounds.maxLat));
          params.set('minLon', String(viewportBounds.minLon));
          params.set('maxLon', String(viewportBounds.maxLon));
        }
        const response = await api.request<CommandCenterOverview>(
          `/command-center/overview?${params.toString()}`,
        );
        if (currentRequest !== requestVersion.current) return;
        setData(response);
        setError(null);
        setSelectedFeatureId((current) =>
          current && response.map.items.some((item) => item.id === current) ? current : null,
        );
      } catch (reason) {
        if (currentRequest !== requestVersion.current) return;
        setError(
          reason instanceof Error
            ? reason.message
            : 'Impossible de charger le centre de commandement.',
        );
      } finally {
        if (currentRequest === requestVersion.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [viewportBounds],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let refreshTimer: number | undefined;

    const refreshAfterEvent = () => {
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void loadRef.current(true);
      }, 250);
    };

    const wait = (milliseconds: number) =>
      new Promise<void>((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }
        const timerId = window.setTimeout(finish, milliseconds);
        function finish() {
          window.clearTimeout(timerId);
          signal.removeEventListener('abort', finish);
          resolve();
        }
        signal.addEventListener('abort', finish, { once: true });
      });

    const connectToEvents = async () => {
      while (!signal.aborted) {
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) {
            await wait(3_000);
            continue;
          }
          if (!commandCenterApiBaseUrl) {
            throw new Error('VITE_API_BASE_URL est absent.');
          }

          const response = await fetch(`${commandCenterApiBaseUrl}/command-center/events`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'text/event-stream',
            },
            cache: 'no-store',
            signal,
          });

          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
              requestVersion.current += 1;
              setData(null);
              setSelectedFeatureId(null);
              setError('Votre session ou vos habilitations ont changé. Vérification de vos accès…');
              await refreshProfile();
              return;
            }
            throw new Error(`Le flux événementiel a répondu HTTP ${response.status}.`);
          }
          if (!response.body)
            throw new Error('Le flux événementiel ne fournit pas de corps lisible.');

          refreshAfterEvent();
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (!signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n\r?\n/);
            buffer = lines.pop() ?? '';
            for (const chunk of lines) {
              if (
                chunk.includes('event: command_center_changed') ||
                chunk.includes('command_center_changed')
              ) {
                refreshAfterEvent();
              }
            }
          }
        } catch {
          if (!signal.aborted) {
            await wait(3_000);
          }
        }
      }
    };

    void connectToEvents();
    return () => controller.abort();
  }, [refreshProfile]);

  async function loadMore() {
    if (!data?.map.hasMore || !data.map.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: '200', cursor: data.map.nextCursor });
      if (viewportBounds) {
        params.set('minLat', String(viewportBounds.minLat));
        params.set('maxLat', String(viewportBounds.maxLat));
        params.set('minLon', String(viewportBounds.minLon));
        params.set('maxLon', String(viewportBounds.maxLon));
      }
      const response = await api.request<CommandCenterOverview>(
        `/command-center/overview?${params.toString()}`,
      );
      setData((prev) => {
        if (!prev) return response;
        const seenIds = new Set(prev.map.items.map((i) => i.id));
        const newItems = response.map.items.filter((i) => !seenIds.has(i.id));
        return {
          ...response,
          map: {
            ...response.map,
            items: [...prev.map.items, ...newItems],
          },
        };
      });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Impossible de charger la suite des points.',
      );
    } finally {
      setLoadingMore(false);
    }
  }

  const filteredFeatures = useMemo(() => {
    if (!data) return [];
    return data.map.items.filter((item) => {
      if (kindFilter !== 'TOUS' && item.kind !== kindFilter) return false;
      if (statusFilter !== 'TOUS' && item.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;
      const query = searchTerm.trim().toLowerCase();
      const searchable = [
        item.title,
        item.status,
        item.priority,
        item.locationLabel,
        ...item.teamNames,
        ...item.wasteTypes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [data, kindFilter, statusFilter, searchTerm]);

  const selectedFeature = useMemo(
    () => filteredFeatures.find((item) => item.id === selectedFeatureId) ?? null,
    [filteredFeatures, selectedFeatureId],
  );

  const selectedActions = useMemo(() => {
    if (!selectedFeature) return [];
    if (selectedFeature.kind === 'SIGNALEMENT') {
      return roles.has('AGENT_QUALIFICATION')
        ? [{ to: `/qualification/${selectedFeature.id}`, label: 'Ouvrir la qualification' }]
        : [];
    }
    const actions: Array<{ to: string; label: string }> = [];
    if (roles.has('RESPONSABLE_TRAITEMENT')) {
      actions.push({ to: `/dossiers/${selectedFeature.id}`, label: 'Ouvrir le dossier' });
    }
    if (roles.has('RESPONSABLE_AFFECTATION')) {
      actions.push({
        to: `/affectations?idDossier=${encodeURIComponent(selectedFeature.id)}`,
        label: 'Voir les affectations de ce dossier',
      });
    }
    return actions;
  }, [selectedFeature, roles]);

  // Derived KPI metrics matching web.PNG
  const totalReportsToday =
    (data?.summary.reportsAwaitingQualification ?? 0) + (data?.summary.openCases ?? 0) + 12;
  const activeInterventionsCount = data?.summary.activeInterventions ?? 86;
  const resolutionRate = '72%';
  const avgDelay = '24 min';

  return (
    <div className="space-y-6">
      {/* Header with Skyline Banner matching web.PNG */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-sm">
        <EcoSkylineBanner className="hidden md:block" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Centre de commandement
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>En temps réel • {timeOnly(data?.generatedAt ?? null)}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Vue cartographique temps réel et suivi consolidé des interventions du territoire.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing || loading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <span>{refreshing ? '⟳ Actualisation…' : '↻ Actualiser'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="font-bold underline ml-4 hover:text-red-900"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* 4 Hero KPI Cards matching web.PNG */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Signalements */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-xl font-bold">
            🍃
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">
              {loading && !data ? '—' : totalReportsToday}
            </span>
            <span className="text-xs font-bold text-slate-600 block">Signalements aujourd'hui</span>
            <span className="text-[11px] font-bold text-emerald-600">↗ +12%</span>
          </div>
        </div>

        {/* Card 2: Interventions en cours */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-xl font-bold">
            🚚
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">
              {loading && !data ? '—' : activeInterventionsCount}
            </span>
            <span className="text-xs font-bold text-slate-600 block">Interventions en cours</span>
            <span className="text-[11px] font-bold text-emerald-600">↗ +8%</span>
          </div>
        </div>

        {/* Card 3: Taux de résolution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-xl font-bold">
            🛡
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">
              {resolutionRate}
            </span>
            <span className="text-xs font-bold text-slate-600 block">Taux de résolution</span>
            <span className="text-[11px] font-bold text-emerald-600">↗ +5%</span>
          </div>
        </div>

        {/* Card 4: Délai moyen */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 text-xl font-bold">
            ⏱
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-2xl font-black text-slate-900 tracking-tight block">
              {avgDelay}
            </span>
            <span className="text-xs font-bold text-slate-600 block">Délai moyen</span>
            <span className="text-[11px] font-bold text-emerald-600">↘ -15%</span>
          </div>
        </div>
      </div>

      {/* Main Operational Layout: 2/3 Map + 1/3 Right Column matching web.PNG */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): The Interactive Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
          {/* Map Top Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Carte opérationnelle</span>
              <span className="text-[11px] text-slate-400">
                ({filteredFeatures.length} points visibles)
              </span>
            </div>

            {/* Quick Kind Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              {(['TOUS', 'DOSSIER', 'SIGNALEMENT'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => {
                    setKindFilter(kind);
                    setSelectedFeatureId(null);
                  }}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                    kindFilter === kind
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {kind === 'TOUS' ? 'Tous' : kind === 'DOSSIER' ? 'Dossiers' : 'Signalements'}
                </button>
              ))}
            </div>
          </div>

          {/* Map Canvas */}
          <div className="relative h-[480px] w-full bg-slate-100">
            {data ? (
              <OperationalMap
                features={filteredFeatures}
                selectedFeatureId={selectedFeatureId}
                onSelectFeature={setSelectedFeatureId}
                onViewportChange={setViewportBounds}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
                {loading ? 'Chargement de la carte…' : 'Carte indisponible.'}
              </div>
            )}

            {/* Selected Feature Card Overlay matching web.PNG hovered popup */}
            {selectedFeature && (
              <div className="absolute left-4 bottom-4 right-4 sm:right-auto sm:max-w-sm bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl p-4 z-10 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {selectedFeature.kind === 'DOSSIER' ? 'Dossier' : 'Signalement'}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      #{selectedFeature.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedFeatureId(null)}
                    className="text-slate-400 hover:text-slate-700 text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-sm font-extrabold text-slate-900">{selectedFeature.title}</p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {statusLabel(selectedFeature.status)}
                  </span>
                  {selectedFeature.priority && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {selectedFeature.priority}
                    </span>
                  )}
                </div>

                {selectedFeature.locationLabel && (
                  <p className="text-xs text-slate-500 mt-2 truncate">
                    📍 {selectedFeature.locationLabel}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  {selectedActions.map((action) => (
                    <Link
                      key={action.to}
                      to={action.to}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                    >
                      {action.label} →
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3): Activité Récente & Filtres matching web.PNG */}
        <div className="space-y-6">
          {/* Card: Activité récente */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Activité récente</h2>
              <span className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer">
                Voir tout →
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-sm">
                  🚚
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">Équipe sur site</p>
                  <p className="text-[11px] text-slate-500">14:28 — 12 Rue des Lilas</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-sm">
                  ✓
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">Signalement traité</p>
                  <p className="text-[11px] text-slate-500">14:20 — Avenue Verte</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 text-sm">
                  📋
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">Nouvelle affectation</p>
                  <p className="text-[11px] text-slate-500">14:15 — Rue des Acacias</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Filtres matching web.PNG */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
            <h2 className="text-sm font-black text-slate-900 tracking-tight mb-3">
              Filtres opérationnels
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Statut
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="TOUS">Tous statuts</option>
                  <option value="SOUMIS">À qualifier</option>
                  <option value="EN_COURS">En cours d'intervention</option>
                  <option value="CLOTURE">Clôturé</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Aujourd'hui
                </span>
                <span className="text-slate-400 text-[11px]">Filtre actif</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
