import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { FeedbackBanner, StatusBadge } from '../../components/StatusBadge';

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
  volumeEstime: string;
  remarque: string;
}
type QualificationAction = 'accept' | 'supplement' | 'reject';

function dateLabel(value: string | null) {
  if (!value) return 'Non renseignée';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Non renseignée'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusTone(status: string): 'warning' | 'info' | 'neutral' {
  if (status === 'SOUMIS') return 'warning';
  if (status === 'COMPLEMENT_REPONDU') return 'info';
  return 'neutral';
}

function displayStatus(status: string) {
  return status.replaceAll('_', ' ').toLowerCase();
}

const actions: Array<{ value: QualificationAction; label: string; description: string }> = [
  { value: 'accept', label: 'Qualifier', description: 'Retenir les catégories confirmées et transmettre le dossier au traitement.' },
  { value: 'supplement', label: 'Demander un complément', description: 'Demander au citoyen les informations nécessaires avant de poursuivre.' },
  { value: 'reject', label: 'Rejeter', description: 'Clore l’examen par une décision motivée de rejet.' },
];

export function QualificationDetailPage() {
  const { idSignalement } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [contents, setContents] = useState<ContentForm[]>([]);
  const [action, setAction] = useState<QualificationAction>('accept');
  const [motif, setMotif] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idSignalement) {
      setError('La référence du signalement est absente.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.request<ReportDetail>(`/qualification/${idSignalement}`);
      setReport(data);
      setContents(data.contenus.map((item) => ({
        idTypeDechet: item.idTypeDechet,
        selected: true,
        quantiteEstimee: item.quantiteEstimee ?? '',
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
    if (!idSignalement || busy) return;
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
      navigate('/qualification', {
        replace: true,
        state: { notice: 'Le signalement a été qualifié et transmis au traitement.' },
      });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'La décision n’a pas pu être enregistrée.';
      await load();
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !report) {
    return (
      <section className="workflow-state" role="status" aria-live="polite">
        <span className="workflow-state__spinner" aria-hidden="true" />
        <h1>Ouverture du signalement</h1>
        <p>Chargement des informations et des pièces jointes sécurisées.</p>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="workflow-state workflow-state--error">
        <span className="workflow-state__icon" aria-hidden="true">!</span>
        <h1>Signalement indisponible</h1>
        <p>{error || 'Ce signalement est introuvable ou ne peut plus être examiné.'}</p>
        <div className="workflow-state__actions">
          <button type="button" onClick={() => void load()} className="workflow-button workflow-button--primary">Réessayer</button>
          <Link to="/qualification" className="workflow-button workflow-button--secondary">Retour à la file</Link>
        </div>
      </section>
    );
  }

  const citizenName = report.utilisateur.prenom
    ? report.utilisateur.prenom + ' ' + report.utilisateur.nom
    : report.utilisateur.nom;
  const selectedCount = contents.filter((item) => item.selected).length;

  return (
    <div className="qualification-detail">
      <div className="qualification-detail__topline">
        <Link to="/qualification" className="workflow-back-link"><span aria-hidden="true">←</span> File de qualification</Link>
        <span className="qualification-detail__step">EXAMEN · DÉCISION</span>
      </div>

      <header className="qualification-detail__header">
        <div className="qualification-detail__heading">
          <div className="qualification-detail__eyebrow">SIGNALEMENT À EXAMINER</div>
          <h1>{citizenName}</h1>
          <p>Déposé le {dateLabel(report.dateSoumission)}</p>
        </div>
        <div className="qualification-detail__status">
          <StatusBadge label={displayStatus(report.statutSignalement)} tone={statusTone(report.statutSignalement)} />
          <span>Référence <code>{report.idSignalement.slice(0, 8).toUpperCase()}</code></span>
        </div>
      </header>

      {error ? <FeedbackBanner tone="error">{error}</FeedbackBanner> : null}

      <div className="qualification-detail__layout">
        <div className="qualification-detail__context">
          <section className="qualification-panel">
            <div className="qualification-panel__header">
              <div>
                <span className="qualification-panel__eyebrow">01 · CONTEXTE</span>
                <h2>Description du signalement</h2>
              </div>
              <span className="qualification-panel__meta">{dateLabel(report.dateConstat)}</span>
            </div>
            <p className="qualification-detail__description">
              {report.description || 'Le citoyen n’a pas ajouté de description.'}
            </p>
            <div className="qualification-location">
              <div className="qualification-location__icon" aria-hidden="true">⌖</div>
              <div>
                <span>LOCALISATION</span>
                <strong>{report.descriptionLocalisation || 'Repère non renseigné'}</strong>
                <p>
                  {report.latitude && report.longitude
                    ? `GPS : ${report.latitude}, ${report.longitude}${report.precisionLocalisation ? ` · précision ±${report.precisionLocalisation} m` : ''}`
                    : 'Coordonnées GPS non renseignées'}
                </p>
              </div>
              {report.latitude && report.longitude ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(report.latitude + ',' + report.longitude)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="qualification-location__map"
                >
                  Carte ↗
                </a>
              ) : null}
            </div>
          </section>

          <section className="qualification-panel">
            <div className="qualification-panel__header">
              <div>
                <span className="qualification-panel__eyebrow">02 · PIÈCES JOINTES</span>
                <h2>Photos du signalement</h2>
              </div>
              <span className="qualification-panel__count">{report.photos.length}</span>
            </div>
            {!report.photos.length ? (
              <div className="qualification-empty-inline">
                <span aria-hidden="true">▧</span>
                <p>Aucune photo n’a été jointe à ce signalement. La photo est facultative.</p>
              </div>
            ) : (
              <div className="qualification-photos">
                {report.photos.map((photo, index) => (
                  <article key={photo.idPhotoSignalement} className="qualification-photo">
                    {photoUrls[photo.idPhotoSignalement] ? (
                      <a href={photoUrls[photo.idPhotoSignalement]} target="_blank" rel="noreferrer" className="qualification-photo__image-link">
                        <img src={photoUrls[photo.idPhotoSignalement]} alt={photo.description || 'Photo du dépôt signalé'} />
                        <span>Ouvrir ↗</span>
                      </a>
                    ) : (
                      <div className="qualification-photo__unavailable">Photo expirée ou inaccessible</div>
                    )}
                    <div className="qualification-photo__caption">
                      <strong>Photo {index + 1}</strong>
                      <span>{photo.description || 'Sans description'} · {dateLabel(photo.dateAjout)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {report.demandesComplement.length ? (
            <section className="qualification-panel">
              <div className="qualification-panel__header">
                <div>
                  <span className="qualification-panel__eyebrow">03 · HISTORIQUE</span>
                  <h2>Demandes de complément</h2>
                </div>
                <span className="qualification-panel__count">{report.demandesComplement.length}</span>
              </div>
              <div className="qualification-history">
                {report.demandesComplement.map((request) => (
                  <article key={request.idDemande} className="qualification-history__item">
                    <div className="qualification-history__meta">
                      <StatusBadge label={displayStatus(request.etatDemande)} tone={request.etatDemande === 'OUVERTE' ? 'warning' : 'success'} />
                      <time>{dateLabel(request.dateDemande)}</time>
                    </div>
                    <p>{request.motif}</p>
                    {request.reponse ? (
                      <div className="qualification-history__reply">
                        <strong>Réponse du citoyen · {dateLabel(request.reponse.dateReponse)}</strong>
                        <p>{request.reponse.contenu}</p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="qualification-decision">
          <section className="qualification-panel qualification-panel--decision">
            <div className="qualification-panel__header">
              <div>
                <span className="qualification-panel__eyebrow">04 · VOTRE ACTION</span>
                <h2>Décision de qualification</h2>
              </div>
            </div>
            <form onSubmit={(event) => void submit(event)}>
              <div className="qualification-actions" role="group" aria-label="Choisir une décision">
                {actions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={action === item.value}
                    onClick={() => { setAction(item.value); setError(null); }}
                    className={`qualification-action${action === item.value ? ' is-active' : ''}${item.value === 'reject' ? ' is-danger' : ''}`}
                  >
                    <span className="qualification-action__radio" aria-hidden="true" />
                    <span className="qualification-action__copy">
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </button>
                ))}
              </div>

              {action === 'accept' ? (
                <div className="qualification-decision__fields">
                  <div className="qualification-decision__intro">
                    <strong>Catégories à retenir</strong>
                    <span>{selectedCount} / {contents.length} sélectionnée(s)</span>
                  </div>
                  <p className="qualification-decision__hint">Conservez les catégories confirmées et complétez les estimations utiles au traitement.</p>
                  {contents.map((item, index) => {
                    const declared = report.contenus.find((content) => content.idTypeDechet === item.idTypeDechet);
                    return (
                      <article key={item.idTypeDechet} className={`qualification-category${item.selected ? ' is-selected' : ''}`}>
                        <label className="qualification-category__toggle">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(event) => patchContent(index, { selected: event.target.checked })}
                          />
                          <span><strong>{declared?.typeDechet.libelle || declared?.typeDechet.codeType}</strong><small>{declared?.typeDechet.codeType}</small></span>
                        </label>
                        {item.selected ? (
                          <div className="qualification-category__fields">
                            <label>Quantité estimée
                              <input type="number" min="0" step="0.001" inputMode="decimal" value={item.quantiteEstimee} onChange={(event) => patchContent(index, { quantiteEstimee: event.target.value })} placeholder="Non renseignée" />
                            </label>
                            <label>Volume estimé
                              <input type="number" min="0" step="0.001" inputMode="decimal" value={item.volumeEstime} onChange={(event) => patchContent(index, { volumeEstime: event.target.value })} placeholder="Non renseigné" />
                            </label>
                            <label className="qualification-category__remark">Remarque
                              <input maxLength={1000} value={item.remarque} onChange={(event) => patchContent(index, { remarque: event.target.value })} placeholder="Précision facultative" />
                            </label>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                  {!contents.length ? (
                    <div className="qualification-warning">
                      Aucune catégorie n’a été déclarée. Une catégorie doit être disponible avant de pouvoir qualifier ce signalement.
                    </div>
                  ) : null}
                </div>
              ) : (
                <label className="qualification-motive">
                  <span>{action === 'reject' ? 'Motif du rejet' : 'Informations à demander'}</span>
                  <small>{action === 'reject' ? 'Expliquez clairement la raison de la décision.' : 'Indiquez les éléments nécessaires pour poursuivre l’examen.'}</small>
                  <textarea
                    required
                    minLength={5}
                    maxLength={2000}
                    rows={5}
                    value={motif}
                    onChange={(event) => setMotif(event.target.value)}
                    placeholder={action === 'reject' ? 'Expliquez le motif du rejet…' : 'Précisez les informations à compléter…'}
                  />
                  <span className="qualification-motive__count">{motif.trim().length} / 2000 caractères · 5 minimum</span>
                </label>
              )}

              <div className="qualification-decision__footer">
                <p>Votre décision sera enregistrée dans l’historique du signalement.</p>
                <button
                  type="submit"
                  disabled={busy || (action === 'accept' && (!contents.some((item) => item.selected) || !contents.length))}
                  className={`workflow-button workflow-button--primary qualification-submit${action === 'reject' ? ' is-danger' : ''}`}
                >
                  {busy
                    ? 'Enregistrement…'
                    : action === 'accept'
                      ? 'Confirmer la qualification'
                      : action === 'reject'
                        ? 'Confirmer le rejet'
                        : 'Envoyer la demande'}
                </button>
                <Link to="/qualification" className="qualification-decision__cancel">Annuler et revenir à la file</Link>
              </div>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
