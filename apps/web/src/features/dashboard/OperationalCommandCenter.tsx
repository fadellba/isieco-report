import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth-context';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { OperationalMap } from './OperationalMap';
import { EcoSkylineBanner } from '../../components/EcoSkylineBanner';
import { AppIcon } from '../../components/AppIcon';

interface CommandCenterFeature {
  kind: 'DOSSIER' | 'SIGNALEMENT' | 'INTERVENTION';
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
    interventions: CommandCenterFeature[];
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
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
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

/**
 * Keep the Web client compatible with API deployments that predate the
 * interventions map layer. A missing or malformed collection is treated as
 * an empty layer instead of crashing the entire command center.
 */
function normalizeCommandCenterOverview(response: CommandCenterOverview): CommandCenterOverview {
  if (!response || typeof response !== 'object') {
    throw new Error('L’API a renvoyé une réponse invalide pour le centre de commandement.');
  }

  const map = response.map && typeof response.map === 'object' ? response.map : null;
  return {
    ...response,
    map: {
      items: Array.isArray(map?.items) ? map.items : [],
      interventions: Array.isArray(map?.interventions) ? map.interventions : [],
      totalLocated: typeof map?.totalLocated === 'number' ? map.totalLocated : 0,
      truncated: map?.truncated === true,
      limit: typeof map?.limit === 'number' ? map.limit : 200,
      hasMore: map?.hasMore === true,
      nextCursor: typeof map?.nextCursor === 'string' ? map.nextCursor : null,
    },
  };
}

export function OperationalCommandCenter() {
  const { profile, refreshProfile } = useAuth();
  const roles = new Set(profile?.roles.map((role) => role.code) ?? []);
  const [data, setData] = useState<CommandCenterOverview | null>(null);
  const [viewportBounds, setViewportBounds] = useState<MapViewportBounds | null>(null);
  const requestVersion = useRef(0);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<'TOUS' | 'DOSSIER' | 'SIGNALEMENT' | 'INTERVENTION'>('TOUS');
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
        const response = normalizeCommandCenterOverview(
          await api.request<CommandCenterOverview>(
            `/command-center/overview?${params.toString()}`,
          ),
        );
        if (currentRequest !== requestVersion.current) return;
        setData(response);
        setError(null);
        setSelectedFeatureId((current) =>
          current && [...response.map.items, ...response.map.interventions].some((item) => item.id === current) ? current : null,
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
      const response = normalizeCommandCenterOverview(
        await api.request<CommandCenterOverview>(
          `/command-center/overview?${params.toString()}`,
        ),
      );
      setData((prev) => {
        if (!prev) return response;
        const seenIds = new Set(prev.map.items.map((i) => i.kind + ':' + i.id));
        const newItems = response.map.items.filter((i) => !seenIds.has(i.kind + ':' + i.id));
        return {
          ...response,
          map: {
            ...response.map,
            items: [...prev.map.items, ...newItems],
            interventions: response.map.interventions,
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
    const visibleFeatures = [...data.map.items, ...data.map.interventions];
    return visibleFeatures.filter((item) => {
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
    if (selectedFeature.kind === 'INTERVENTION') {
      return roles.has('VERIFICATEUR_CLOTURE')
        ? [{ to: '/verification', label: 'Ouvrir les vérifications' }]
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

  const reportsToProcess =
    (data?.summary.reportsAwaitingQualification ?? 0) +
    (data?.summary.reportsAwaitingCitizen ?? 0);

  const recentFeatures = useMemo(() => {
    const source = [...(data?.map.items ?? []), ...(data?.map.interventions ?? [])];
    const query = searchTerm.trim().toLocaleLowerCase('fr-FR');
    return source
      .filter((item) => statusFilter === 'TOUS' || item.status === statusFilter)
      .filter((item) =>
        !query
          ? true
          : [
              item.title,
              item.status,
              item.locationLabel,
              ...item.teamNames,
              ...item.wasteTypes,
            ]
              .filter(Boolean)
              .join(' ')
              .toLocaleLowerCase('fr-FR')
              .includes(query),
      )
      .sort(
        (left, right) =>
          new Date(right.occurredAt ?? 0).getTime() - new Date(left.occurredAt ?? 0).getTime(),
      )
      .slice(0, 8);
  }, [data, searchTerm, statusFilter]);

  return (
    <div className="command-center-page space-y-3">
      {/* Header with Skyline Banner matching web.PNG */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm">
        <EcoSkylineBanner />

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

      <section aria-label="Indicateurs opérationnels" className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <article className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">📍</span>
            <span className="text-xs font-semibold text-slate-600">Signalements</span>
          </div>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
            {loading && !data ? '—' : numberFormat.format(reportsToProcess)}
          </p>
          <p className="text-[10px] leading-4 text-slate-500">
            {numberFormat.format(data?.summary.reportsAwaitingQualification ?? 0)} à qualifier · {numberFormat.format(data?.summary.reportsAwaitingCitizen ?? 0)} en attente citoyen
          </p>
        </article>

        <article className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">🗂️</span>
            <span className="text-xs font-semibold text-slate-600">Dossiers ouverts</span>
          </div>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
            {loading && !data ? '—' : numberFormat.format(data?.summary.openCases ?? 0)}
          </p>
          <p className="text-[10px] leading-4 text-slate-500">
            {numberFormat.format(data?.summary.urgentCases ?? 0)} prioritaires
          </p>
        </article>

        <article className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">🧭</span>
            <span className="text-xs font-semibold text-slate-600">Affectations actives</span>
          </div>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
            {loading && !data ? '—' : numberFormat.format(data?.summary.activeAssignments ?? 0)}
          </p>
          <p className="text-[10px] leading-4 text-slate-500">Missions attribuées aux équipes</p>
        </article>

        <article className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">🚚</span>
            <span className="text-xs font-semibold text-slate-600">Interventions en cours</span>
          </div>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
            {loading && !data ? '—' : numberFormat.format(data?.summary.activeInterventions ?? 0)}
          </p>
          <p className="text-[10px] leading-4 text-slate-500">
            {numberFormat.format(data?.summary.pendingVerifications ?? 0)} à vérifier
          </p>
        </article>
      </section>

      {/* Main Operational Layout: 2/3 Map + 1/3 Right Column matching web.PNG */}
      <div className="command-center-layout grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              {(['TOUS', 'DOSSIER', 'SIGNALEMENT', 'INTERVENTION'] as const).map((kind) => (
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
                  {kind === 'TOUS' ? 'Tous' : kind === 'DOSSIER' ? 'Dossiers' : kind === 'SIGNALEMENT' ? 'Signalements' : 'Interventions'}
                </button>
              ))}
            </div>
          </div>

          {/* Map Canvas */}
          <div className="command-center-map relative h-[320px] w-full bg-slate-100">
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
                      {selectedFeature.kind === 'INTERVENTION' ? 'Intervention' : selectedFeature.kind === 'DOSSIER' ? 'Dossier' : 'Signalement'}
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
          {data?.map.hasMore && data.map.nextCursor ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <p className="text-[10px] leading-4 text-slate-500">
                D’autres éléments cartographiques sont disponibles. Certains dossiers ne sont pas affichés comme marqueurs.
              </p>
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
              >
                {loadingMore ? 'Chargement…' : 'Charger les points suivants'}
              </button>
            </div>
          ) : null}
        </div>

        {/* Activité récente, classée par date métier. */}
        <aside className="command-center-filters space-y-3" aria-label="Activité récente">
          <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
              <div>
                <h2 className="text-sm font-black tracking-tight text-slate-900">Actions récentes</h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Derniers signalements, dossiers et démarrages d’intervention.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                {recentFeatures.length}
              </span>
            </div>
            <div className="space-y-2 border-b border-slate-100 p-3">
              <label className="block">
                <span className="sr-only">Rechercher dans l’activité récente</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher une référence, une équipe…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="sr-only">Filtrer l’activité par statut</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="TOUS">Tous les statuts</option>
                  <option value="SOUMIS">À qualifier</option>
                  <option value="COMPLEMENT_REPONDU">Complément reçu</option>
                  <option value="EN_ATTENTE_COMPLEMENT">En attente citoyen</option>
                  <option value="OUVERT">Ouvert</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="EN_ATTENTE">En attente</option>
                </select>
              </label>
            </div>
            {recentFeatures.length ? (
              <ol className="divide-y divide-slate-100">
                {recentFeatures.map((feature) => {
                  const featureType =
                    feature.kind === 'INTERVENTION'
                      ? 'Intervention démarrée'
                      : feature.kind === 'DOSSIER'
                        ? 'Dossier créé'
                        : 'Signalement reçu';
                  const icon: 'mapIntervention' | 'mapCase' | 'mapReport' =
                    feature.kind === 'INTERVENTION'
                      ? 'mapIntervention'
                      : feature.kind === 'DOSSIER'
                        ? 'mapCase'
                        : 'mapReport';
                  return (
                    <li key={feature.kind + ':' + feature.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setKindFilter('TOUS');
                          setStatusFilter('TOUS');
                          setSearchTerm('');
                          setSelectedFeatureId(feature.id);
                        }}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus-visible:bg-slate-50"
                      >
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
                          <AppIcon name={icon} size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            {featureType}
                          </span>
                          <span className="mt-0.5 block truncate text-xs font-bold text-slate-900">
                            {feature.title}
                          </span>
                          <span className="mt-1 block truncate text-[10px] text-slate-500">
                            {feature.locationLabel || feature.teamNames.join(', ') || 'Localisation non précisée'}
                          </span>
                          <span className="mt-1 block text-[10px] text-slate-400">
                            {dateTimeLabel(feature.occurredAt)}
                          </span>
                        </span>
                        <span className="shrink-0 pt-4 text-[10px] font-semibold text-emerald-700">
                          Carte
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="px-4 py-10 text-center">
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-500">
                  <AppIcon name="overview" size={18} />
                </span>
                <p className="mt-3 text-xs font-bold text-slate-800">Aucune activité récente</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Les éléments apparaîtront ici à mesure qu’ils sont enregistrés.
                </p>
              </div>
            )}
            <div className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500">
              Classement selon les dates de soumission, de création et de démarrage.
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
