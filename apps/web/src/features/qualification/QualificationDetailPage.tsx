import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

interface ReportContent {
  idTypeDechet: string;
  quantiteEstimee: string | null;
  volumeEstime: string | null;
  remarque: string | null;
  typeDechet: { codeType: string; libelle: string };
}
interface ReportPhoto {
  idPhotoSignalement: string;
  description: string | null;
  dateAjout: string;
  etatPublication: string;
}
interface Supplement {
  idDemande: string;
  dateDemande: string;
  motif: string;
  etatDemande: string;
  reponse: { dateReponse: string; contenu: string } | null;
}
interface ReportDetail {
  idSignalement: string;
  statutSignalement: string;
  dateConstat: string | null;
  dateSoumission: string | null;
  description: string | null;
  idCommune: string | null;
  latitude: string | null;
  longitude: string | null;
  precisionLocalisation: string | null;
  descriptionLocalisation: string | null;
  utilisateur: { nom: string; prenom: string | null };
  contenus: ReportContent[];
  photos: ReportPhoto[];
  demandesComplement: Supplement[];
}
interface ContentForm {
  idTypeDechet: string;
  selected: boolean;
  quantiteEstimee: string;
  uniteQuantite: string;
  volumeEstime: string;
  remarque: string;
}
function dateLabel(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function QualificationDetailPage() {
  const { idSignalement } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [contents, setContents] = useState<ContentForm[]>([]);
  const [action, setAction] = useState<'accept' | 'supplement' | 'reject'>('accept');
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idSignalement) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.request<ReportDetail>(`/qualification/${idSignalement}`);
      setReport(data);
      setContents(data.contenus.map((item) => ({
        idTypeDechet: item.idTypeDechet,
        selected: true,
        quantiteEstimee: item.quantiteEstimee ?? '',
        uniteQuantite: '',
        volumeEstime: item.volumeEstime ?? '',
        remarque: item.remarque ?? '',
      })));
      const signedUrls = await Promise.all(data.photos.map(async (photo) => {
        try {
          const result = await api.request<{ signedUrl: string }>(
            `/qualification/${idSignalement}/photos/${photo.idPhotoSignalement}/url`,
          );
          return [photo.idPhotoSignalement, result.signedUrl] as const;
        } catch {
          return [photo.idPhotoSignalement, ''] as const;
        }
      }));
      setPhotoUrls(Object.fromEntries(signedUrls.filter(([, url]) => Boolean(url))));
    } catch (reason) {
      setReport(null);
      setError(reason instanceof Error ? reason.message : 'Impossible de charger le signalement.');
    } finally {
      setLoading(false);
    }
  }, [idSignalement]);

  useEffect(() => { void load(); }, [load]);

  function patchContent(index: number, patch: Partial<ContentForm>) {
    setContents((items) => items.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idSignalement) return;
    setBusy(true);
    setError(null);
    try {
      if (action !== 'accept') {
        if (motif.trim().length < 5) {
          setError('Le motif doit contenir au moins 5 caractères.');
          return;
        }
        const route = action === 'reject' ? 'reject' : 'supplements';
        await api.request(`/qualification/${idSignalement}/${route}`, {
          method: 'POST',
          body: JSON.stringify({ motif: motif.trim() }),
        });
        navigate('/qualification', {
          replace: true,
          state: { notice: action === 'reject' ? 'Le signalement a été rejeté.' : 'La demande de complément a été envoyée.' },
        });
        return;
      }

      const selected = contents.filter((item) => item.selected);
      if (!selected.length) {
        setError('Sélectionnez au moins une catégorie retenue.');
        return;
      }
      const payload = selected.map((item) => ({
        idTypeDechet: item.idTypeDechet,
        ...(item.quantiteEstimee.trim() ? { quantiteEstimee: Number(item.quantiteEstimee) } : {}),
        ...(item.uniteQuantite.trim() ? { uniteQuantite: item.uniteQuantite.trim() } : {}),
        ...(item.volumeEstime.trim() ? { volumeEstime: Number(item.volumeEstime) } : {}),
        ...(item.remarque.trim() ? { remarque: item.remarque.trim() } : {}),
      }));
      if (payload.some((item) =>
        ('quantiteEstimee' in item && (!Number.isFinite(item.quantiteEstimee) || item.quantiteEstimee < 0)) ||
        ('volumeEstime' in item && (!Number.isFinite(item.volumeEstime) || item.volumeEstime < 0))
      )) {
        setError('Les quantités et volumes doivent être des nombres positifs ou nuls.');
        return;
      }
      await api.request(`/qualification/${idSignalement}/accept`, {
        method: 'POST',
        body: JSON.stringify({ contenus: payload }),
      });
      navigate('/qualification', { replace: true, state: { notice: 'Le signalement a été qualifié et transmis au traitement.' } });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'La décision n’a pas pu être enregistrée.';
      await load();
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !report) return <p className="text-sm text-slate-500">Chargement du signalement…</p>;
  if (!report) return <div className="space-y-4"><Link to="/qualification" className="text-sm font-semibold text-eco-700">← Retour à la file</Link><div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error || 'Signalement indisponible ou déjà traité.'}</div></div>;

  return (
    <div className="space-y-6">
      <Link to="/qualification" className="text-sm font-semibold text-eco-700 hover:underline">← Retour à la file de qualification</Link>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Examen du signalement</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{report.utilisateur.prenom ? `${report.utilisateur.prenom} ${report.utilisateur.nom}` : report.utilisateur.nom}</h1>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{report.statutSignalement}</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Soumis le {dateLabel(report.dateSoumission)} · {report.idSignalement}</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Description et localisation</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{report.description || 'Aucune description fournie.'}</p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <p><span className="block text-xs font-bold text-slate-400">Commune</span><span className="mt-1 block break-all">{report.idCommune || 'Non renseignée'}</span></p>
            <p><span className="block text-xs font-bold text-slate-400">Coordonnées</span><span className="mt-1 block">{report.latitude && report.longitude ? `${report.latitude}, ${report.longitude}` : 'Non renseignées'}</span></p>
            <p><span className="block text-xs font-bold text-slate-400">Description du lieu</span><span className="mt-1 block">{report.descriptionLocalisation || '—'}</span></p>
            <p><span className="block text-xs font-bold text-slate-400">Précision (m)</span><span className="mt-1 block">{report.precisionLocalisation || '—'}</span></p>
          </div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Photos privées</h2>
          {!report.photos.length ? <p className="mt-3 text-sm text-slate-500">Aucune photo associée.</p> : <div className="mt-3 grid grid-cols-2 gap-3">
            {report.photos.map((photo) => <div key={photo.idPhotoSignalement} className="overflow-hidden rounded-xl border border-slate-200">
              {photoUrls[photo.idPhotoSignalement] ? <a href={photoUrls[photo.idPhotoSignalement]} target="_blank" rel="noreferrer"><img src={photoUrls[photo.idPhotoSignalement]} alt={photo.description || 'Photo du signalement'} className="h-32 w-full object-cover" /></a> : <div className="grid h-32 place-items-center bg-slate-50 px-2 text-center text-xs text-slate-400">Photo expirée ou inaccessible</div>}
              <div className="p-2"><p className="line-clamp-2 text-xs text-slate-600">{photo.description || 'Sans description'}</p><p className="mt-1 text-[10px] text-slate-400">{photo.etatPublication}</p></div>
            </div>)}
          </div>}
        </article>
      </section>

      {report.demandesComplement.length ? <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">Historique des compléments</h2>
        <div className="mt-3 space-y-3">{report.demandesComplement.map((request) => <article key={request.idDemande} className="rounded-xl bg-slate-50 p-4">
          <div className="flex flex-wrap justify-between gap-2"><span className="text-sm font-semibold">{request.etatDemande}</span><span className="text-xs text-slate-400">{dateLabel(request.dateDemande)}</span></div>
          <p className="mt-2 text-sm text-slate-600">{request.motif}</p>
          {request.reponse ? <div className="mt-3 border-l-2 border-eco-500 pl-3"><p className="text-xs font-bold text-eco-800">Réponse citoyenne · {dateLabel(request.reponse.dateReponse)}</p><p className="mt-1 whitespace-pre-wrap text-sm">{request.reponse.contenu}</p></div> : null}
        </article>)}</div>
      </section> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">Décision de qualification</h2>
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {([
              ['accept', 'Accepter et qualifier'],
              ['supplement', 'Demander un complément'],
              ['reject', 'Rejeter'],
            ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setAction(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${action === value ? 'bg-eco-700 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}
          </div>
          {action === 'accept' ? <div className="space-y-3">
            <p className="text-sm text-slate-600">Retenez les catégories déclarées et ajustez les estimations.</p>
            {contents.map((item, index) => {
              const declared = report.contenus.find((content) => content.idTypeDechet === item.idTypeDechet);
              return <article key={item.idTypeDechet} className="rounded-xl border border-slate-200 p-4">
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={item.selected} onChange={(event) => patchContent(index, { selected: event.target.checked })} />{declared?.typeDechet.libelle || declared?.typeDechet.codeType}</label>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-semibold text-slate-600">Quantité<input type="number" min="0" step="0.001" value={item.quantiteEstimee} onChange={(event) => patchContent(index, { quantiteEstimee: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
                  <label className="text-xs font-semibold text-slate-600">Unité<input maxLength={40} value={item.uniteQuantite} onChange={(event) => patchContent(index, { uniteQuantite: event.target.value })} placeholder="kg, sac…" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
                  <label className="text-xs font-semibold text-slate-600">Volume<input type="number" min="0" step="0.001" value={item.volumeEstime} onChange={(event) => patchContent(index, { volumeEstime: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
                </div>
                <label className="mt-3 block text-xs font-semibold text-slate-600">Remarque<input maxLength={1000} value={item.remarque} onChange={(event) => patchContent(index, { remarque: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
              </article>;
            })}
            {!contents.length ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Aucune catégorie n'est déclarée. Une catégorie doit être disponible avant de pouvoir qualifier ce signalement.</p> : null}
          </div> : <label className="block text-xs font-bold text-slate-600">{action === 'reject' ? 'Motif du rejet' : 'Informations à compléter'}<textarea required minLength={5} maxLength={2000} rows={4} value={motif} onChange={(event) => setMotif(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Link to="/qualification" className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Annuler</Link>
            <button type="submit" disabled={busy || (action === 'accept' && !contents.some((item) => item.selected))} className="rounded-lg bg-eco-700 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Enregistrement…' : action === 'accept' ? 'Confirmer la qualification' : action === 'reject' ? 'Confirmer le rejet' : 'Envoyer la demande'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
