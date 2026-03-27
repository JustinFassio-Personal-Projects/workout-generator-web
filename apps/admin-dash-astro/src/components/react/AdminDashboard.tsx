/**
 * Minimal admin dashboard shell: sidebar + React Router.
 * Add features by adding routes and copying components from apps/programs.
 */
import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Home, LogOut } from 'lucide-react';
import { clearAuthCookie } from '@/lib/auth-cookie';
import { adminPaths } from '@/lib/admin/config';
import { ADMIN_NAV_ITEMS, isAdminNavActive } from '@/lib/admin/navigation';
import { AppProvider, useAppContext } from '@/contexts/AppContext';
import DashboardHome from './admin/DashboardHome';
import ManageUsers from './admin/views/ManageUsers';
import ManageZones from './admin/views/ManageZones';
import ManagePrograms from './admin/views/ManagePrograms';
import ProgramEditor from './admin/views/ProgramEditor';
import ManageWorkouts from './admin/views/ManageWorkouts';
import WorkoutSetEditor from './admin/views/WorkoutSetEditor';
import ManageChallenges from './admin/views/ManageChallenges';
import ChallengeEditor from './admin/views/ChallengeEditor';
import ManageBlog from './admin/views/ManageBlog';
import BlogEditor from './admin/BlogEditor';
import ManageDeepResearch from './admin/views/ManageDeepResearch';
import DeepResearchEditor from './admin/DeepResearchEditor';
import ComingSoon from './admin/ComingSoon';
import ManageExercises from './admin/views/ManageExercises';
import AdminExerciseDetail from './admin/AdminExerciseDetail';
import AdminDeepDiveView from './admin/AdminDeepDiveView';
import ExerciseImageGenerator from '@/components/ExerciseImageGenerator';
import TutorialLabView from '@/features/TutorialLab/components/TutorialLabView';
import AnalyticsView from './admin/views/AnalyticsView';
import GrowthEngineView from './admin/views/GrowthEngineView';
import AnalyticsDetailView from './admin/views/AnalyticsDetailView';

const navLinkClass = (isActive: boolean) =>
  `flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
    isActive ? 'bg-[#ffbf00]/20 text-[#ffbf00]' : 'text-white/70 hover:bg-white/5 hover:text-white'
  }`;

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const { handleLogout } = useAppContext();
  const onSignOut = async () => {
    clearAuthCookie();
    await handleLogout();
    window.location.href = adminPaths.login;
  };
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col bg-[#0d0500] text-white md:h-screen md:flex-row">
      {/*
        Sidebar: avoid nav { flex: 1 } — it stretched the nav between header and account actions,
        leaving a tall empty flex region (read as a "sticky footer" band). Stack on small screens
        with a capped sidebar height; on md+ the whole column scrolls as one unit (no flex-1 void).
      */}
      <aside className="flex max-h-[min(44vh,21rem)] w-full shrink-0 flex-col overflow-y-auto overflow-x-hidden border-b border-white/10 bg-black/20 md:sticky md:top-0 md:max-h-[100dvh] md:h-[100dvh] md:w-64 md:border-r md:border-b-0">
        <div className="shrink-0 border-b border-white/10 p-6">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-xs text-white/50">admin-dash-astro</p>
        </div>
        <nav className="space-y-1 p-4">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isAdminNavActive(item.path, location.pathname);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={() => navLinkClass(isActive)}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="shrink-0 space-y-1 border-t border-white/10 p-4">
          <a
            href={adminPaths.home}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">Return to site</span>
          </a>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const AdminRoutes: React.FC = () => {
  const { authHydrated } = useAppContext();
  if (!authHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d0500] text-white">
        <p className="text-sm text-white/70">Loading session…</p>
      </div>
    );
  }
  return (
    <>
      <Toaster richColors position="top-right" />
      <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="analytics" element={<AnalyticsView />} />
            <Route path="growth-engine" element={<GrowthEngineView />} />
            <Route path="analytics/details/:datasetKey" element={<AnalyticsDetailView />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="zones" element={<ManageZones />} />
            <Route path="exercises/:slug/deep-dive" element={<AdminDeepDiveView />} />
            <Route path="exercises/:slug" element={<AdminExerciseDetail />} />
            <Route path="exercises" element={<ManageExercises />} />
            <Route path="exercise-image-gen" element={<ExerciseImageGenerator />} />
            <Route path="tutorial-lab" element={<TutorialLabView />} />
            <Route path="programs/:id" element={<ProgramEditor />} />
            <Route path="programs" element={<ManagePrograms />} />
            <Route path="workouts/sets/:id" element={<WorkoutSetEditor />} />
            <Route path="workouts" element={<ManageWorkouts />} />
            <Route path="challenges/:id" element={<ChallengeEditor />} />
            <Route path="challenges" element={<ManageChallenges />} />
            <Route path="blog/new" element={<BlogEditor />} />
            <Route path="blog/:slug/edit" element={<BlogEditor />} />
            <Route path="blog" element={<ManageBlog />} />
            <Route path="deep-research/new" element={<DeepResearchEditor />} />
            <Route path="deep-research/:slug/edit" element={<DeepResearchEditor />} />
            <Route path="deep-research" element={<ManageDeepResearch />} />
            <Route path="*" element={<ComingSoon />} />
          </Route>
        </Routes>
    </>
  );
};

const AdminDashboard: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter basename={adminPaths.root}>
        <AdminRoutes />
      </BrowserRouter>
    </AppProvider>
  );
};

export default AdminDashboard;
