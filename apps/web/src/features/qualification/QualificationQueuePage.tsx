import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { FeedbackBanner, StatusBadge } from '../../components/StatusBadge';
import { ManagementTable } from '../../components/ManagementTable';

interface QueueItem {
  idSignalement: string;
  statutSignalement: string;
  dateSoumission: string | null;
  description: string | null;
  utilisateur: { nom: string; prenom: string | null };
  contenus: Array<{ idTypeDechet: string; typeDechet: { libelle: string; codeType: string } }>;
  demandesComplement: Array<{ idDemande: string; dateDemande: string; etatDemande: string }>;
}
interface QueueResponse {
  items: QueueItem[];
  page: number;
  pageSize: number;
  total: number;
}

function dateLabel(value: string | null) {
  if (!value) return 'Date non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date non renseignée'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function qualificationTone(status: string): 'warning' | 'info' | 'neutral' {
  if (status === 'SOUMIS') return 'warning';
  if (status === 'COMPLEMENT_REPONDU') return 'info';
  return 'neutral';
}

function qualificationLabel(status: string) {
  return status === 'COMPLEMENT_REPONDU'
    ? 'Complément reçu'
    : status === 'SOUMIS'
      ? 'Nouveau'
      : status.replaceAll('_', ' ').toLowerCase();
}

export function QualificationQueuePage() {
  const location = useLocation();
  const [result, setResult] = useState<QueueResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const notice = (location.state as { notice?: string } | null)?.notice;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.request<QueueResponse>(
        `/qualification/queue?page=${page}&pageSize=20`,
      );
      setResult(data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Impossible de charger la file de qualification.',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const newCount = result?.items.filter((item) => item.statutSignalement === 'SOUMIS').length ?? 0;
  const repliesCount =
    result?.items.filter((item) => item.statutSignalement === 'COMPLEMENT_REPONDU').length ?? 0;
  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr-FR');
    if (!query || !result) return result?.items ?? [];
    return result.items.filter((item) => {
      const person = [item.utilisateur.prenom, item.utilisateur.nom].filter(Boolean).join(' ');
      const categories = item.contenus
        .map((content) => content.typeDechet.libelle + ' ' + content.typeDechet.codeType)
        .join(' ');
      const id = item.idSignalement.toLocaleLowerCase('fr-FR');
      return [person, item.description ?? '', categories, id]
        .join(' ')
        .toLocaleLowerCase('fr-FR')
        .includes(query);
    });
  }, [result, search]);

  return (
    <div className="management-page qualification-queue-page">
      <header className="qualification-queue-hero">
        <div>
          <span className="qualification-queue-hero__eyebrow">TRAITEMENT DES SIGNALEMENTS</span>
          <h1>File de qualification</h1>
          <p>
            Examinez les nouveaux signalements et les réponses reçues. Chaque décision est
            enregistrée dans l’historique du dossier.
          </p>
        </div>
        <div className="qualification-queue-hero__note">
          <span className="qualification-queue-hero__note-icon" aria-hidden="true">
            ✓
          </span>
          <span>
            Votre décision
            <br />
            <strong>oriente la suite du traitement</strong>
          </span>
        </div>
      </header>

      {notice ? <FeedbackBanner tone="success">{notice}</FeedbackBanner> : null}
      {error ? (
        <div className="qualification-queue-error">
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

      <section className="qualification-queue-summary" aria-label="Synthèse de la file">
        <article className="qualification-queue-stat qualification-queue-stat--primary">
          <span>À examiner</span>
          <strong>{result ? result.total : '—'}</strong>
          <small>Signalements en attente</small>
        </article>
        <article className="qualification-queue-stat">
          <span>Nouveaux</span>
          <strong>{result ? newCount : '—'}</strong>
          <small>Sur la page affichée</small>
        </article>
        <article className="qualification-queue-stat">
          <span>Compléments reçus</span>
          <strong>{result ? repliesCount : '—'}</strong>
          <small>Sur la page affichée</small>
        </article>
      </section>

      <section className="qualification-queue-panel">
        <div className="qualification-queue-panel__header">
          <div>
            <span className="qualification-panel__eyebrow">VOTRE FILE DE TRAVAIL</span>
            <h2>Signalements à examiner</h2>
            <p>
              {result
                ? `${result.total} élément(s) · ${result.items.length} affiché(s) sur cette page`
                : 'Récupération des signalements…'}
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

        <div className="qualification-queue-toolbar">
          <label className="qualification-queue-search">
            <span>Rechercher sur cette page</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, description, catégorie ou référence…"
            />
          </label>
          <span className="qualification-queue-toolbar__count">
            {filteredItems.length} résultat(s)
          </span>
        </div>

        {loading && !result ? (
          <div className="qualification-queue-loading" role="status">
            <span className="workflow-state__spinner" aria-hidden="true" />
            <strong>Chargement de votre file</strong>
            <span>Les signalements seront affichés ici.</span>
          </div>
        ) : null}

        {!loading && result?.items.length === 0 ? (
          <div className="qualification-queue-empty">
            <span aria-hidden="true">✓</span>
            <strong>Votre file est à jour</strong>
            <p>Aucun signalement ne nécessite actuellement de décision.</p>
          </div>
        ) : null}

        {!loading && (result?.items.length ?? 0) > 0 && filteredItems.length === 0 ? (
          <div className="qualification-queue-empty">
            <span aria-hidden="true">⌕</span>
            <strong>Aucun résultat pour cette recherche</strong>
            <p>Essayez un autre nom, une autre catégorie ou une partie de la référence.</p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="qualification-queue-clear"
            >
              Effacer la recherche
            </button>
          </div>
        ) : null}

        {filteredItems.length ? (
          <ManagementTable
            label="Signalements à qualifier"
            rows={filteredItems}
            rowKey={(item) => item.idSignalement}
            emptyMessage="Aucun signalement à examiner."
            columns={[
              {
                key: 'reference',
                label: 'Référence',
                render: (item) => (
                  <span className="management-table__primary">
                    #{item.idSignalement.slice(0, 8).toUpperCase()}
                  </span>
                ),
              },
              {
                key: 'citizen',
                label: 'Citoyen',
                render: (item) => (
                  <span className="management-table__primary">
                    {item.utilisateur.prenom ? item.utilisateur.prenom + ' ' : ''}{item.utilisateur.nom}
                  </span>
                ),
              },
              {
                key: 'submitted',
                label: 'Soumis le',
                render: (item) => dateLabel(item.dateSoumission),
              },
              {
                key: 'description',
                label: 'Description',
                render: (item) => (
                  <span className="management-table__secondary">
                    {item.description || 'Aucune description fournie.'}
                  </span>
                ),
              },
              {
                key: 'types',
                label: 'Catégories',
                render: (item) =>
                  item.contenus.length
                    ? item.contenus.map((content) => content.typeDechet.libelle).join(', ')
                    : 'À préciser',
              },
              {
                key: 'status',
                label: 'Statut',
                render: (item) => (
                  <StatusBadge
                    label={qualificationLabel(item.statutSignalement)}
                    tone={qualificationTone(item.statutSignalement)}
                  />
                ),
              },
              {
                key: 'actions',
                label: 'Action',
                className: 'text-right',
                render: (item) => (
                  <Link
                    to={`/qualification/${item.idSignalement}`}
                    className="inline-flex items-center rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-800"
                  >
                    Examiner
                  </Link>
                ),
              },
            ]}
          />
        ) : null}

        {result && result.total > result.pageSize ? (
          <div className="qualification-queue-pagination">
            <span>
              Page {page} sur {pages}
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
                onClick={() => setPage((value) => Math.min(pages, value + 1))}
                disabled={page >= pages || loading}
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
