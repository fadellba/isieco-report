import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './app/AppShell';
import { ProtectedRoute } from './app/ProtectedRoute';
import { AccountsPage } from './features/accounts/AccountsPage';
import { AuditPage } from './features/audit/AuditPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { QualificationQueuePage } from './features/qualification/QualificationQueuePage';
import { QualificationDetailPage } from './features/qualification/QualificationDetailPage';
import { CasesPage } from './features/cases/CasesPage';
import { CaseDetailPage } from './features/cases/CaseDetailPage';
import { ReferentialsPage } from './features/referentials/ReferentialsPage';
import { AssignmentsPage } from './features/assignments/AssignmentsPage';
import { InterventionsPage } from './features/interventions/InterventionsPage';
import { VerificationPage } from './features/verification/VerificationPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { DownloadPage } from './pages/DownloadPage';
import { SignInPage } from './pages/SignInPage';

export function App() {
  return (
    <Routes>
      <Route path="/connexion" element={<SignInPage />} />
      <Route path="/telecharger" element={<DownloadPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="administration/comptes" element={
          <ProtectedRoute roles={['ADMINISTRATEUR_COMPTES']}>
            <AccountsPage />
          </ProtectedRoute>
        } />
        <Route path="qualification" element={
          <ProtectedRoute roles={['AGENT_QUALIFICATION']}>
            <QualificationQueuePage />
          </ProtectedRoute>
        } />
        <Route path="qualification/:idSignalement" element={
          <ProtectedRoute roles={['AGENT_QUALIFICATION']}>
            <QualificationDetailPage />
          </ProtectedRoute>
        } />
        <Route path="dossiers" element={
          <ProtectedRoute roles={['RESPONSABLE_TRAITEMENT']}>
            <CasesPage />
          </ProtectedRoute>
        } />
        <Route path="dossiers/:idDossier" element={
          <ProtectedRoute roles={['RESPONSABLE_TRAITEMENT']}>
            <CaseDetailPage />
          </ProtectedRoute>
        } />
        <Route path="affectations" element={
          <ProtectedRoute roles={['RESPONSABLE_AFFECTATION']}>
            <AssignmentsPage />
          </ProtectedRoute>
        } />
        <Route path="interventions" element={
          <ProtectedRoute roles={['AGENT_TERRAIN']}>
            <InterventionsPage />
          </ProtectedRoute>
        } />
        <Route path="verification" element={
          <ProtectedRoute roles={['VERIFICATEUR_CLOTURE']}>
            <VerificationPage />
          </ProtectedRoute>
        } />
        <Route path="referentiels" element={
          <ProtectedRoute roles={['GESTIONNAIRE_REFERENTIEL']}>
            <ReferentialsPage />
          </ProtectedRoute>
        } />
        <Route path="activite" element={<AuditPage />} />
        <Route path="acces-refuse" element={<AccessDeniedPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
