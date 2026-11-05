import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';

interface Signalement {
  idSignalement: string;
  dateSoumission: string | null;
  description: string | null;
  statutSignalement: string;
  utilisateur: { nom: string; prenom: string | null };
}
interface CaseDetail {
  idDossier: string;
  referenceDossier: string;
  descriptionSynthese: string;
  dateCreationDossier: string;
  statutDossier: string;
  priorite: string;
  latitude: string | null;
  longitude: string | null;
  precisionLocalisation: string | null;
  descriptionLocalisation: string | null;
  dateCloture: string | null;
  contenus: Array<{
    idContenuDossier: string;
    idTypeDechet: string;
    quantiteEstimee: string | null;
    volumeEstime: string | null;
    remarque: string | null;
    etatContenuDossier: string;
    etatPriseEnCharge: string;
    typeDechet: { codeType: string; libelle: string };
  }>;
  signalements: Signalement[];
}
interface AvailableReport {
  idSignalement: string;
  description: string | null;
  utilisateur: { nom: string; prenom: string | null };
  contenus: Array<{ idTypeDechet: string; typeDechet: { libelle: string } }>;
}

function errorText(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Une erreur inattendue est survenue.';
}
function dateLabel(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function CaseDetailPage() {
  const { idDossier } = useParams();
  const [item, setItem] = useState<CaseDetail | null>(null);
  const [available, setAvailable] = useState<AvailableReport[]>([]);
  const [selectedReport, setSelectedReport] = useState('');
  const [priority, setPriority] = useState('NORMALE');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [precision, setPrecision] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
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
    await mutate('Priorité du dossier mise à jour.', () =>
      api.request(`/cases/${idDossier}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priorite: priority }),
      }),
    );
  }

  async function changeLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idDossier) return;
    const lat = latitude.trim() ? Number(latitude) : null;
    const lon = longitude.trim() ? Number(longitude) : null;
    if ((lat === null) !== (lon === null)) {
      setError('Latitude et longitude doivent être renseignées ensemble.');
      return;
    }
    await mutate('Localisation du dossier mise à jour.', () =>
      api.request(`/cases/${idDossier}/location`, {
        method: 'PATCH',
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          precisionLocalisation: lat !== null && precision.trim() ? Number(precision) : null,
          descriptionLocalisation: locationDescription.trim() || null,
        }),
      }),
    );
  }

  async function attach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idDossier || !selectedReport) return;
    await mutate('Signalement associé au dossier.', () =>
      api.request(`/cases/${idDossier}/reports/${selectedReport}/attach`, {
        method: 'POST',
      }),
    );
  }

  async function detach(idSignalement: string) {
    if (!idDossier) return;
    await mutate('Signalement retiré du dossier.', () =>
      api.request(`/cases/${idDossier}/reports/${idSignalement}/detach`, { method: 'POST' }),
    );
  }

  if (loading && !item) return <p className="text-sm text-slate-500">Chargement du dossier…</p>;
  if (!item) {
    return (
      <div className="space-y-4">
        <Link to="/dossiers" className="text-sm font-semibold text-eco-700">← Retour aux dossiers</Link>
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error || 'Dossier introuvable.'}</p>
      </div>
    );
  }

  const editable = item.statutDossier !== 'CLOTURE';

  return (
    <div className="space-y-6">
      <Link to="/dossiers" className="text-sm font-semibold text-eco-700 hover:underline">← Retour aux dossiers</Link>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-eco-200 bg-eco-50 px-4 py-3 text-sm text-eco-900">{notice}</div> : null}

      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Dossier de traitement</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{item.referenceDossier}</h1>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{item.statutDossier}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{item.priorite}</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">{item.descriptionSynthese}</p>
        <p className="mt-1 text-xs text-slate-400">Créé le {dateLabel(item.dateCreationDossier)}{item.dateCloture ? ` · Clôturé le ${dateLabel(item.dateCloture)}` : ''}</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Contenus à traiter</h2>
          <div className="mt-3 space-y-2">
            {item.contenus.map((content) => (
              <div key={content.idContenuDossier} className="rounded-xl bg-slate-50 px-3 py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-sm font-semibold">{content.typeDechet.libelle}</span>
                  <span className="text-xs text-slate-500">{content.etatContenuDossier} · {content.etatPriseEnCharge}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Quantité : {content.quantiteEstimee ?? '—'} · Volume : {content.volumeEstime ?? '—'}
                </p>
              </div>
            ))}
            {!item.contenus.length ? <p className="text-sm text-slate-500">Aucun contenu enregistré.</p> : null}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-slate-900">Signalements associés</h2>
            <span className="text-xs text-slate-500">{item.signalements.length} signalement(s)</span>
          </div>
          <div className="mt-3 space-y-3">
            {item.signalements.map((report) => (
              <div key={report.idSignalement} className="rounded-xl border border-slate-100 p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700">#{report.idSignalement.slice(0, 8)}</span>
                  <span className="text-xs text-slate-500">{report.statutSignalement}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{report.description || 'Aucune description.'}</p>
                <p className="mt-1 text-xs text-slate-500">{report.utilisateur.prenom ? report.utilisateur.prenom + ' ' : ''}{report.utilisateur.nom}</p>
                {editable ? (
                  <div className="mt-3">
                    <button type="button" onClick={() => void detach(report.idSignalement)} disabled={busy} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40">Retirer du dossier</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {editable ? (
            <form onSubmit={(event) => void attach(event)} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <label className="block text-xs font-bold text-slate-600">
                Ajouter un signalement qualifié
                <select value={selectedReport} onChange={(event) => setSelectedReport(event.target.value)} required disabled={!available.length} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
                  {available.map((report) => (
                    <option key={report.idSignalement} value={report.idSignalement}>
                      {report.utilisateur.prenom ? report.utilisateur.prenom + ' ' : ''}{report.utilisateur.nom} · {report.idSignalement.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={!selectedReport || busy} className="rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Associer le signalement</button>
              {!available.length ? <p className="text-xs text-slate-500">Aucun signalement qualifié non associé n’est disponible.</p> : null}
            </form>
          ) : null}
        </article>
      </section>

      {editable ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={(event) => void changePriority(event)} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Modifier la priorité</h2>
            <label className="mt-3 block text-xs font-bold text-slate-600">
              Nouvelle priorité
              <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal">
                {['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <button type="submit" disabled={busy} className="mt-3 rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Enregistrer</button>
          </form>

          <form onSubmit={(event) => void changeLocation(event)} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Localisation</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-600">Latitude<input type="number" min="-90" max="90" step="0.000001" value={latitude} onChange={(event) => setLatitude(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-slate-600">Longitude<input type="number" min="-180" max="180" step="0.000001" value={longitude} onChange={(event) => setLongitude(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
            </div>
            <label className="mt-3 block text-xs font-bold text-slate-600">Précision (m)<input type="number" min="0" max="100000" step="0.01" value={precision} onChange={(event) => setPrecision(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Description du lieu<input maxLength={1000} value={locationDescription} onChange={(event) => setLocationDescription(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
            <button type="submit" disabled={busy} className="mt-3 rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Enregistrer</button>
          </form>
        </section>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Ce dossier est clôturé et consultable en lecture seule.</p>
      )}
    </div>
  );
}
