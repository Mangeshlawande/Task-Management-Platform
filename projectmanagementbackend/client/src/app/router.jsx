import { createBrowserRouter, Link } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout.jsx';
import { ProtectedLayout } from '../components/layout/ProtectedLayout.jsx';
import { ProjectLayout } from '../components/layout/ProjectLayout.jsx';
import { RequireAuth, RedirectIfAuthed } from '../components/layout/guards.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { SettingsPage } from '../features/settings/SettingsPage.jsx';
import { ProjectsPage } from '../features/projects/ProjectsPage.jsx';
import { ProjectDashboardTab } from '../features/projects/ProjectDashboardTab.jsx';
import { ProjectDiscussionsTab } from '../features/projects/ProjectDiscussionsTab.jsx';
import { ProjectMembersTab } from '../features/projects/ProjectMembersTab.jsx';
import { ProjectSettingsTab } from '../features/projects/ProjectSettingsTab.jsx';
import { BoardPage } from '../features/board/BoardPage.jsx';
import { NotesPage } from '../features/notes/NotesPage.jsx';
import { LandingPage } from '../features/landing/LandingPage.jsx';
import { DashboardPage } from '../features/dashboard/DashboardPage.jsx';
import { WorkspaceNotesPage } from '../features/notes/WorkspaceNotesPage.jsx';
import { MembersPage } from '../features/members/MembersPage.jsx';
import { ProfilePage } from '../features/profile/ProfilePage.jsx';

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
  { path: '/', element: <LandingPage /> },
  {
    element: <RedirectIfAuthed />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
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
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/projects', element: <ProjectsPage /> },
          {
            path: '/projects/:projectId',
            element: <ProjectLayout />,
            children: [
              // Index route = Dashboard tab (deep-linkable: /projects/:id)
              { index: true, element: <ProjectDashboardTab /> },
              { path: 'tasks', element: <BoardPage /> },
              { path: 'board', element: <BoardPage /> },
              { path: 'discussions', element: <ProjectDiscussionsTab /> },
              { path: 'comments', element: <ProjectDiscussionsTab /> },
              { path: 'notes', element: <NotesPage /> },
              { path: 'members', element: <ProjectMembersTab /> },
              { path: 'settings', element: <ProjectSettingsTab /> },
            ],
          },
          { path: '/notes', element: <WorkspaceNotesPage /> },
          { path: '/members', element: <MembersPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
