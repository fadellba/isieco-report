import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

interface Attachment {
  idRattachement: string;
  idSignalement: string;
  dateFinRattachement: string | null;
  dateDebutRattachement: string;
  typeRattachement: string;
  motif: string | null;
  signalement: { idSignalement: string; dateSoumission: string | null; description: string | null; statutSignalement: string };
}
interface CaseDetail {
  idDossier: string;
  referenceDossier: string;
  descriptionSynthese: string;
  dateCreationDossier: string;
  statutDossier: string;
  priorite: string;
  idCommune: string | null;
  latitude: string | null;
  longitude: string | null;
  precisionLocalisation: string | null;
  descriptionLocalisation: string | null;
  dateCloture: string | null;
  contenus: Array<{ idTypeDechet: string; etatContenuDossier: string; etatPriseEnCharge: string; typeDechet: { codeType: string; libelle: string } }>;
  rattachements: Attachment[];
  historiquesPriorite: Array<{ priorite: string; dateDefinition: string; justification: string }>;
  historiquesLocalisation: Array<{ dateModification: string; motif: string; latitude: string | null; longitude: string | null; descriptionLocalisation: string | null }>;
}
interface AvailableReport {
  idSignalement: string;
  description: string | null;
  utilisateur: { nom: string; prenom: string | null };
  qualifications: Array<{ idTypeDechet: string; typeDechet: { libelle: string } }>;
}
function errorText(reason: unknown) { return reason instanceof Error ? reason.message : 'Une erreur inattendue est survenue.'; }
function dateLabel(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function CaseDetailPage() {
  const { idDossier } = useParams();
  const [item, setItem] = useState<CaseDetail | null>(null);
  const [available, setAvailable] = useState<AvailableReport[]>([]);
  const [selectedReport, setSelectedReport] = useState('');
  const [priority, setPriority] = useState('NORMALE');
  const [priorityReason, setPriorityReason] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [precision, setPrecision] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [locationReason, setLocationReason] = useState('');
  const [attachReason, setAttachReason] = useState('');
  const [detachReasons, setDetachReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idDossier) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, reports] = await Promise.all([
        api.request<CaseDetail>(`/cases/${idDossier}`),
        api.request<{ items: AvailableReport[] }>('/cases/qualified-reports?page=1&pageSize=100'),
      ]);
      setItem(detail);
      setPriority(detail.priorite);
      setLatitude(detail.latitude ?? '');
      setLongitude(detail.longitude ?? '');
      setPrecision(detail.precisionLocalisation ?? '');
      setLocationDescription(detail.descriptionLocalisation ?? '');
      setAvailable(reports.items);
      setSelectedReport((current) => current || reports.items[0]?.idSignalement || '');
    } catch (reason) {
      setItem(null);
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  }, [idDossier]);

  useEffect(() => { void load(); }, [load]);

  async function mutate(success: string, operation: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await operation();
      setNotice(success);
      await load();
    } catch (reason) {
      const message = errorText(reason);
      await load();
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function changePriority(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idDossier) return;
    await mutate('La priorité et son historique ont été mis à jour.', () =>
      api.request(`/cases/${idDossier}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priorite: priority, justification: priorityReason.trim() }),
      }),
    );
    setPriorityReason('');
  }

  async function changeLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idDossier) return;
    if ((latitude.trim() === '') !== (longitude.trim() === '')) {
      setError('Latitude et longitude doivent être renseignées ensemble.');
      return;
    }
    await mutate('La localisation et son historique ont été mis à jour.', () =>
      api.request(`/cases/${idDossier}/location`, {
        method: 'PATCH',
        body: JSON.stringify({
          latitude: latitude.trim() ? Number(latitude) : null,
          longitude: longitude.trim() ? Number(longitude) : null,
          precisionLocalisation: latitude.trim() && longitude.trim() && precision.trim() ? Number(precision) : null,
          descriptionLocalisation: locationDescription.trim() || null,
          motif: locationReason.trim(),
        }),
      }),
    );
    setLocationReason('');
  }

  async function attach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idDossier || !selectedReport) return;
    await mutate('Le signalement a été rattaché au dossier.', () =>
      api.request(`/cases/${idDossier}/reports/${selectedReport}/attach`, {
        method: 'POST',
        body: JSON.stringify({ ...(attachReason.trim() ? { motif: attachReason.trim() } : {}) }),
      }),
    );
    setAttachReason('');
  }

  async function detach(idSignalement: string) {
    if (!idDossier) return;
    const motif = detachReasons[idSignalement]?.trim() ?? '';
    if (motif.length < 5) {
      setError('Le motif de détachement doit contenir au moins 5 caractères.');
      return;
    }
    await mutate('Le rattachement a été clôturé et sa provenance historisée.', () =>
      api.request(`/cases/${idDossier}/reports/${idSignalement}/detach`, {
        method: 'POST',
        body: JSON.stringify({ motif }),
      }),
    );
  }

  if (loading && !item) return <p className="text-sm text-slate-500">Chargement du dossier…</p>;
  if (!item) return <div className="space-y-4"><Link to="/dossiers" className="text-sm font-semibold text-eco-700">← Retour aux dossiers</Link><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error || 'Dossier introuvable.'}</p></div>;
  const activeAttachments = item.rattachements.filter((entry) => entry.dateFinRattachement === null);
  const editable = item.statutDossier !== 'CLOTURE';

  return (
    <div className="space-y-6">
      <Link to="/dossiers" className="text-sm font-semibold text-eco-700 hover:underline">← Retour aux dossiers</Link>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-eco-200 bg-eco-50 px-4 py-3 text-sm text-eco-900">{notice}</div> : null}
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Dossier de traitement</p>
        <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{item.referenceDossier}</h1><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{item.statutDossier}</span><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{item.priorite}</span></div>
        <p className="mt-2 text-sm text-slate-600">{item.descriptionSynthese}</p>
        <p className="mt-1 text-xs text-slate-400">Créé le {dateLabel(item.dateCreationDossier)}{item.dateCloture ? ` · Clôturé le ${dateLabel(item.dateCloture)}` : ''}</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Contenus à traiter</h2>
          <div className="mt-3 space-y-2">{item.contenus.map((content) => <div key={content.idTypeDechet} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 px-3 py-3"><span className="text-sm font-semibold">{content.typeDechet.libelle}</span><span className="text-xs text-slate-500">{content.etatContenuDossier} · {content.etatPriseEnCharge}</span></div>)}</div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Historique des priorités</h2>
          <div className="mt-3 space-y-2">{item.historiquesPriorite.map((entry, index) => <div key={`${entry.dateDefinition}-${index}`} className="rounded-xl bg-slate-50 p-3"><div className="flex justify-between gap-2"><span className="text-sm font-bold">{entry.priorite}</span><span className="text-xs text-slate-400">{dateLabel(entry.dateDefinition)}</span></div><p className="mt-1 text-xs text-slate-600">{entry.justification}</p></div>)}{!item.historiquesPriorite.length ? <p className="text-sm text-slate-500">Aucun changement historisé.</p> : null}</div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-slate-900">Signalements rattachés</h2><span className="text-xs text-slate-500">{activeAttachments.length} actif(s)</span></div>
        <div className="mt-3 space-y-3">{item.rattachements.map((attachment) => <article key={attachment.idRattachement} className="rounded-xl border border-slate-100 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold text-slate-700">{attachment.typeRattachement} · {attachment.idSignalement.slice(0, 8)}</span><span className="text-[11px] text-slate-400">{attachment.dateFinRattachement ? `Détaché le ${dateLabel(attachment.dateFinRattachement)}` : 'Rattachement actif'}</span></div>
          <p className="mt-2 text-sm text-slate-600">{attachment.signalement.description || 'Aucune description.'}</p>
          {attachment.dateFinRattachement === null && editable ? <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={detachReasons[attachment.idSignalement] ?? ''} onChange={(event) => setDetachReasons((current) => ({ ...current, [attachment.idSignalement]: event.target.value }))} maxLength={2000} placeholder="Motif obligatoire du détachement" className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs" /><button type="button" onClick={() => void detach(attachment.idSignalement)} disabled={busy} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40">Détacher</button></div> : null}
        </article>)}</div>
        {editable ? <form onSubmit={(event) => void attach(event)} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="text-xs font-bold text-slate-600">Signalement à rattacher<select value={selectedReport} onChange={(event) => setSelectedReport(event.target.value)} required disabled={!available.length} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">{available.map((report) => <option key={report.idSignalement} value={report.idSignalement}>{report.utilisateur.prenom ? `${report.utilisateur.prenom} ${report.utilisateur.nom}` : report.utilisateur.nom} · {report.idSignalement.slice(0, 8)}</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">Motif facultatif<input value={attachReason} onChange={(event) => setAttachReason(event.target.value)} maxLength={2000} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
          <div className="flex items-end"><button type="submit" disabled={!selectedReport || busy} className="w-full rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Rattacher</button></div>
        </form> : null}
        {!available.length && editable ? <p className="mt-3 text-xs text-slate-500">Aucun autre signalement qualifié non rattaché n'est disponible.</p> : null}
      </section>

      {editable ? <section className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={(event) => void changePriority(event)} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Modifier la priorité</h2>
          <label className="mt-3 block text-xs font-bold text-slate-600">Nouvelle priorité<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal">{['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label className="mt-3 block text-xs font-bold text-slate-600">Justification obligatoire<textarea required minLength={5} maxLength={2000} rows={3} value={priorityReason} onChange={(event) => setPriorityReason(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
          <button type="submit" disabled={busy} className="mt-3 rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Enregistrer</button>
        </form>
        <form onSubmit={(event) => void changeLocation(event)} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Modifier la localisation</h2>
          <p className="mt-1 text-xs text-slate-500">Pour retirer les coordonnées, laissez latitude et longitude vides.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600">Latitude<input type="number" min="-90" max="90" step="0.000001" value={latitude} onChange={(event) => setLatitude(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
            <label className="text-xs font-bold text-slate-600">Longitude<input type="number" min="-180" max="180" step="0.000001" value={longitude} onChange={(event) => setLongitude(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
          </div>
          <label className="mt-3 block text-xs font-bold text-slate-600">Précision (m)<input type="number" min="0" max="100000" step="0.01" value={precision} onChange={(event) => setPrecision(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
          <label className="mt-3 block text-xs font-bold text-slate-600">Description du lieu<input maxLength={1000} value={locationDescription} onChange={(event) => setLocationDescription(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
          <label className="mt-3 block text-xs font-bold text-slate-600">Motif obligatoire<textarea required minLength={5} maxLength={2000} rows={2} value={locationReason} onChange={(event) => setLocationReason(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
          <button type="submit" disabled={busy} className="mt-3 rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Enregistrer</button>
        </form>
      </section> : <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Ce dossier est clôturé et consultable en lecture seule.</p>}
    </div>
  );
}
