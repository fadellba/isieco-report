import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { FeedbackBanner, StatusBadge, type StatusTone } from '../../components/StatusBadge';

interface CaseContent {
  idTypeDechet: string;
  etatContenuDossier: string;
  etatPriseEnCharge: string;
  typeDechet: { idTypeDechet: string; codeType: string; libelle: string };
}
interface CaseItem {
  idDossier: string;
  referenceDossier: string;
  descriptionSynthese: string;
  dateCreationDossier: string;
  statutDossier: string;
  priorite: string;
  contenus: CaseContent[];
  nombreSignalements: number;
}
interface QualifiedReport {
  idSignalement: string;
  dateSoumission: string | null;
  description: string | null;
  utilisateur: { nom: string; prenom: string | null };
  contenus: Array<{ idTypeDechet: string; typeDechet: { codeType: string; libelle: string } }>;
}
interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date non renseignée'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
}
function personName(report: QualifiedReport) {
  return report.utilisateur.prenom
    ? report.utilisateur.prenom + ' ' + report.utilisateur.nom
    : report.utilisateur.nom;
}
function caseStatusTone(status: string): StatusTone {
  if (status === 'CLOTURE') return 'success';
  if (status === 'EN_COURS') return 'info';
  if (status === 'EN_ATTENTE') return 'warning';
  return 'neutral';
}
function priorityTone(priority: string): StatusTone {
  if (priority === 'CRITIQUE') return 'danger';
  if (priority === 'HAUTE') return 'warning';
  if (priority === 'BASSE') return 'neutral';
  return 'info';
}
function stateLabel(value: string) {
  return value.replaceAll('_', ' ').toLowerCase();
}

export function CasesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Page<CaseItem> | null>(null);
  const [availableReports, setAvailableReports] = useState<QualifiedReport[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState('');
  const [priority, setPriority] = useState('NORMALE');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (status) params.set('statutDossier', status);
      const [cases, reports] = await Promise.all([
        api.request<Page<CaseItem>>(`/cases?${params.toString()}`),
        api.request<Page<QualifiedReport>>('/cases/qualified-reports?page=1&pageSize=100'),
      ]);
      setData(cases);
      setAvailableReports(reports.items);
      setSelectedReport((current) =>
        reports.items.some((report) => report.idSignalement === current)
          ? current
          : (reports.items[0]?.idSignalement ?? ''),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les dossiers.');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || !selectedReport) return;
    if (summary.trim() && summary.trim().length < 10) {
      setError('Le résumé doit contenir au moins 10 caractères.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await api.request<{ idDossier: string }>(
        `/cases/from-reports/${selectedReport}`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...(summary.trim() ? { descriptionSynthese: summary.trim() } : {}),
            priorite: priority,
          }),
        },
      );
      navigate(`/dossiers/${created.idDossier}`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'La création du dossier a échoué.';
      await load();
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const selectedSource =
    availableReports.find((report) => report.idSignalement === selectedReport) ?? null;
  const filteredCases = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr-FR');
    if (!query || !data) return data?.items ?? [];
    return data.items.filter((item) =>
      [
        item.referenceDossier,
        item.descriptionSynthese,
        ...item.contenus.map(
          (content) => content.typeDechet.libelle + ' ' + content.typeDechet.codeType,
        ),
      ]
        .join(' ')
        .toLocaleLowerCase('fr-FR')
        .includes(query),
    );
  }, [data, search]);

  const openCount = data?.items.filter((item) => item.statutDossier !== 'CLOTURE').length ?? 0;
  const closedCount = data?.items.filter((item) => item.statutDossier === 'CLOTURE').length ?? 0;

  return (
    <div className="case-workspace">
      <header className="case-workspace__hero">
        <div>
          <span className="case-workspace__eyebrow">PILOTAGE OPÉRATIONNEL</span>
          <h1>Dossiers de traitement</h1>
          <p>
            Transformez les signalements qualifiés en dossiers suivis, puis pilotez leur prise en
            charge jusqu’à la clôture.
          </p>
        </div>
        <div className="case-workspace__hero-stamp">
          <span aria-hidden="true">▤</span>
          <div>
            <strong>{data ? data.total : '—'}</strong>
            <small>Dossiers au total</small>
          </div>
        </div>
      </header>

      {error ? (
        <div className="case-workspace__error">
          <FeedbackBanner tone="error">{error}</FeedbackBanner>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="workflow-button workflow-button--secondary"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      <section className="case-workspace__create">
        <div className="case-workspace__create-heading">
          <div>
            <span className="case-workspace__section-eyebrow">NOUVEAU DOSSIER</span>
            <h2>Créer à partir d’un signalement qualifié</h2>
            <p>
              Un signalement source est nécessaire. Vous pourrez ensuite compléter le dossier et y
              rattacher d’autres signalements.
            </p>
          </div>
          <span className="case-workspace__available">{availableReports.length} disponible(s)</span>
        </div>

        {availableReports.length ? (
          <form
            onSubmit={(event) => void createCase(event)}
            className="case-workspace__create-form"
          >
            <div className="case-workspace__create-fields">
              <label className="case-workspace__field case-workspace__field--source">
                <span>Signalement source</span>
                <select
                  value={selectedReport}
                  onChange={(event) => setSelectedReport(event.target.value)}
                  required
                >
                  <option value="">Sélectionner un signalement</option>
                  {availableReports.map((report) => (
                    <option key={report.idSignalement} value={report.idSignalement}>
                      {personName(report)} · {report.idSignalement.slice(0, 8).toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <label className="case-workspace__field">
                <span>Priorité initiale</span>
                <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                  {['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'].map((value) => (
                    <option key={value} value={value}>
                      {stateLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="case-workspace__field case-workspace__field--summary">
                <span>
                  Synthèse <small>Facultative · 10 caractères minimum si renseignée</small>
                </span>
                <input
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  minLength={10}
                  maxLength={5000}
                  placeholder="Résumez le contexte opérationnel…"
                />
              </label>
              <button
                type="submit"
                disabled={!selectedReport || creating}
                className="workflow-button workflow-button--primary case-workspace__create-submit"
              >
                {creating ? 'Création…' : 'Créer le dossier'} <span aria-hidden="true">→</span>
              </button>
            </div>

            {selectedSource ? (
              <div className="case-workspace__source-preview">
                <span className="case-workspace__source-icon" aria-hidden="true">
                  ↳
                </span>
                <div>
                  <strong>Signalement sélectionné · {personName(selectedSource)}</strong>
                  <p>{selectedSource.description || 'Aucune description fournie.'}</p>
                  <div>
                    {selectedSource.contenus.map((content) => (
                      <span key={content.idTypeDechet}>{content.typeDechet.libelle}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </form>
        ) : (
          <div className="case-workspace__no-source">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>Aucun signalement à convertir</strong>
              <p>
                Les signalements qualifiés disponibles apparaîtront ici lorsqu’ils seront prêts à
                être rattachés à un dossier.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="case-workspace__list">
        <div className="case-workspace__list-heading">
          <div>
            <span className="case-workspace__section-eyebrow">SUIVI OPÉRATIONNEL</span>
            <h2>Dossiers existants</h2>
            <p>
              {data
                ? `${data.total} dossier(s) · ${data.items.length} affiché(s) sur cette page`
                : 'Chargement…'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="workflow-button workflow-button--secondary"
          >
            {loading ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>

        <div className="case-workspace__filters">
          <label className="case-workspace__field case-workspace__field--search">
            <span>Rechercher sur cette page</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Référence, synthèse ou type de déchet…"
            />
          </label>
          <label className="case-workspace__field">
            <span>État du dossier</span>
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value);
              }}
            >
              <option value="">Tous les états</option>
              <option value="OUVERT">Ouvert</option>
              <option value="EN_COURS">En cours</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="CLOTURE">Clôturé</option>
            </select>
          </label>
          <div className="case-workspace__filter-count">
            <strong>{filteredCases.length}</strong>
            <span>résultat(s)</span>
          </div>
        </div>

        <div className="case-workspace__quick-counts">
          <span>
            <i className="is-open" /> {openCount} ouvert(s) sur cette page
          </span>
          <span>
            <i className="is-closed" /> {closedCount} clôturé(s) sur cette page
          </span>
        </div>

        {loading && !data ? (
          <div className="case-workspace__state" role="status">
            <span className="workflow-state__spinner" />
            <strong>Chargement des dossiers</strong>
          </div>
        ) : null}
        {!loading && data?.items.length === 0 ? (
          <div className="case-workspace__state">
            <strong>Aucun dossier pour ce filtre</strong>
            <p>Modifiez le filtre d’état pour afficher d’autres dossiers.</p>
          </div>
        ) : null}
        {!loading && (data?.items.length ?? 0) > 0 && filteredCases.length === 0 ? (
          <div className="case-workspace__state">
            <strong>Aucun résultat pour cette recherche</strong>
            <p>Essayez une autre référence ou un autre terme.</p>
            <button type="button" onClick={() => setSearch('')}>
              Effacer la recherche
            </button>
          </div>
        ) : null}

        <div className="case-workspace__items">
          {filteredCases.map((item) => (
            <Link
              key={item.idDossier}
              to={`/dossiers/${item.idDossier}`}
              className="case-workspace-card"
            >
              <div className="case-workspace-card__top">
                <div>
                  <span className="case-workspace-card__reference">DOSSIER</span>
                  <h3>{item.referenceDossier}</h3>
                </div>
                <div className="case-workspace-card__badges">
                  <StatusBadge
                    label={stateLabel(item.statutDossier)}
                    tone={caseStatusTone(item.statutDossier)}
                  />
                  <StatusBadge
                    label={'Priorité ' + stateLabel(item.priorite)}
                    tone={priorityTone(item.priorite)}
                  />
                </div>
              </div>
              <p className="case-workspace-card__summary">
                {item.descriptionSynthese || 'Aucune synthèse renseignée.'}
              </p>
              <div className="case-workspace-card__footer">
                <span>{formatDate(item.dateCreationDossier)}</span>
                <span>{item.nombreSignalements} signalement(s)</span>
                <span>{item.contenus.length} contenu(s)</span>
                <span className="case-workspace-card__open">
                  Ouvrir le dossier <b aria-hidden="true">→</b>
                </span>
              </div>
              {item.contenus.length ? (
                <div className="case-workspace-card__tags">
                  {item.contenus.slice(0, 4).map((content) => (
                    <span key={content.idTypeDechet}>{content.typeDechet.libelle}</span>
                  ))}
                  {item.contenus.length > 4 ? <span>+{item.contenus.length - 4}</span> : null}
                </div>
              ) : null}
            </Link>
          ))}
        </div>

        {data && data.total > data.pageSize ? (
          <div className="case-workspace__pagination">
            <span>
              Page {page} sur {totalPages}
            </span>
            <div>
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || loading}
                className="workflow-button workflow-button--secondary"
              >
                Précédent
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page >= totalPages || loading}
                className="workflow-button workflow-button--secondary"
              >
                Suivant
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
