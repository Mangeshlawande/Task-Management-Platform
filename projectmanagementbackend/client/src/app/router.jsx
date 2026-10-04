import { createBrowserRouter, Link, Navigate } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout.jsx';
import { ProtectedLayout } from '../components/layout/ProtectedLayout.jsx';
import { ProjectLayout } from '../components/layout/ProjectLayout.jsx';
import { RequireAuth, RedirectIfAuthed } from '../components/layout/guards.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage.jsx';
import { SettingsPage } from '../features/settings/SettingsPage.jsx';
import { ProjectsPage } from '../features/projects/ProjectsPage.jsx';
import { ProjectDashboardTab } from '../features/projects/ProjectDashboardTab.jsx';
import { ProjectMembersTab } from '../features/projects/ProjectMembersTab.jsx';
import { ProjectSettingsTab } from '../features/projects/ProjectSettingsTab.jsx';
import { BoardPage } from '../features/board/BoardPage.jsx';
import { NotesPage } from '../features/notes/NotesPage.jsx';

function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-6xl font-bold text-primary">404</p>
        <p className="mt-2 text-muted dark:text-dark-muted">Page not found</p>
        <Link
          to="/projects"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Go to your projects →
        </Link>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <RedirectIfAuthed />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          // Visitors arrive here unauthenticated; verifying signs them in, and
          // <RedirectIfAuthed> then forwards to state.from (or /projects).
          { path: '/verify-email', element: <VerifyEmailPage /> },
          // Reset arrives from an email link while logged out — treat as public.
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password/:resetToken', element: <ResetPasswordPage /> },
          { path: '/', element: <Navigate to="/login" replace /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <ProtectedLayout />,
        children: [
          { path: '/projects', element: <ProjectsPage /> },
          {
            path: '/projects/:projectId',
            element: <ProjectLayout />,
            children: [
              // Index route = Dashboard tab (deep-linkable: /projects/:id)
              { index: true, element: <ProjectDashboardTab /> },
              { path: 'board', element: <BoardPage /> },
              { path: 'notes', element: <NotesPage /> },
              { path: 'members', element: <ProjectMembersTab /> },
              { path: 'settings', element: <ProjectSettingsTab /> },
            ],
          },
          { path: '/settings', element: <SettingsPage /> },
          // P4 workspace-wide notes view can reuse this shell later
          { path: '/notes', element: <Navigate to="/projects" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
