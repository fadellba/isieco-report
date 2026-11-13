import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth-context';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { OperationalMap } from './OperationalMap';

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

const metricCards = [
  { key: 'openCases', label: 'Dossiers ouverts', hint: 'Dossiers non clôturés' },
  { key: 'urgentCases', label: 'Priorité haute / critique', hint: 'À surveiller en premier' },
  { key: 'reportsAwaitingQualification', label: 'À qualifier', hint: 'Soumis ou complément reçu' },
  { key: 'reportsAwaitingCitizen', label: 'Attente citoyen', hint: 'Complément demandé' },
  { key: 'activeAssignments', label: 'Affectations actives', hint: 'Missions non terminées' },
  { key: 'activeInterventions', label: 'Interventions actives', hint: 'Travaux en cours sur le terrain' },
  { key: 'pendingVerifications', label: 'À vérifier', hint: 'Comptes rendus transmis' },
  { key: 'withoutLocation', label: 'Sans coordonnées', hint: 'À géolocaliser pour la carte' },
] as const;

type MetricKey = (typeof metricCards)[number]['key'];

export function OperationalCommandCenter() {
  const { profile } = useAuth();
  const roles = new Set(profile?.roles.map((role) => role.code) ?? []);
  const [data, setData] = useState<CommandCenterOverview | null>(null);
  const [viewportBounds, setViewportBounds] = useState<MapViewportBounds | null>(null);
  const requestVersion = useRef(0);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<'TOUS' | 'DOSSIER' | 'SIGNALEMENT'>('TOUS');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
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
      const response = await api.request<CommandCenterOverview>(`/command-center/overview?${params.toString()}`);
      if (currentRequest !== requestVersion.current) return;
      setData(response);
      setError(null);
      setSelectedFeatureId((current) =>
        current && response.map.items.some((item) => item.id === current) ? current : null,
      );
    } catch (reason) {
      if (currentRequest !== requestVersion.current) return;
      setError(reason instanceof Error ? reason.message : 'Impossible de charger le centre de commandement.');
    } finally {
      if (currentRequest === requestVersion.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [viewportBounds]);

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

    const wait = (milliseconds: number) => new Promise<void>((resolve) => {
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
      let retryDelay = 1_000;
      while (!signal.aborted) {
        try {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          const accessToken = data.session?.access_token;
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
            throw new Error(`Le flux événementiel a répondu HTTP ${response.status}.`);
          }
          if (!response.body) throw new Error('Le flux événementiel ne fournit pas de corps lisible.');

          retryDelay = 1_000;
          refreshAfterEvent();
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (!signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');

            let separator = buffer.indexOf('\n\n');
            while (separator >= 0) {
              const frame = buffer.slice(0, separator);
              buffer = buffer.slice(separator + 2);
              const eventName = frame
                .split('\n')
                .find((line) => line.startsWith('event:'))
                ?.slice(6)
                .trim();
              if (eventName === 'command_center_changed') refreshAfterEvent();
              separator = buffer.indexOf('\n\n');
            }
          }

          await reader.cancel().catch(() => undefined);
          if (!signal.aborted) throw new Error('Le flux événementiel a été fermé.');
        } catch {
          if (signal.aborted) return;
          await wait(retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30_000);
        }
      }
    };

    void connectToEvents();
    return () => {
      controller.abort();
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
    };
  }, []);


  const loadMore = useCallback(async () => {
    const cursor = data?.map.nextCursor;
    if (!cursor || loadingMore) return;
    const currentRequest = ++requestVersion.current;
    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '200', cursor });
      if (viewportBounds) {
        params.set('minLat', String(viewportBounds.minLat));
        params.set('maxLat', String(viewportBounds.maxLat));
        params.set('minLon', String(viewportBounds.minLon));
        params.set('maxLon', String(viewportBounds.maxLon));
      }
      const response = await api.request<CommandCenterOverview>(`/command-center/overview?${params.toString()}`);
      if (currentRequest !== requestVersion.current) return;
      setData((current) => {
        if (!current) return response;
        const existing = new Set(current.map.items.map((item) => `${item.kind}:${item.id}`));
        const appended = response.map.items.filter((item) => !existing.has(`${item.kind}:${item.id}`));
        return {
          ...response,
          map: {
            ...response.map,
            items: [...current.map.items, ...appended],
          },
        };
      });
    } catch (reason) {
      if (currentRequest !== requestVersion.current) return;
      setError(reason instanceof Error ? reason.message : 'Impossible de charger la page cartographique suivante.');
    } finally {
      if (currentRequest === requestVersion.current) setLoadingMore(false);
    }
  }, [data, loadingMore, viewportBounds]);


  const filteredFeatures = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase('fr-FR');
    return (data?.map.items ?? []).filter((item) => {
      if (kindFilter !== 'TOUS' && item.kind !== kindFilter) return false;
      if (!query) return true;
      const searchable = [
        item.title,
        item.status,
        item.priority,
        item.locationLabel,
        ...item.teamNames,
        ...item.wasteTypes,
      ].filter(Boolean).join(' ').toLocaleLowerCase('fr-FR');
      return searchable.includes(query);
    });
  }, [data, kindFilter, searchTerm]);

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

  return (
    <section className="command-center" aria-label="Centre de commandement opérationnel">
      <div className="command-center__heading">
        <div>
          <p className="dashboard-eyebrow">PILOTAGE OPÉRATIONNEL</p>
          <h2>Centre de commandement</h2>
          <p>Vue agrégée des dossiers, signalements et missions disposant de données géographiques.</p>
        </div>
        <div className="command-center__refresh">
          {data ? <span>Actualisé à {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(data.generatedAt))}</span> : null}
          <button type="button" onClick={() => void load(true)} disabled={refreshing || loading}>
            {refreshing ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="command-center__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void load()}>Réessayer</button>
        </div>
      ) : null}

      <div className="command-center__metrics">
        {metricCards.map((metric) => (
          <article className="command-center__metric" key={metric.key}>
            <span>{metric.label}</span>
            <strong>{loading && !data ? '—' : numberFormat.format(data?.summary[metric.key as MetricKey] ?? 0)}</strong>
            <small>{metric.hint}</small>
          </article>
        ))}
      </div>

      <div className="command-center__map-heading">
        <div>
          <h3>Carte des opérations</h3>
          <p>
            {data
              ? `${numberFormat.format(filteredFeatures.length)} / ${numberFormat.format(data.map.totalLocated)} entité(s) affichée(s) · ${numberFormat.format(data.summary.withoutLocation)} sans coordonnées`
              : 'Chargement des données géographiques…'}
          </p>
        </div>
        <div className="command-center__legend">
          <span><i className="is-case" /> Dossier</span>
          <span><i className="is-report" /> Signalement</span>
        </div>
      </div>

      <div className="command-center__filters">
        <div className="command-center__filter-tabs" role="group" aria-label="Filtrer les types d'entités">
          {([
            ['TOUS', 'Tout'],
            ['DOSSIER', 'Dossiers'],
            ['SIGNALEMENT', 'Signalements'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={kindFilter === value ? 'is-active' : ''}
              aria-pressed={kindFilter === value}
              onClick={() => {
                setKindFilter(value);
                setSelectedFeatureId(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="command-center__search">
          <span>Rechercher</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setSelectedFeatureId(null);
            }}
            placeholder="Référence, statut, lieu, équipe, déchet…"
          />
        </label>
      </div>

      {data ? (
        <OperationalMap
          features={filteredFeatures}
          selectedFeatureId={selectedFeatureId}
          onSelectFeature={setSelectedFeatureId}
          onViewportChange={setViewportBounds}
        />
      ) : (
        <div className="command-center__map-loading">
          {loading ? 'Chargement de la carte opérationnelle…' : 'Les données de la carte ne sont pas disponibles.'}
        </div>
      )}

      {data?.map.hasMore ? (
        <div className="command-center__pagination">
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore || loading}>
            {loadingMore ? 'Chargement…' : 'Charger les éléments suivants'}
          </button>
        </div>
      ) : null}

      <div className="command-center__footnote">
        Les résultats sont limités à la zone visible. Actualisation périodique toutes les 60 secondes ; aucune position GPS d’agent n’est collectée.
      </div>

      {selectedFeature ? (
        <div className="command-center__selected" aria-live="polite">
          <div>
            <span className={selectedFeature.kind === 'DOSSIER' ? 'command-center__type command-center__type--case' : 'command-center__type command-center__type--report'}>
              {selectedFeature.kind === 'DOSSIER' ? 'Dossier' : 'Signalement'}
            </span>
            <strong>{selectedFeature.title}</strong>
            <span>{statusLabel(selectedFeature.status)}{selectedFeature.priority ? ` · Priorité ${selectedFeature.priority.toLowerCase()}` : ''}</span>
            <small>{selectedFeature.locationLabel || 'Localisation textuelle non renseignée'} · {dateTimeLabel(selectedFeature.occurredAt)}</small>
            {selectedFeature.teamNames.length ? <small>Équipe(s) : {selectedFeature.teamNames.join(', ')}</small> : null}
            {selectedFeature.wasteTypes.length ? <small>Déchets : {selectedFeature.wasteTypes.join(', ')}</small> : null}
            <div className="command-center__actions">
              {selectedActions.length ? selectedActions.map((action) => (
                <Link key={action.to} to={action.to}>{action.label}</Link>
              )) : (
                <span className="command-center__read-only">
                  Aucune action directe disponible pour vos habilitations sur cette entité.
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setSelectedFeatureId(null)}>Fermer</button>
        </div>
      ) : null}
    </section>
  );
}
