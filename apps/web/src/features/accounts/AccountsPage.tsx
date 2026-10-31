import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FUNCTIONAL_ROLE_CODES, type FunctionalRole, type AuthenticatedProfile } from '@isieco/shared';
import { api } from '../../lib/api';

interface AccountListResponse {
  items: AuthenticatedProfile[];
  page: number;
  pageSize: number;
  total: number;
}

const PAGE_SIZE = 20;
const DEFAULT_ROLE: FunctionalRole = 'AGENT_QUALIFICATION';

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}

export function AccountsPage() {
  const [data, setData] = useState<AccountListResponse | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, FunctionalRole>>({});
  const [motifs, setMotifs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.request<AccountListResponse>(`/accounts?page=${page}&pageSize=${PAGE_SIZE}`);
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
    const codeRole = selectedRoles[account.utilisateurId] ?? DEFAULT_ROLE;
    setSavingAccount(account.utilisateurId);
    setError(null);
    setNotice(null);
    try {
      await api.request<AuthenticatedProfile>(`/accounts/${account.utilisateurId}/roles`, {
        method: 'POST',
        body: JSON.stringify({
          codeRole,
          motif: motifs[account.utilisateurId]?.trim() || undefined,
        }),
      });
      setNotice(`Le rôle ${codeRole} a été attribué au compte ${account.email}.`);
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
        `/accounts/${account.utilisateurId}/roles/${encodeURIComponent(codeRole)}`,
        { method: 'DELETE' },
      );
      setNotice(`Le rôle ${codeRole} a été révoqué pour ${account.email}.`);
      await loadAccounts();
    } catch (requestError) {
      setError(messageFromError(requestError));
    } finally {
      setSavingAccount(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-eco-700">Administration</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Comptes et habilitations</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Consultez les comptes et gérez leurs rôles. Les autorisations sont contrôlées par l'API ; l'inscription publique ne peut attribuer que le rôle citoyen.
        </p>
      </header>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-eco-200 bg-eco-50 px-4 py-3 text-sm text-eco-900">{notice}</div> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Comptes enregistrés</h2>
            <p className="mt-1 text-xs text-slate-500">{data ? `${data.total} compte(s)` : 'Chargement du total…'}</p>
          </div>
          <button type="button" onClick={() => void loadAccounts()} disabled={loading} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Actualiser
          </button>
        </div>

        {loading && !data ? <p className="p-6 text-sm text-slate-500">Chargement des comptes…</p> : null}
        {!loading && data?.items.length === 0 ? <p className="p-6 text-sm text-slate-500">Aucun compte sur cette page.</p> : null}

        <div className="divide-y divide-slate-100">
          {data?.items.map((account) => (
            <article key={account.utilisateurId} className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">{account.prenom ? `${account.prenom} ${account.nom}` : account.nom}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${account.etatCompte === 'ACTIF' ? 'bg-eco-50 text-eco-800' : 'bg-amber-50 text-amber-800'}`}>{account.etatCompte}</span>
                </div>
                <p className="mt-1 break-all text-sm text-slate-500">{account.email}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">Rôles actifs</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {account.roles.length ? account.roles.map((role) => (
                    <span key={role.code} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-slate-700">
                      {role.libelle}
                      <button
                        type="button"
                        onClick={() => void revokeRole(account, role.code)}
                        disabled={savingAccount === account.utilisateurId || account.etatCompte !== 'ACTIF'}
                        aria-label={`Révoquer ${role.libelle} pour ${account.email}`}
                        className="grid h-5 w-5 place-items-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-700 disabled:opacity-40"
                      >×</button>
                    </span>
                  )) : <span className="text-xs text-slate-400">Aucun rôle actif</span>}
                </div>
              </div>

              <form onSubmit={(event) => void assignRole(event, account)} className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Attribuer un rôle</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select
                    value={selectedRoles[account.utilisateurId] ?? DEFAULT_ROLE}
                    onChange={(event) => setSelectedRoles((current) => ({
                      ...current,
                      [account.utilisateurId]: event.target.value as FunctionalRole,
                    }))}
                    disabled={account.etatCompte !== 'ACTIF'}
                    className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                    aria-label={`Rôle à attribuer à ${account.email}`}
                  >
                    {FUNCTIONAL_ROLE_CODES.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <button type="submit" disabled={savingAccount === account.utilisateurId || account.etatCompte !== 'ACTIF'} className="rounded-lg bg-eco-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-eco-600 disabled:cursor-not-allowed disabled:opacity-50">
                    {savingAccount === account.utilisateurId ? 'En cours…' : 'Attribuer'}
                  </button>
                </div>
                <input
                  value={motifs[account.utilisateurId] ?? ''}
                  onChange={(event) => setMotifs((current) => ({ ...current, [account.utilisateurId]: event.target.value }))}
                  maxLength={500}
                  placeholder="Motif (facultatif)"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                />
              </form>
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
