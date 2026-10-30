import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminHomePage } from './pages/AdminHomePage';
import { DownloadPage } from './pages/DownloadPage';
import { SignInPage } from './pages/SignInPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AdminHomePage />} />
      <Route path="/connexion" element={<SignInPage />} />
      <Route path="/telecharger" element={<DownloadPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
