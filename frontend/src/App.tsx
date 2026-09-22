import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { BoardPage } from './pages/BoardPage';
import { LoginPage, RegisterPage } from './pages/Gate';
import { HolidaysPage } from './pages/HolidaysPage';
import { LabPage } from './pages/LabPage';
import { PeoplePage } from './pages/PeoplePage';
import { ProjectsPage } from './pages/ProjectsPage';
import { Shell } from './pages/Shell';

function RequireAuth() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="boot">Abrindo a sessão…</div>;
  if (!user) return <Navigate to="/entrar" replace />;
  return <Shell />;
}

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/cadastrar" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route index element={<ProjectsPage />} />
        <Route path="projetos/:projectId" element={<BoardPage />} />
        <Route path="pessoas" element={<PeoplePage />} />
        <Route path="feriados" element={<HolidaysPage />} />
        <Route path="laboratorio" element={<LabPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
