import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './app/ProtectedRoute';

const AppShell = lazy(() => import('./app/AppShell').then(({ AppShell }) => ({ default: AppShell })));
const AccountsPage = lazy(() => import('./features/accounts/AccountsPage').then(({ AccountsPage }) => ({ default: AccountsPage })));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })));
const StatisticsPage = lazy(() => import('./features/statistics/StatisticsPage').then(({ StatisticsPage }) => ({ default: StatisticsPage })));
const QualificationQueuePage = lazy(() => import('./features/qualification/QualificationQueuePage').then(({ QualificationQueuePage }) => ({ default: QualificationQueuePage })));
const QualificationDetailPage = lazy(() => import('./features/qualification/QualificationDetailPage').then(({ QualificationDetailPage }) => ({ default: QualificationDetailPage })));
const CasesPage = lazy(() => import('./features/cases/CasesPage').then(({ CasesPage }) => ({ default: CasesPage })));
const CaseDetailPage = lazy(() => import('./features/cases/CaseDetailPage').then(({ CaseDetailPage }) => ({ default: CaseDetailPage })));
const ReferentialsPage = lazy(() => import('./features/referentials/ReferentialsPage').then(({ ReferentialsPage }) => ({ default: ReferentialsPage })));
const AssignmentsPage = lazy(() => import('./features/assignments/AssignmentsPage').then(({ AssignmentsPage }) => ({ default: AssignmentsPage })));
const InterventionsPage = lazy(() => import('./features/interventions/InterventionsPage').then(({ InterventionsPage }) => ({ default: InterventionsPage })));
const VerificationPage = lazy(() => import('./features/verification/VerificationPage').then(({ VerificationPage }) => ({ default: VerificationPage })));
const AccessDeniedPage = lazy(() => import('./pages/AccessDeniedPage').then(({ AccessDeniedPage }) => ({ default: AccessDeniedPage })));
const DownloadPage = lazy(() => import('./pages/DownloadPage').then(({ DownloadPage }) => ({ default: DownloadPage })));
const SignInPage = lazy(() => import('./pages/SignInPage').then(({ SignInPage }) => ({ default: SignInPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(({ ForgotPasswordPage }) => ({ default: ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(({ ResetPasswordPage }) => ({ default: ResetPasswordPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(({ NotFoundPage }) => ({ default: NotFoundPage })));

export function App() {
  return (
    <Suspense
      fallback={
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-[40vh] items-center justify-center px-4 text-sm font-medium text-slate-500"
        >
          Chargement de l’écran…
        </div>
      }
    >
      <Routes>
        <Route path="/connexion" element={<SignInPage />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
        <Route path="/telecharger" element={<DownloadPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route
            path="statistiques"
            element={
              <ProtectedRoute
                roles={[
                  'AGENT_QUALIFICATION',
                  'RESPONSABLE_TRAITEMENT',
                  'RESPONSABLE_AFFECTATION',
                  'VERIFICATEUR_CLOTURE',
                  'GESTIONNAIRE_REFERENTIEL',
                  'ADMINISTRATEUR_COMPTES',
                ]}
              >
                <StatisticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="administration/comptes"
            element={
              <ProtectedRoute roles={['ADMINISTRATEUR_COMPTES']}>
                <AccountsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="qualification"
            element={
              <ProtectedRoute roles={['AGENT_QUALIFICATION']}>
                <QualificationQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="qualification/:idSignalement"
            element={
              <ProtectedRoute roles={['AGENT_QUALIFICATION']}>
                <QualificationDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="dossiers"
            element={
              <ProtectedRoute roles={['RESPONSABLE_TRAITEMENT']}>
                <CasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="dossiers/:idDossier"
            element={
              <ProtectedRoute roles={['RESPONSABLE_TRAITEMENT']}>
                <CaseDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="affectations"
            element={
              <ProtectedRoute roles={['RESPONSABLE_AFFECTATION']}>
                <AssignmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="verification"
            element={
              <ProtectedRoute roles={['VERIFICATEUR_CLOTURE']}>
                <VerificationPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="interventions"
            element={
              <ProtectedRoute roles={['AGENT_TERRAIN']}>
                <InterventionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="referentiels"
            element={
              <ProtectedRoute roles={['GESTIONNAIRE_REFERENTIEL']}>
                <ReferentialsPage />
              </ProtectedRoute>
            }
          />
          <Route path="acces-refuse" element={<AccessDeniedPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
