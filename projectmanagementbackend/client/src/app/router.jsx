import { lazy, Suspense } from 'react';
import { createBrowserRouter, Link } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout.jsx';
import { ProtectedLayout } from '../components/layout/ProtectedLayout.jsx';
import { ProjectLayout } from '../components/layout/ProjectLayout.jsx';
import { RequireAuth, RedirectIfAuthed } from '../components/layout/guards.jsx';
import { Skeleton } from '../components/ui/index.js';

function PageFallback() {
  return (
    <div className="space-y-4 p-6" aria-busy="true">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

const S = (Component) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

// Lazy-loaded routes for optimal bundle code-splitting
const RegisterPage = lazy(() => import('../features/auth/RegisterPage.jsx').then((m) => ({ default: m.RegisterPage })));
const LoginPage = lazy(() => import('../features/auth/LoginPage.jsx').then((m) => ({ default: m.LoginPage })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage.jsx').then((m) => ({ default: m.SettingsPage })));
const ProjectsPage = lazy(() => import('../features/projects/ProjectsPage.jsx').then((m) => ({ default: m.ProjectsPage })));
const ProjectDashboardTab = lazy(() => import('../features/projects/ProjectDashboardTab.jsx').then((m) => ({ default: m.ProjectDashboardTab })));
const ProjectDiscussionsTab = lazy(() => import('../features/projects/ProjectDiscussionsTab.jsx').then((m) => ({ default: m.ProjectDiscussionsTab })));
const ProjectMembersTab = lazy(() => import('../features/projects/ProjectMembersTab.jsx').then((m) => ({ default: m.ProjectMembersTab })));
const ProjectSettingsTab = lazy(() => import('../features/projects/ProjectSettingsTab.jsx').then((m) => ({ default: m.ProjectSettingsTab })));
const BoardPage = lazy(() => import('../features/board/BoardPage.jsx').then((m) => ({ default: m.BoardPage })));
const NotesPage = lazy(() => import('../features/notes/NotesPage.jsx').then((m) => ({ default: m.NotesPage })));
const LandingPage = lazy(() => import('../features/landing/LandingPage.jsx').then((m) => ({ default: m.LandingPage })));
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage.jsx').then((m) => ({ default: m.DashboardPage })));
const WorkspaceNotesPage = lazy(() => import('../features/notes/WorkspaceNotesPage.jsx').then((m) => ({ default: m.WorkspaceNotesPage })));
const MembersPage = lazy(() => import('../features/members/MembersPage.jsx').then((m) => ({ default: m.MembersPage })));
const ProfilePage = lazy(() => import('../features/profile/ProfilePage.jsx').then((m) => ({ default: m.ProfilePage })));

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
  { path: '/', element: S(LandingPage) },
  {
    element: <RedirectIfAuthed />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/login', element: S(LoginPage) },
          { path: '/register', element: S(RegisterPage) },
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
          { path: '/dashboard', element: S(DashboardPage) },
          { path: '/projects', element: S(ProjectsPage) },
          {
            path: '/projects/:projectId',
            element: <ProjectLayout />,
            children: [
              // Index route = Dashboard tab (deep-linkable: /projects/:id)
              { index: true, element: S(ProjectDashboardTab) },
              { path: 'tasks', element: S(BoardPage) },
              { path: 'board', element: S(BoardPage) },
              { path: 'discussions', element: S(ProjectDiscussionsTab) },
              { path: 'comments', element: S(ProjectDiscussionsTab) },
              { path: 'notes', element: S(NotesPage) },
              { path: 'members', element: S(ProjectMembersTab) },
              { path: 'settings', element: S(ProjectSettingsTab) },
            ],
          },
          { path: '/notes', element: S(WorkspaceNotesPage) },
          { path: '/members', element: S(MembersPage) },
          { path: '/profile', element: S(ProfilePage) },
          { path: '/settings', element: S(SettingsPage) },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
