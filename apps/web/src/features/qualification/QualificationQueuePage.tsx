import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { FeedbackBanner, StatusBadge } from '../../components/StatusBadge';

interface QueueItem {
  idSignalement: string;
  statutSignalement: string;
  dateSoumission: string | null;
  description: string | null;
  utilisateur: { nom: string; prenom: string | null };
  contenus: Array<{ idTypeDechet: string; typeDechet: { libelle: string; codeType: string } }>;
  demandesComplement: Array<{ idDemande: string; dateDemande: string; etatDemande: string }>;
}
interface QueueResponse { items: QueueItem[]; page: number; pageSize: number; total: number }

function dateLabel(value: string | null) {
  if (!value) return 'Date non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date non renseignée' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function qualificationTone(status: string): 'warning' | 'info' | 'neutral' {
  if (status === 'SOUMIS') return 'warning';
  if (status === 'COMPLEMENT_REPONDU') return 'info';
  return 'neutral';
}

export function QualificationQueuePage() {
  const location = useLocation();
  const [result, setResult] = useState<QueueResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const notice = (location.state as { notice?: string } | null)?.notice;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.request<QueueResponse>(`/qualification/queue?page=${page}&pageSize=20`);
      setResult(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger la file de qualification.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-forest">Traitement des signalements</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900">File de qualification</h1>
        <p className="mt-2 text-sm leading-6 text-ink-500">Examinez les signalements soumis ou ayant reçu une réponse de complément. Les décisions sont contrôlées et historisées par l'API.</p>
      </header>

      {notice ? <FeedbackBanner tone="success">{notice}</FeedbackBanner> : null}
      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}

      <section className="workflow-queue overflow-hidden rounded-2xl border border-line-strong bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
          <div>
            <h2 className="font-bold text-ink-900">Signalements à examiner</h2>
            <p className="mt-1 text-xs text-ink-500">{result ? `${result.total} signalement(s) en attente` : 'Chargement…'}</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="rounded-lg border border-line-strong px-3 py-2 text-xs font-bold text-ink-500 hover:bg-surface-base disabled:opacity-50">Actualiser</button>
        </div>
        {loading && !result ? <p className="p-6 text-sm text-ink-500">Chargement de la file…</p> : null}
        {!loading && result?.items.length === 0 ? <p className="p-6 text-sm text-ink-500">Aucun signalement ne nécessite actuellement de décision.</p> : null}
        <div className="divide-y divide-slate-100">
          {result?.items.map((item) => (
            <article key={item.idSignalement} className="workflow-list-item flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-ink-900">{item.utilisateur.prenom ? `${item.utilisateur.prenom} ${item.utilisateur.nom}` : item.utilisateur.nom}</h3>
                  <StatusBadge label={item.statutSignalement.replaceAll('_', ' ').toLowerCase()} tone={qualificationTone(item.statutSignalement)} />
                </div>
                <p className="mt-1 text-xs text-ink-500">Soumis le {dateLabel(item.dateSoumission)}</p>
                <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-ink-500">{item.description || 'Aucune description fournie.'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.contenus.map((content) => <span key={content.idTypeDechet} className="rounded-full border border-line-strong bg-surface-base px-2.5 py-1 text-[11px] text-ink-500">{content.typeDechet.libelle}</span>)}
                </div>
                {item.demandesComplement[0] ? <p className="mt-2 text-xs text-ink-500">Dernier complément : {item.demandesComplement[0].etatDemande}</p> : null}
              </div>
              <Link to={`/qualification/${item.idSignalement}`} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-forest px-4 py-2.5 text-xs font-bold text-white hover:bg-eco-600">Examiner</Link>
            </article>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-line-subtle px-5 py-4">
          <p className="text-xs text-ink-500">Page {page} sur {pages}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading} className="rounded-lg border border-line-strong px-3 py-2 text-xs font-bold disabled:opacity-40">Précédent</button>
            <button type="button" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page >= pages || loading} className="rounded-lg border border-line-strong px-3 py-2 text-xs font-bold disabled:opacity-40">Suivant</button>
          </div>
        </div>
      </section>
    </div>
  );
}
