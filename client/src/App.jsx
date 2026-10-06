import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazyRoute } from './lazyRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import RouteFallback from './components/RouteFallback';
import MetaManager from './components/MetaManager';
import RequireRole from './RequireRole';
import Home from './pages/Home';

const About = lazyRoute('about', () => import('./pages/About'));
const Programs = lazyRoute('programs', () => import('./pages/Programs'));
const Team = lazyRoute('team', () => import('./pages/Team'));
const News = lazyRoute('news', () => import('./pages/News'));
const NewsDetail = lazyRoute('newsDetail', () => import('./pages/NewsDetail'));
const Contact = lazyRoute('contact', () => import('./pages/Contact'));
const Privacy = lazyRoute('privacy', () => import('./pages/Privacy'));
const Terms = lazyRoute('terms', () => import('./pages/Terms'));
const Gallery = lazyRoute('gallery', () => import('./pages/Gallery'));
const NotFound = lazyRoute('notFound', () => import('./pages/NotFound'));
const Apply = lazyRoute('apply', () => import('./pages/Apply'));
const Auth = lazyRoute('auth', () => import('./pages/Auth'));
const Dashboard = lazyRoute('dashboard', () => import('./pages/Dashboard'));
const Profile = lazyRoute('profile', () => import('./pages/Profile'));
const MyProfile = lazyRoute('myProfile', () => import('./pages/MyProfile'));
const AdminLayout = lazyRoute('adminLayout', () => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazyRoute('adminDashboard', () => import('./pages/admin/Dashboard'));
const Messages = lazyRoute('messages', () => import('./pages/admin/Messages'));
const MembersAdmin = lazyRoute('membersAdmin', () => import('./pages/admin/MembersAdmin'));
const PostsAdmin = lazyRoute('postsAdmin', () => import('./pages/admin/PostsAdmin'));
const IntakesAdmin = lazyRoute('intakesAdmin', () => import('./pages/admin/IntakesAdmin'));
const ApplicationsAdmin = lazyRoute('applicationsAdmin', () => import('./pages/admin/ApplicationsAdmin'));
const TestimonialsAdmin = lazyRoute('testimonialsAdmin', () => import('./pages/admin/TestimonialsAdmin'));
const StudentsAdmin = lazyRoute('studentsAdmin', () => import('./pages/admin/StudentsAdmin'));
const UserManagement = lazyRoute('userManagement', () => import('./pages/UserManagement'));
const TrainerAssignments = lazyRoute('trainerAssignments', () => import('./pages/TrainerAssignments'));
const TrainerLayout = lazyRoute('trainerLayout', () => import('./pages/TrainerLayout'));
const TrainerDashboard = lazyRoute('trainerDashboard', () => import('./pages/TrainerDashboard'));
const TrainerStudents = lazyRoute('trainerStudents', () => import('./pages/TrainerStudents'));
const TrainerAttendance = lazyRoute('trainerAttendance', () => import('./pages/TrainerAttendance'));
const TrainerMarks = lazyRoute('trainerMarks', () => import('./pages/TrainerMarks'));
const FinanceLayout = lazyRoute('financeLayout', () => import('./pages/FinanceLayout'));
const FinanceDashboard = lazyRoute('financeDashboard', () => import('./pages/FinanceDashboard'));
const FinanceStudentBalances = lazyRoute('financeStudentBalances', () => import('./pages/FinanceStudentBalances'));
const FinanceRecords = lazyRoute('financeRecords', () => import('./pages/FinanceRecords'));
const FinanceFees = lazyRoute('financeFees', () => import('./pages/FinanceFees'));
const SecretaryLayout = lazyRoute('secretaryLayout', () => import('./pages/SecretaryLayout'));
const SecretaryDashboard = lazyRoute('secretaryDashboard', () => import('./pages/SecretaryDashboard'));
const AccountSettings = lazyRoute('accountSettings', () => import('./pages/AccountSettings'));

// Everything inside the router, with no router of its own.
//
// The client mounts this under a BrowserRouter; the prerenderer mounts the same
// tree under a StaticRouter. Keeping the routing table in one place is the point
// - a second copy for the server would drift from this one within a week.
export function AppShell() {
  return (
    <>
      <MetaManager />
      <ScrollToTop />
      {/* Every page below is code-split, so a single boundary here keeps a
          slow chunk from throwing "no fallback UI was specified" on the
          role-gated dashboards, which render outside the public shell. */}
      <Suspense fallback={<div className="loading"><div className="spinner" />Loading...</div>}>
      <Routes>
        <Route
          path="/admin"
          element={
            // The secretary is read-only across these pages, so it may enter the
            // area to view records. Staff accounts and trainer assignments keep
            // their own admin-only guard below.
            <RequireRole roles={['admin', 'secretary']}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="messages" element={<Messages />} />
          <Route path="members" element={<MembersAdmin />} />
          <Route path="posts" element={<PostsAdmin />} />
          <Route path="intakes" element={<IntakesAdmin />} />
          <Route path="applications" element={<ApplicationsAdmin />} />
          <Route path="students" element={<StudentsAdmin />} />
          <Route path="testimonials" element={<TestimonialsAdmin />} />
          <Route
            path="users"
            element={
              <RequireRole roles={['admin']}>
                <UserManagement />
              </RequireRole>
            }
          />
          <Route
            path="trainer-assignments"
            element={
              <RequireRole roles={['admin']}>
                <TrainerAssignments />
              </RequireRole>
            }
          />
          <Route path="settings" element={<AccountSettings />} />
        </Route>
        <Route
          path="/trainer"
          element={
            <RequireRole roles={['trainer', 'admin']}>
              <TrainerLayout />
            </RequireRole>
          }
        >
          <Route index element={<TrainerDashboard />} />
          <Route path="students" element={<TrainerStudents />} />
          <Route path="attendance" element={<TrainerAttendance />} />
          <Route path="marks" element={<TrainerMarks />} />
          <Route path="settings" element={<AccountSettings />} />
        </Route>
        <Route
          path="/finance"
          element={
            <RequireRole roles={['finance', 'admin']}>
              <FinanceLayout />
            </RequireRole>
          }
        >
          <Route index element={<FinanceDashboard />} />
          <Route path="students" element={<FinanceStudentBalances />} />
          <Route path="records" element={<FinanceRecords />} />
          <Route path="fees" element={<FinanceFees />} />
          <Route path="settings" element={<AccountSettings />} />
        </Route>
        <Route
          path="/secretary"
          element={
            <RequireRole roles={['secretary', 'admin']}>
              <SecretaryLayout />
            </RequireRole>
          }
        >
          <Route index element={<SecretaryDashboard />} />
          <Route path="settings" element={<AccountSettings />} />
        </Route>
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <main>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/programs" element={<Programs />} />
                    <Route path="/team" element={<Team />} />
                    <Route path="/news" element={<News />} />
                    <Route path="/news/:slug" element={<NewsDetail />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/apply" element={<Apply />} />
                    {/* Shareable per-intake application link, e.g. /apply/<intakeId> */}
                    <Route path="/apply/:intakeId" element={<Apply />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/account" element={<MyProfile />} />
                    <Route path="/login" element={<Auth mode="login" />} />
                    <Route path="/signup" element={<Auth mode="signup" />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </>
          }
        />
</Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
