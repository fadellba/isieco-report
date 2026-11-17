import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { FeedbackBanner, StatusBadge, type StatusTone } from '../../components/StatusBadge';

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
  if (!value) return 'Non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Non renseignée'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function statusTone(status: string): StatusTone {
  if (['CLOTURE', 'TERMINE', 'TERMINEE', 'VALIDE'].includes(status)) return 'success';
  if (['EN_COURS', 'ACTIVE', 'OUVERT'].includes(status)) return 'info';
  if (['ANNULE', 'ANNULEE', 'REJETE', 'REFUSE'].includes(status)) return 'danger';
  if (['EN_ATTENTE', 'A_TRAITER'].includes(status)) return 'warning';
  return 'neutral';
}
function stateLabel(value: string) {
  return value.replaceAll('_', ' ').toLowerCase();
}
function personName(report: Pick<Signalement, 'utilisateur'> | AvailableReport) {
  return report.utilisateur.prenom
    ? report.utilisateur.prenom + ' ' + report.utilisateur.nom
    : report.utilisateur.nom;
}

export function CaseDetailPage() {
  const { idDossier } = useParams();
  const [item, setItem] = useState<CaseDetail | null>(null);
  const [available, setAvailable] = useState<AvailableReport[]>([]);
  const [selectedReport, setSelectedReport] = useState('');
  const [associationMotif, setAssociationMotif] = useState('');
  const [priority, setPriority] = useState('NORMALE');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [precision, setPrecision] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!idDossier) {
      setError('La référence du dossier est absente.');
      setLoading(false);
      return;
    }
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
      setSelectedReport((current) =>
        reports.items.some((report) => report.idSignalement === current)
          ? current
          : (reports.items[0]?.idSignalement ?? ''),
      );
    } catch (reason) {
      setItem(null);
      setError(errorText(reason));
    } finally {
      setLoading(false);
    }
  }, [idDossier]);

  useEffect(() => {
    void load();
  }, [load]);

  async function mutate(success: string, operation: () => Promise<unknown>) {
    if (busy) return;
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
    const accuracy = precision.trim() ? Number(precision) : null;
    if ((lat === null) !== (lon === null)) {
      setError('Latitude et longitude doivent être renseignées ensemble.');
      return;
    }
    if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
      setError('La latitude doit être comprise entre -90 et 90.');
      return;
    }
    if (lon !== null && (!Number.isFinite(lon) || lon < -180 || lon > 180)) {
      setError('La longitude doit être comprise entre -180 et 180.');
      return;
    }
    if (
      accuracy !== null &&
      (lat === null || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000)
    ) {
      setError(
        'La précision doit être comprise entre 0 et 100000 mètres et nécessite des coordonnées.',
      );
      return;
    }
    await mutate('Localisation du dossier mise à jour.', () =>
      api.request(`/cases/${idDossier}/location`, {
        method: 'PATCH',
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          precisionLocalisation: accuracy,
          descriptionLocalisation: locationDescription.trim() || null,
        }),
      }),
    );
  }

  async function attach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idDossier || !selectedReport) return;
    if (associationMotif.trim().length < 5) {
      setError('Un motif d’au moins 5 caractères est obligatoire.');
      return;
    }
    await mutate('Signalement associé au dossier.', () =>
      api.request(`/cases/${idDossier}/reports/${selectedReport}/attach`, {
        method: 'POST',
        body: JSON.stringify({ motif: associationMotif.trim() }),
      }),
    );
    setAssociationMotif('');
  }

  async function detach(idSignalement: string) {
    if (!idDossier) return;
    if (associationMotif.trim().length < 5) {
      setError('Un motif d’au moins 5 caractères est obligatoire.');
      return;
    }
    await mutate('Signalement retiré du dossier.', () =>
      api.request(`/cases/${idDossier}/reports/${idSignalement}/detach`, {
        method: 'POST',
        body: JSON.stringify({ motif: associationMotif.trim() }),
      }),
    );
    setAssociationMotif('');
  }

  if (loading && !item) {
    return (
      <section className="workflow-state" role="status" aria-live="polite">
        <span className="workflow-state__spinner" aria-hidden="true" />
        <h1>Ouverture du dossier</h1>
        <p>Chargement des informations, des contenus et des signalements associés.</p>
      </section>
    );
  }

  if (!item) {
    return (
      <section className="workflow-state workflow-state--error">
        <span className="workflow-state__icon" aria-hidden="true">
          !
        </span>
        <h1>Dossier indisponible</h1>
        <p>{error || 'Ce dossier est introuvable ou ne peut pas être affiché.'}</p>
        <div className="workflow-state__actions">
          <button
            type="button"
            onClick={() => void load()}
            className="workflow-button workflow-button--primary"
          >
            Réessayer
          </button>
          <Link to="/dossiers" className="workflow-button workflow-button--secondary">
            Retour aux dossiers
          </Link>
        </div>
      </section>
    );
  }

  const editable = item.statutDossier !== 'CLOTURE';
  const mapUrl =
    item.latitude && item.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.latitude + ',' + item.longitude)}`
      : null;

  return (
    <div className="case-detail">
      <div className="case-detail__topline">
        <Link to="/dossiers" className="workflow-back-link">
          <span aria-hidden="true">←</span> Tous les dossiers
        </Link>
        <span className="case-detail__topline-note">DOSSIER OPÉRATIONNEL</span>
      </div>

      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}
      {notice ? <FeedbackBanner tone="success">{notice}</FeedbackBanner> : null}

      <header className="case-detail__hero">
        <div className="case-detail__hero-main">
          <span className="case-detail__eyebrow">RÉFÉRENCE DU DOSSIER</span>
          <h1>{item.referenceDossier}</h1>
          <p>{item.descriptionSynthese || 'Aucune synthèse renseignée.'}</p>
          <div className="case-detail__hero-meta">
            <span>Créé le {dateLabel(item.dateCreationDossier)}</span>
            {item.dateCloture ? <span>Clôturé le {dateLabel(item.dateCloture)}</span> : null}
          </div>
        </div>
        <div className="case-detail__hero-status">
          <StatusBadge
            label={stateLabel(item.statutDossier)}
            tone={statusTone(item.statutDossier)}
          />
          <span className={`case-detail__priority is-${item.priorite.toLowerCase()}`}>
            Priorité {stateLabel(item.priorite)}
          </span>
        </div>
      </header>

      <section className="case-detail__metrics" aria-label="Résumé du dossier">
        <article>
          <span>Contenus</span>
          <strong>{item.contenus.length}</strong>
          <small>Types de déchets suivis</small>
        </article>
        <article>
          <span>Signalements</span>
          <strong>{item.signalements.length}</strong>
          <small>Déclarations rattachées</small>
        </article>
        <article>
          <span>Localisation</span>
          <strong>{mapUrl ? 'GPS' : 'À préciser'}</strong>
          <small>{item.descriptionLocalisation || 'Aucun repère renseigné'}</small>
        </article>
      </section>

      <div className="case-detail__columns">
        <div className="case-detail__main">
          <section className="case-detail-panel">
            <div className="case-detail-panel__heading">
              <div>
                <span>01 · PÉRIMÈTRE DU DOSSIER</span>
                <h2>Contenus à traiter</h2>
              </div>
              <span className="case-detail-panel__count">{item.contenus.length}</span>
            </div>
            {!item.contenus.length ? (
              <div className="case-detail-empty">
                Aucun contenu n’est enregistré dans ce dossier.
              </div>
            ) : (
              <div className="case-detail-contents">
                {item.contenus.map((content) => (
                  <article key={content.idContenuDossier} className="case-detail-content">
                    <div className="case-detail-content__top">
                      <div>
                        <strong>{content.typeDechet.libelle}</strong>
                        <span>{content.typeDechet.codeType}</span>
                      </div>
                      <StatusBadge
                        label={stateLabel(content.etatContenuDossier)}
                        tone={statusTone(content.etatContenuDossier)}
                      />
                    </div>
                    <div className="case-detail-content__metrics">
                      <div>
                        <span>Quantité estimée</span>
                        <strong>{content.quantiteEstimee ?? 'Non renseignée'}</strong>
                      </div>
                      <div>
                        <span>Volume estimé</span>
                        <strong>{content.volumeEstime ?? 'Non renseigné'}</strong>
                      </div>
                    </div>
                    <div className="case-detail-content__footer">
                      <span>Prise en charge</span>
                      <StatusBadge
                        label={stateLabel(content.etatPriseEnCharge)}
                        tone={statusTone(content.etatPriseEnCharge)}
                      />
                    </div>
                    {content.remarque ? (
                      <p className="case-detail-content__remark">{content.remarque}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="case-detail-panel">
            <div className="case-detail-panel__heading">
              <div>
                <span>02 · ORIGINE DU DOSSIER</span>
                <h2>Signalements associés</h2>
              </div>
              <span className="case-detail-panel__count">{item.signalements.length}</span>
            </div>

            {item.signalements.length ? (
              <div className="case-detail-reports">
                {item.signalements.map((report) => (
                  <article key={report.idSignalement} className="case-detail-report">
                    <div className="case-detail-report__top">
                      <code>#{report.idSignalement.slice(0, 8).toUpperCase()}</code>
                      <StatusBadge
                        label={stateLabel(report.statutSignalement)}
                        tone={statusTone(report.statutSignalement)}
                      />
                    </div>
                    <p>{report.description || 'Aucune description fournie.'}</p>
                    <div className="case-detail-report__meta">
                      <span>{personName(report)}</span>
                      <span>{dateLabel(report.dateSoumission)}</span>
                    </div>
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => void detach(report.idSignalement)}
                        disabled={busy || associationMotif.trim().length < 5}
                        className="case-detail-report__remove"
                      >
                        Retirer ce signalement
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="case-detail-empty">
                Aucun signalement n’est actuellement rattaché.
              </div>
            )}

            {editable ? (
              <div className="case-detail-association">
                <div className="case-detail-association__heading">
                  <strong>Gérer les rattachements</strong>
                  <span>Un motif est requis pour chaque modification.</span>
                </div>
                <label className="case-detail-label">
                  Motif de l’association ou du retrait
                  <textarea
                    value={associationMotif}
                    onChange={(event) => setAssociationMotif(event.target.value)}
                    minLength={5}
                    maxLength={500}
                    rows={3}
                    placeholder="Expliquez pourquoi ce signalement doit être associé ou retiré…"
                  />
                  <small>{associationMotif.trim().length} / 500 caractères · 5 minimum</small>
                </label>
                <form
                  onSubmit={(event) => void attach(event)}
                  className="case-detail-association__form"
                >
                  <label className="case-detail-label">
                    Ajouter un signalement qualifié
                    <select
                      value={selectedReport}
                      onChange={(event) => setSelectedReport(event.target.value)}
                      required
                      disabled={!available.length}
                    >
                      <option value="">Sélectionner un signalement</option>
                      {available.map((report) => (
                        <option key={report.idSignalement} value={report.idSignalement}>
                          {personName(report)} · {report.idSignalement.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                    {available.length ? (
                      <small>{available.length} signalement(s) qualifié(s) disponible(s)</small>
                    ) : (
                      <small>Aucun signalement qualifié non associé n’est disponible.</small>
                    )}
                  </label>
                  <button
                    type="submit"
                    disabled={!selectedReport || busy || associationMotif.trim().length < 5}
                    className="workflow-button workflow-button--primary"
                  >
                    Associer au dossier
                  </button>
                </form>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="case-detail-sidebar">
          <section className="case-detail-panel case-detail-location">
            <div className="case-detail-panel__heading">
              <div>
                <span>03 · TERRITOIRE</span>
                <h2>Localisation</h2>
              </div>
            </div>
            <div className="case-detail-location__value">
              <span aria-hidden="true">⌖</span>
              <div>
                <strong>{item.descriptionLocalisation || 'Repère non renseigné'}</strong>
                <p>
                  {mapUrl
                    ? `${item.latitude}, ${item.longitude}`
                    : 'Coordonnées GPS non renseignées'}
                </p>
                {item.precisionLocalisation ? (
                  <small>Précision ±{item.precisionLocalisation} m</small>
                ) : null}
              </div>
            </div>
            {mapUrl ? (
              <a
                className="case-detail-location__map"
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
              >
                Ouvrir dans la carte ↗
              </a>
            ) : null}
          </section>

          <section className="case-detail-panel case-detail-priority">
            <div className="case-detail-panel__heading">
              <div>
                <span>04 · SUIVI</span>
                <h2>Priorité</h2>
              </div>
            </div>
            <StatusBadge
              label={stateLabel(item.priorite)}
              tone={
                item.priorite === 'CRITIQUE' || item.priorite === 'HAUTE' ? 'warning' : 'neutral'
              }
            />
            {editable ? (
              <form onSubmit={(event) => void changePriority(event)} className="case-detail-form">
                <label className="case-detail-label">
                  Niveau de priorité
                  <select value={priority} onChange={(event) => setPriority(event.target.value)}>
                    {['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'].map((value) => (
                      <option key={value} value={value}>
                        {stateLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={busy || priority === item.priorite}
                  className="workflow-button workflow-button--primary"
                >
                  Mettre à jour
                </button>
              </form>
            ) : (
              <p className="case-detail-readonly">
                Le dossier est clôturé. La priorité est consultable en lecture seule.
              </p>
            )}
          </section>

          {editable ? (
            <details
              className="case-detail-panel case-detail-settings"
              open={settingsOpen}
              onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
            >
              <summary>
                <span>
                  <small>PARAMÈTRES AVANCÉS</small>
                  <strong>Modifier la localisation</strong>
                </span>
                <span aria-hidden="true">⌄</span>
              </summary>
              <form onSubmit={(event) => void changeLocation(event)} className="case-detail-form">
                <label className="case-detail-label">
                  Description du lieu
                  <input
                    maxLength={1000}
                    value={locationDescription}
                    onChange={(event) => setLocationDescription(event.target.value)}
                    placeholder="Rue, quartier, repère…"
                  />
                </label>
                <div className="case-detail-coordinate-grid">
                  <label className="case-detail-label">
                    Latitude
                    <input
                      type="number"
                      min="-90"
                      max="90"
                      step="0.000001"
                      value={latitude}
                      onChange={(event) => setLatitude(event.target.value)}
                      placeholder="-90 à 90"
                    />
                  </label>
                  <label className="case-detail-label">
                    Longitude
                    <input
                      type="number"
                      min="-180"
                      max="180"
                      step="0.000001"
                      value={longitude}
                      onChange={(event) => setLongitude(event.target.value)}
                      placeholder="-180 à 180"
                    />
                  </label>
                </div>
                <label className="case-detail-label">
                  Précision (m)
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    step="0.01"
                    value={precision}
                    onChange={(event) => setPrecision(event.target.value)}
                    placeholder="Facultatif"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="workflow-button workflow-button--primary"
                >
                  Enregistrer la localisation
                </button>
              </form>
            </details>
          ) : null}

          {!editable ? (
            <div className="case-detail-closed">
              <StatusBadge label="Dossier clôturé" tone="success" />
              <p>
                Ce dossier est consultable en lecture seule. Les paramètres et rattachements ne
                peuvent plus être modifiés.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
