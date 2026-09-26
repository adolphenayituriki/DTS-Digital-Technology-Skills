import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import About from './pages/About';
import Programs from './pages/Programs';
import Team from './pages/Team';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Contact from './pages/Contact';
import Gallery from './pages/Gallery';
import NotFound from './pages/NotFound';
import Apply from './pages/Apply';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Messages from './pages/admin/Messages';
import MembersAdmin from './pages/admin/MembersAdmin';
import PostsAdmin from './pages/admin/PostsAdmin';
import IntakesAdmin from './pages/admin/IntakesAdmin';
import ApplicationsAdmin from './pages/admin/ApplicationsAdmin';
import TestimonialsAdmin from './pages/admin/TestimonialsAdmin';
import StudentsAdmin from './pages/admin/StudentsAdmin';
import Profile from './pages/Profile';
import RequireRole from './RequireRole';
import TrainerLayout from './pages/TrainerLayout';
import TrainerDashboard from './pages/TrainerDashboard';
import TrainerStudents from './pages/TrainerStudents';
import TrainerAttendance from './pages/TrainerAttendance';
import TrainerMarks from './pages/TrainerMarks';
import FinanceLayout from './pages/FinanceLayout';
import FinanceDashboard from './pages/FinanceDashboard';
import FinanceStudentBalances from './pages/FinanceStudentBalances';
import FinanceRecords from './pages/FinanceRecords';
import FinanceFees from './pages/FinanceFees';
import UserManagement from './pages/UserManagement';
import TrainerAssignments from './pages/TrainerAssignments';

const titles = {
  '/': 'Home',
  '/about': 'About Us',
  '/programs': 'Programs',
  '/team': 'Our Team',
  '/news': 'News',
  '/contact': 'Contact Us',
  '/gallery': 'Gallery',
  '/apply': 'Apply',
  '/login': 'Login',
  '/signup': 'Sign Up',
  '/dashboard': 'My Dashboard',
  '/profile': 'Student Profile',
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
  '/trainer': 'Trainer Dashboard',
  '/trainer/students': 'Trainer Students',
  '/trainer/attendance': 'Trainer Attendance',
  '/trainer/marks': 'Trainer Marks',
  '/finance': 'Finance Dashboard',
  '/finance/students': 'Finance Student Balances',
  '/finance/records': 'Finance Records',
  '/finance/fees': 'Finance Intake Fees',
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
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireRole roles={['admin', 'editor']}>
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
        </Route>
        <Route
          path="*"
          element={
            <>
              <Navbar />
              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/programs" element={<Programs />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/news/:slug" element={<NewsDetail />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/apply" element={<Apply />} />
        {/* Shareable per-intake application link, e.g. /apply/<intakeId> */}
        <Route path="/apply/:intakeId" element={<Apply />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/login" element={<Auth mode="login" />} />
                  <Route path="/signup" element={<Auth mode="signup" />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
