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
  { key: 'reportsAwaitingQualification', label: 'Signalements à traiter', hint: 'Soumis ou complément reçu', accent: 'leaf' },
  { key: 'activeInterventions', label: 'Interventions en cours', hint: 'Opérations terrain actives', accent: 'truck' },
  { key: 'openCases', label: 'Dossiers ouverts', hint: 'Dossiers non clôturés', accent: 'check' },
  { key: 'pendingVerifications', label: 'À vérifier', hint: 'Comptes rendus transmis', accent: 'clock' },
] as const;

type MetricKey = (typeof metricCards)[number]['key'];

export function OperationalCommandCenter() {
  const { profile, refreshProfile } = useAuth();
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
  }, [refreshProfile]);


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

  const recentFeatures = useMemo(
    () => [...(data?.map.items ?? [])]
      .filter((item) => item.occurredAt)
      .sort((left, right) => new Date(right.occurredAt ?? 0).getTime() - new Date(left.occurredAt ?? 0).getTime())
      .slice(0, 4),
    [data],
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
    <section className="command-center command-center--reference" aria-label="Centre de commandement opérationnel">
      <div className="command-center__toolbar">
        <label className="command-center__global-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setSelectedFeatureId(null);
            }}
            placeholder="Rechercher un signalement, une adresse…"
            aria-label="Rechercher un signalement, une adresse ou une équipe"
          />
        </label>
        <div className="command-center__toolbar-actions">
          {data ? (
            <span className="command-center__updated">
              <i /> En temps réel · {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(data.generatedAt))}
            </span>
          ) : null}
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
          <article className={`command-center__metric command-center__metric--${metric.accent}`} key={metric.key}>
            <span className="command-center__metric-icon" aria-hidden="true" />
            <div className="command-center__metric-copy">
              <strong>{loading && !data ? '—' : numberFormat.format(data?.summary[metric.key as MetricKey] ?? 0)}</strong>
              <span>{metric.label}</span>
              <small>{metric.hint}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="command-center__body-grid">
        <div className="command-center__map-column">
          <div className="command-center__map-heading">
            <div>
              <h3>Carte opérationnelle</h3>
              <p>
                {data
                  ? `${numberFormat.format(filteredFeatures.length)} / ${numberFormat.format(data.map.totalLocated)} entité(s) visibles · ${numberFormat.format(data.summary.withoutLocation)} sans coordonnées`
                  : 'Chargement des données géographiques…'}
              </p>
            </div>
            <div className="command-center__legend">
              <span><i className="is-report" /> Signalement</span>
              <span><i className="is-case" /> Dossier</span>
              <span><i className="is-cluster" /> Groupe</span>
            </div>
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
          <p className="command-center__footnote">
            Les éléments affichés sont limités à la zone visible. Actualisation événementielle, avec secours périodique toutes les 60 secondes. Aucune position GPS d’agent n’est collectée.
          </p>
        </div>

        <aside className="command-center__side-panel">
          <section className="command-center__activity-card" aria-label="Activité récente">
            <div className="command-center__side-heading">
              <div><h3>Activité récente</h3><p>Éléments récents de la zone affichée</p></div>
              <span>{recentFeatures.length}</span>
            </div>
            {recentFeatures.length ? (
              <div className="command-center__activity-list">
                {recentFeatures.map((item) => (
                  <button
                    key={item.kind + ':' + item.id}
                    type="button"
                    className={selectedFeatureId === item.id ? 'command-center__activity-item is-selected' : 'command-center__activity-item'}
                    onClick={() => setSelectedFeatureId(item.id)}
                  >
                    <i className={item.kind === 'DOSSIER' ? 'is-case' : 'is-report'} />
                    <span className="command-center__activity-copy">
                      <strong>{item.title}</strong>
                      <small>{statusLabel(item.status)} · {dateTimeLabel(item.occurredAt)}</small>
                      {item.locationLabel ? <small>{item.locationLabel}</small> : null}
                    </span>
                    <span className="command-center__activity-arrow">›</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="command-center__activity-empty">
                {loading ? 'Chargement des dernières données…' : 'Aucun élément géolocalisé dans cette zone.'}
              </div>
            )}
          </section>

          <section className="command-center__filters-card" aria-label="Filtres de la carte">
            <div className="command-center__side-heading">
              <div><h3>Filtres</h3><p>Affiner les éléments affichés</p></div>
            </div>
            <div className="command-center__filter-tabs" role="group" aria-label="Filtrer les types d'entités">
              {([
                ['TOUS', 'Tous types'],
                ['SIGNALEMENT', 'Signalements'],
                ['DOSSIER', 'Dossiers'],
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
            <span className="command-center__filter-date"><i /> Données de la zone visible</span>
          </section>

          {selectedFeature ? (
            <section className="command-center__selected command-center__selected--side" aria-live="polite">
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
            </section>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
