import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

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
  idCommune: string | null;
  contenus: CaseContent[];
  nombreRattachements: number;
}
interface QualifiedReport {
  idSignalement: string;
  dateSoumission: string | null;
  description: string | null;
  utilisateur: { nom: string; prenom: string | null };
  qualifications: Array<{ idTypeDechet: string; typeDechet: { codeType: string; libelle: string } }>;
}
interface Page<T> { items: T[]; page: number; pageSize: number; total: number }
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
}

export function CasesPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<Page<CaseItem> | null>(null);
  const [availableReports, setAvailableReports] = useState<QualifiedReport[]>([]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
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
      setSelectedReport((current) => current || reports.items[0]?.idSignalement || '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les dossiers.');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { void load(); }, [load]);

  async function createCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedReport) return;
    if (summary.trim() && summary.trim().length < 10) {
      setError('Le résumé doit contenir au moins 10 caractères.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await api.request<{ idDossier: string }>(`/cases/from-reports/${selectedReport}`, {
        method: 'POST',
        body: JSON.stringify({
          ...(summary.trim() ? { descriptionSynthese: summary.trim() } : {}),
          priorite: priority,
        }),
      });
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

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Pilotage opérationnel</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Dossiers de traitement</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Constituez des dossiers à partir de signalements qualifiés non encore rattachés et suivez leur prise en charge.</p>
      </header>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-bold text-slate-900">Créer un dossier</h2><p className="mt-1 text-xs text-slate-500">Seuls les signalements qualifiés sans rattachement actif sont proposés.</p></div>
          <span className="rounded-full bg-eco-50 px-3 py-1 text-xs font-bold text-eco-800">{availableReports.length} disponible(s)</span>
        </div>
        <form onSubmit={(event) => void createCase(event)} className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_150px_minmax(0,1fr)_auto]">
          <label className="text-xs font-bold text-slate-600">Signalement source
            <select value={selectedReport} onChange={(event) => setSelectedReport(event.target.value)} required disabled={!availableReports.length} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
              {availableReports.map((report) => <option key={report.idSignalement} value={report.idSignalement}>{report.utilisateur.prenom ? `${report.utilisateur.prenom} ${report.utilisateur.nom}` : report.utilisateur.nom} · {report.idSignalement.slice(0, 8)}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Priorité
            <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">{['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'].map((value) => <option key={value}>{value}</option>)}</select>
          </label>
          <label className="text-xs font-bold text-slate-600">Résumé facultatif
            <input value={summary} onChange={(event) => setSummary(event.target.value)} minLength={10} maxLength={5000} placeholder="Au moins 10 caractères…" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" />
          </label>
          <div className="flex items-end"><button type="submit" disabled={!selectedReport || creating} className="w-full rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-eco-600 disabled:opacity-50">{creating ? 'Création…' : 'Créer le dossier'}</button></div>
        </form>
        {availableReports.length ? <div className="mt-4 space-y-2">{availableReports.slice(0, 4).map((report) => <div key={report.idSignalement} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="font-semibold">{report.utilisateur.prenom ? `${report.utilisateur.prenom} ${report.utilisateur.nom}` : report.utilisateur.nom}</span> · {report.description || 'Sans description'} · {report.qualifications.map((item) => item.typeDechet.libelle).join(', ')}</div>)}</div> : <p className="mt-3 text-xs text-slate-500">Aucun signalement qualifié non rattaché n'est disponible.</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div><h2 className="font-bold text-slate-900">Dossiers existants</h2><p className="mt-1 text-xs text-slate-500">{data ? `${data.total} dossier(s)` : 'Chargement…'}</p></div>
          <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="">Tous les états</option>{['OUVERT', 'EN_COURS', 'EN_ATTENTE', 'CLOTURE'].map((value) => <option key={value}>{value}</option>)}</select>
        </div>
        {loading && !data ? <p className="p-6 text-sm text-slate-500">Chargement des dossiers…</p> : null}
        {!loading && data?.items.length === 0 ? <p className="p-6 text-sm text-slate-500">Aucun dossier pour ce filtre.</p> : null}
        <div className="divide-y divide-slate-100">{data?.items.map((item) => <Link key={item.idDossier} to={`/dossiers/${item.idDossier}`} className="block p-5 transition hover:bg-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">{item.referenceDossier}</h3><p className="mt-1 text-xs text-slate-500">Créé le {formatDate(item.dateCreationDossier)}</p></div><div className="flex gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{item.statutDossier}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">{item.priorite}</span></div></div>
          <p className="mt-3 text-sm text-slate-600">{item.descriptionSynthese}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>{item.nombreRattachements} rattachement(s)</span><span>·</span><span>{item.contenus.length} catégorie(s)</span>{item.contenus.map((content) => <span key={content.idTypeDechet} className="rounded-full border border-slate-200 px-2 py-1">{content.typeDechet.libelle}</span>)}</div>
        </Link>)}</div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><p className="text-xs text-slate-500">Page {page} sur {totalPages}</p><div className="flex gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Précédent</button><button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages || loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Suivant</button></div></div>
      </section>
    </div>
  );
}
