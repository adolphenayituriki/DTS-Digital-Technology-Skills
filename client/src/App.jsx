import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import RouteFallback from './components/RouteFallback';
import RequireRole from './RequireRole';
import Home from './pages/Home';

const About = lazy(() => import('./pages/About'));
const Programs = lazy(() => import('./pages/Programs'));
const Team = lazy(() => import('./pages/Team'));
const News = lazy(() => import('./pages/News'));
const NewsDetail = lazy(() => import('./pages/NewsDetail'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Gallery = lazy(() => import('./pages/Gallery'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Apply = lazy(() => import('./pages/Apply'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const Messages = lazy(() => import('./pages/admin/Messages'));
const MembersAdmin = lazy(() => import('./pages/admin/MembersAdmin'));
const PostsAdmin = lazy(() => import('./pages/admin/PostsAdmin'));
const IntakesAdmin = lazy(() => import('./pages/admin/IntakesAdmin'));
const ApplicationsAdmin = lazy(() => import('./pages/admin/ApplicationsAdmin'));
const TestimonialsAdmin = lazy(() => import('./pages/admin/TestimonialsAdmin'));
const StudentsAdmin = lazy(() => import('./pages/admin/StudentsAdmin'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const TrainerAssignments = lazy(() => import('./pages/TrainerAssignments'));
const TrainerLayout = lazy(() => import('./pages/TrainerLayout'));
const TrainerDashboard = lazy(() => import('./pages/TrainerDashboard'));
const TrainerStudents = lazy(() => import('./pages/TrainerStudents'));
const TrainerAttendance = lazy(() => import('./pages/TrainerAttendance'));
const TrainerMarks = lazy(() => import('./pages/TrainerMarks'));
const FinanceLayout = lazy(() => import('./pages/FinanceLayout'));
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard'));
const FinanceStudentBalances = lazy(() => import('./pages/FinanceStudentBalances'));
const FinanceRecords = lazy(() => import('./pages/FinanceRecords'));
const FinanceFees = lazy(() => import('./pages/FinanceFees'));
const SecretaryLayout = lazy(() => import('./pages/SecretaryLayout'));
const SecretaryDashboard = lazy(() => import('./pages/SecretaryDashboard'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));

const titles = {
  '/': 'Home',
  '/about': 'About Us',
  '/programs': 'Programs',
  '/team': 'Our Team',
  '/news': 'News',
  '/contact': 'Contact Us',
  '/privacy': 'Privacy Policy',
  '/terms': 'Terms of Service',
  '/gallery': 'Gallery',
  '/apply': 'Apply',
  '/login': 'Login',
  '/signup': 'Sign Up',
  '/dashboard': 'My Dashboard',
  '/profile': 'Student Profile',
  '/account': 'My Profile',
  '/admin': 'Admin Dashboard',
  '/admin/messages': 'Messages',
  '/admin/members': 'Members',
  '/admin/posts': 'Posts',
  '/admin/intakes': 'Intakes',
  '/admin/applications': 'Applications',
  '/admin/students': 'Students',
  '/admin/testimonials': 'Testimonials',
  '/admin/users': 'User Access',
  '/admin/trainer-assignments': 'Trainer Assignments',
  '/admin/settings': 'Settings',
  '/trainer': 'Trainer Dashboard',
  '/trainer/students': 'Trainer Students',
  '/trainer/attendance': 'Trainer Attendance',
  '/trainer/marks': 'Trainer Marks',
  '/trainer/settings': 'Settings',
  '/finance': 'Finance Dashboard',
  '/finance/students': 'Finance Student Balances',
  '/finance/records': 'Finance Records',
  '/finance/fees': 'Finance Intake Fees',
  '/finance/settings': 'Settings',
  '/secretary': 'Secretary Dashboard',
  '/secretary/settings': 'Settings',
};

function TitleManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const base = Object.keys(titles)
      .sort((a, b) => b.length - a.length)
      .find((p) => pathname === p || pathname.startsWith(p + '/'));
    const page = pathname.startsWith('/news/') ? 'News' : (base ? titles[base] : 'DTS');
    document.title = `${page} | Digital Technology Skills | Company`;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <TitleManager />
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
    </BrowserRouter>
  );
}
