import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface AuditEvent {
  idEvenement: string;
  typeEvenement: string;
  dateEvenement: string | null;
  dateEnregistrement: string;
  origine: string;
  idActeur: string | null;
  cible: { type: string; id: string } | null;
}

interface AuditListResponse {
  items: AuditEvent[];
  page: number;
  pageSize: number;
  total: number;
}

const PAGE_SIZE = 20;

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function AuditPage() {
  const [result, setResult] = useState<AuditListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [typeEvenement, setTypeEvenement] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (typeEvenement.trim()) params.set('typeEvenement', typeEvenement.trim());
    if (dateDebut) params.set('dateDebut', new Date(`${dateDebut}T00:00:00.000Z`).toISOString());
    if (dateFin) params.set('dateFin', new Date(`${dateFin}T23:59:59.999Z`).toISOString());

    try {
      const data = await api.request<AuditListResponse>(`/audit/me?${params.toString()}`);
      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  }, [page, typeEvenement, dateDebut, dateFin]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Traçabilité</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Mon activité</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Consultez les événements dont vous êtes l'auteur ou le compte cible. Les détails internes et les snapshots métier ne sont pas exposés.
        </p>
      </header>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-slate-600">
          Type d'événement
          <input value={typeEvenement} onChange={(event) => { setPage(1); setTypeEvenement(event.target.value); }} maxLength={100} placeholder="Ex. ROLE_ATTRIBUE" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Depuis
          <input type="date" value={dateDebut} onChange={(event) => { setPage(1); setDateDebut(event.target.value); }} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Jusqu'au
          <input type="date" value={dateFin} onChange={(event) => { setPage(1); setDateFin(event.target.value); }} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" />
        </label>
        <div className="flex items-end">
          <button type="button" onClick={() => void loadEvents()} disabled={loading} className="w-full rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-eco-600 disabled:opacity-50">Actualiser</button>
        </div>
      </section>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Journal personnel</h2>
            <p className="mt-1 text-xs text-slate-500">{result ? `${result.total} événement(s)` : 'Chargement…'}</p>
          </div>
          {loading ? <span className="text-xs text-slate-400">Actualisation…</span> : null}
        </div>
        {result?.items.length === 0 && !loading ? <p className="p-6 text-sm text-slate-500">Aucun événement ne correspond à ces filtres.</p> : null}
        <div className="divide-y divide-slate-100">
          {result?.items.map((event) => (
            <article key={event.idEvenement} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-slate-800">{event.typeEvenement}</p>
                <p className="mt-1 text-xs text-slate-500">{event.cible ? `${event.cible.type} · ${event.cible.id}` : 'Événement sans cible explicite'}</p>
                <p className="mt-1 text-[11px] text-slate-400">Origine : {event.origine}</p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-semibold text-slate-700">{formatDate(event.dateEnregistrement)}</p>
                <p className="mt-1 text-[11px] text-slate-400">Événement : {formatDate(event.dateEvenement)}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
          <p className="text-xs text-slate-500">Page {page} sur {totalPages}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40">Précédent</button>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-40">Suivant</button>
          </div>
        </div>
      </section>
    </div>
  );
}
