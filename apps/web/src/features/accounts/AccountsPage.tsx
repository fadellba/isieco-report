import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { FUNCTIONAL_ROLE_CODES, type FunctionalRole, type AuthenticatedProfile } from '@isieco/shared';
import { api } from '../../lib/api';
import { FeedbackBanner, StatusBadge } from '../../components/StatusBadge';

interface AccountListResponse {
  items: AuthenticatedProfile[];
  page: number;
  pageSize: number;
  total: number;
}

type AccountFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'NO_ROLE';

interface PendingRevocation {
  account: AuthenticatedProfile;
  codeRole: FunctionalRole;
}

const PAGE_SIZE = 20;

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

function accountName(account: AuthenticatedProfile): string {
  return account.prenom ? account.prenom + ' ' + account.nom : account.nom;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-FR').trim();
}

function roleTone(role: FunctionalRole): 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
  if (role === 'ADMINISTRATEUR_COMPTES') return 'danger';
  if (role === 'CITOYEN' || role === 'VERIFICATEUR_CLOTURE') return 'info';
  if (role === 'AGENT_TERRAIN') return 'success';
  return 'brand';
}

export function AccountsPage() {
  const [data, setData] = useState<AccountListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, FunctionalRole>>({});
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AccountFilter>('ALL');
  const [pendingRevocation, setPendingRevocation] = useState<PendingRevocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.request<AccountListResponse>('/accounts?page=' + page + '&pageSize=' + PAGE_SIZE);
      setData(result);
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  async function assignRole(event: FormEvent<HTMLFormElement>, account: AuthenticatedProfile) {
    event.preventDefault();
    const assigned = new Set(account.roles.map((role) => role.code));
    const available = FUNCTIONAL_ROLE_CODES.filter((role) => !assigned.has(role));
    const requestedRole = selectedRoles[account.utilisateurId];
    const codeRole = requestedRole && available.includes(requestedRole) ? requestedRole : available[0];

    if (!codeRole) {
      setError('Tous les rôles disponibles sont déjà attribués à ce compte.');
      return;
    }

    setSavingAccount(account.utilisateurId);
    setError(null);
    setNotice(null);
    try {
      await api.request<AuthenticatedProfile>('/accounts/' + account.utilisateurId + '/roles', {
        method: 'POST',
        body: JSON.stringify({
          codeRole,
          motif: motifs[account.utilisateurId]?.trim() || undefined,
        }),
      });
      setNotice('Le rôle ' + codeRole + ' a été attribué au compte ' + account.email + '.');
      await loadAccounts();
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSavingAccount(null);
    }
  }

  async function revokeRole(account: AuthenticatedProfile, codeRole: FunctionalRole) {
    setSavingAccount(account.utilisateurId);
    setError(null);
    setNotice(null);
    try {
      await api.request<AuthenticatedProfile>(
        '/accounts/' + account.utilisateurId + '/roles/' + encodeURIComponent(codeRole),
        { method: 'DELETE' },
      );
      setNotice('Le rôle ' + codeRole + ' a été révoqué pour ' + account.email + '.');
      setPendingRevocation(null);
      await loadAccounts();
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSavingAccount(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const items = data?.items ?? [];
  const activeOnPage = items.filter((account) => account.etatCompte === 'ACTIF').length;
  const withoutRolesOnPage = items.filter((account) => account.roles.length === 0).length;

  const filteredAccounts = useMemo(() => {
    const query = normalize(search);
    return items.filter((account) => {
      const matchesQuery = !query || normalize([
        accountName(account),
        account.email,
        account.utilisateurId,
        ...account.roles.map((role) => role.libelle + ' ' + role.code),
      ].join(' ')).includes(query);
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'ACTIVE' && account.etatCompte === 'ACTIF') ||
        (filter === 'INACTIVE' && account.etatCompte !== 'ACTIF') ||
        (filter === 'NO_ROLE' && account.roles.length === 0);
      return matchesQuery && matchesFilter;
    });
  }, [filter, items, search]);

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-line-subtle bg-white">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-forest">Administration · Accès</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">Comptes et habilitations</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-500">
              Gérez les accès par rôle et contrôlez l’état des comptes. Les autorisations sont toujours vérifiées par l’API ; l’inscription publique ne peut attribuer que le rôle citoyen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadAccounts()} disabled={loading} className="rounded-xl border border-line-strong bg-white px-4 py-2.5 text-sm font-bold text-ink-600 transition hover:bg-surface-base disabled:opacity-50">
              {loading ? 'Actualisation…' : 'Actualiser la liste'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-line-subtle bg-surface-base sm:grid-cols-4">
          <div className="border-b border-r border-line-subtle p-4 sm:border-b-0">
            <p className="text-xs font-semibold text-ink-500">Comptes au total</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{data ? data.total : '—'}</p>
          </div>
          <div className="border-b border-line-subtle p-4 sm:border-b-0 sm:border-r">
            <p className="text-xs font-semibold text-ink-500">Actifs · page courante</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{data ? activeOnPage : '—'}</p>
          </div>
          <div className="border-r border-line-subtle p-4">
            <p className="text-xs font-semibold text-ink-500">Sans rôle · page courante</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{data ? withoutRolesOnPage : '—'}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-ink-500">Sur cette page</p>
            <p className="mt-1 text-2xl font-extrabold text-ink-900">{data ? items.length : '—'}</p>
          </div>
        </div>
      </header>

      {error ? <FeedbackBanner tone="error">{error}<button type="button" onClick={() => void loadAccounts()} className="ml-2 font-bold underline">Réessayer</button></FeedbackBanner> : null}
      {notice ? <FeedbackBanner tone="success">{notice}</FeedbackBanner> : null}

      <section className="overflow-hidden rounded-2xl border border-line-strong bg-white">
        <div className="border-b border-line-subtle p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-ink-900">Annuaire des comptes</h2>
              <p className="mt-1 text-xs text-ink-500">La recherche et les filtres s’appliquent aux {PAGE_SIZE} résultats de la page chargée.</p>
            </div>
            <span className="rounded-full bg-surface-base px-3 py-1.5 text-xs font-bold text-ink-600">{filteredAccounts.length} résultat(s)</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-ink-600">Rechercher un compte</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, e-mail, identifiant ou rôle…" className="w-full rounded-xl border border-line-strong bg-white px-3.5 py-3 text-sm text-ink-800 outline-none transition placeholder:text-ink-400 focus:border-brand-forest focus:ring-2 focus:ring-brand-mist" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-ink-600">Filtrer les comptes</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value as AccountFilter)} className="w-full rounded-xl border border-line-strong bg-white px-3.5 py-3 text-sm text-ink-800 outline-none focus:border-brand-forest focus:ring-2 focus:ring-brand-mist">
                <option value="ALL">Tous les comptes</option>
                <option value="ACTIVE">Comptes actifs</option>
                <option value="INACTIVE">Comptes inactifs</option>
                <option value="NO_ROLE">Sans rôle actif</option>
              </select>
            </label>
          </div>
        </div>

        {loading && !data ? (
          <div className="space-y-3 p-5" aria-live="polite" aria-label="Chargement des comptes">
            {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-surface-base" />)}
          </div>
        ) : null}
        {!loading && data?.items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-bold text-ink-800">Aucun compte enregistré</p>
            <p className="mt-1 text-sm text-ink-500">Les comptes apparaîtront ici après leur création.</p>
          </div>
        ) : null}
        {!loading && data && items.length > 0 && filteredAccounts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-bold text-ink-800">Aucun résultat</p>
            <p className="mt-1 text-sm text-ink-500">Modifiez la recherche ou le filtre de cette page.</p>
            <button type="button" onClick={() => { setSearch(''); setFilter('ALL'); }} className="mt-3 text-sm font-bold text-brand-forest underline">Effacer les filtres</button>
          </div>
        ) : null}

        <div className="divide-y divide-line-subtle">
          {filteredAccounts.map((account) => {
            const assignedRoles = new Set(account.roles.map((role) => role.code));
            const availableRoles = FUNCTIONAL_ROLE_CODES.filter((role) => !assignedRoles.has(role));
            const selected = selectedRoles[account.utilisateurId];
            const selectedAvailable = selected && availableRoles.includes(selected);
            const effectiveSelection = selectedAvailable ? selected : availableRoles[0] ?? '';
            const isPending = pendingRevocation?.account.utilisateurId === account.utilisateurId;

            return (
              <article key={account.utilisateurId} className="grid gap-5 p-5 transition-colors hover:bg-surface-base/40 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.78fr)] xl:p-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-ink-900">{accountName(account)}</h3>
                    <StatusBadge label={account.etatCompte === 'ACTIF' ? 'Actif' : account.etatCompte} tone={account.etatCompte === 'ACTIF' ? 'success' : 'warning'} />
                  </div>
                  <p className="mt-1 break-all text-sm text-ink-500">{account.email}</p>
                  <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-400">Habilitations attribuées</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {account.roles.length ? account.roles.map((role) => (
                      <span key={role.code} className="inline-flex items-center gap-2 rounded-full border border-line-subtle bg-white py-1 pl-3 pr-1.5 shadow-sm">
                        <StatusBadge label={role.libelle} tone={roleTone(role.code)} />
                        <button
                          type="button"
                          onClick={() => setPendingRevocation({ account, codeRole: role.code })}
                          disabled={savingAccount === account.utilisateurId || account.etatCompte !== 'ACTIF'}
                          aria-label={'Préparer la révocation de ' + role.libelle + ' pour ' + account.email}
                          className="grid h-6 w-6 place-items-center rounded-full text-base text-ink-400 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                        >×</button>
                      </span>
                    )) : <span className="text-sm text-ink-400">Aucun rôle actif attribué.</span>}
                  </div>

                  {isPending && pendingRevocation ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alertdialog" aria-label="Confirmer la révocation du rôle">
                      <p className="text-sm font-bold text-amber-950">Révoquer le rôle « {pendingRevocation.codeRole} » ?</p>
                      <p className="mt-1 text-xs leading-5 text-amber-900">Cette action modifie les habilitations du compte. L’accès correspondant pourra être perdu immédiatement.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => void revokeRole(account, pendingRevocation.codeRole)} disabled={savingAccount === account.utilisateurId} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-50">
                          {savingAccount === account.utilisateurId ? 'Révocation…' : 'Confirmer la révocation'}
                        </button>
                        <button type="button" onClick={() => setPendingRevocation(null)} disabled={savingAccount === account.utilisateurId} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-950">Annuler</button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <form onSubmit={(event) => void assignRole(event, account)} className="rounded-2xl border border-line-subtle bg-surface-base p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-ink-600">Attribuer une habilitation</p>
                    <span className="text-[11px] font-semibold text-ink-400">{availableRoles.length} disponible(s)</span>
                  </div>
                  {availableRoles.length ? (
                    <>
                      <label className="mt-3 block">
                        <span className="mb-1.5 block text-xs font-semibold text-ink-600">Rôle à attribuer</span>
                        <select
                          value={effectiveSelection}
                          onChange={(event) => setSelectedRoles((current) => ({ ...current, [account.utilisateurId]: event.target.value as FunctionalRole }))}
                          disabled={account.etatCompte !== 'ACTIF' || savingAccount === account.utilisateurId}
                          className="w-full rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm text-ink-800 outline-none focus:border-brand-forest focus:ring-2 focus:ring-brand-mist disabled:bg-surface-base"
                        >
                          {availableRoles.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </label>
                      <label className="mt-3 block">
                        <span className="mb-1.5 block text-xs font-semibold text-ink-600">Motif de l’attribution <span className="font-normal text-ink-400">(facultatif)</span></span>
                        <input
                          value={motifs[account.utilisateurId] ?? ''}
                          onChange={(event) => setMotifs((current) => ({ ...current, [account.utilisateurId]: event.target.value }))}
                          maxLength={500}
                          placeholder="Préciser le contexte de l’accès"
                          className="w-full rounded-xl border border-line-strong bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-forest focus:ring-2 focus:ring-brand-mist"
                        />
                      </label>
                      <button type="submit" disabled={savingAccount === account.utilisateurId || account.etatCompte !== 'ACTIF'} className="mt-3 w-full rounded-xl bg-brand-forest px-4 py-2.5 text-sm font-bold text-white transition hover:bg-eco-600 disabled:cursor-not-allowed disabled:opacity-50">
                        {savingAccount === account.utilisateurId ? 'Enregistrement…' : 'Attribuer le rôle'}
                      </button>
                      {account.etatCompte !== 'ACTIF' ? <p className="mt-2 text-xs text-amber-800">Réactivez le compte côté administration avant de modifier ses rôles.</p> : null}
                    </>
                  ) : (
                    <p className="mt-3 rounded-xl border border-line-subtle bg-white p-3 text-sm text-ink-500">Tous les rôles disponibles sont déjà attribués.</p>
                  )}
                </form>
              </article>
            );
          })}
        </div>

        {data ? (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle bg-surface-base px-5 py-4">
            <p className="text-xs text-ink-500">Page {page} sur {totalPages} · {data.total} compte(s) au total</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} className="rounded-xl border border-line-strong bg-white px-4 py-2 text-xs font-bold text-ink-600 disabled:cursor-not-allowed disabled:opacity-40">Précédent</button>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading} className="rounded-xl border border-line-strong bg-white px-4 py-2 text-xs font-bold text-ink-600 disabled:cursor-not-allowed disabled:opacity-40">Suivant</button>
            </div>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
