import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
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
  };
  generatedAt: string;
}

const numberFormat = new Intl.NumberFormat('fr-FR');

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
  const [data, setData] = useState<CommandCenterOverview | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await api.request<CommandCenterOverview>('/command-center/overview?limit=200');
      setData(response);
      setError(null);
      setSelectedFeatureId((current) =>
        current && response.map.items.some((item) => item.id === current) ? current : null,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger le centre de commandement.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const selectedFeature = useMemo(
    () => data?.map.items.find((item) => item.id === selectedFeatureId) ?? null,
    [data, selectedFeatureId],
  );

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
              ? `${numberFormat.format(data.map.totalLocated)} entité(s) géolocalisée(s) · ${numberFormat.format(data.summary.withoutLocation)} sans coordonnées`
              : 'Chargement des données géographiques…'}
          </p>
        </div>
        <div className="command-center__legend">
          <span><i className="is-case" /> Dossier</span>
          <span><i className="is-report" /> Signalement</span>
        </div>
      </div>

      {data ? (
        <OperationalMap
          features={data.map.items}
          selectedFeatureId={selectedFeatureId}
          onSelectFeature={setSelectedFeatureId}
        />
      ) : (
        <div className="command-center__map-loading">
          {loading ? 'Chargement de la carte opérationnelle…' : 'Les données de la carte ne sont pas disponibles.'}
        </div>
      )}

      {data?.map.truncated ? (
        <p className="command-center__truncated">
          Affichage limité aux {numberFormat.format(data.map.items.length)} derniers éléments géolocalisés retournés par l’API.
        </p>
      ) : null}

      <div className="command-center__footnote">
        Actualisation automatique toutes les 60 secondes. Il ne s’agit pas d’un suivi GPS temps réel des équipes.
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
          </div>
          <button type="button" onClick={() => setSelectedFeatureId(null)}>Fermer</button>
        </div>
      ) : null}
    </section>
  );
}
