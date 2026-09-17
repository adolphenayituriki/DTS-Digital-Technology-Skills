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
  '/admin': 'Admin Dashboard',
  '/admin/messages': 'Messages',
  '/admin/members': 'Members',
  '/admin/posts': 'Posts',
  '/admin/intakes': 'Intakes',
  '/admin/applications': 'Applications',
  '/admin/testimonials': 'Testimonials',
};

function TitleManager() {
  const { pathname } = useLocation();
  useEffect(() => {
    const base = Object.keys(titles)
      .sort((a, b) => b.length - a.length)
      .find((p) => pathname === p || pathname.startsWith(p + '/'));
    const page = pathname.startsWith('/news/') ? 'News' : (base ? titles[base] : 'DTS');
    document.title = `${page} | Digital Technology Skills | Association`;
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <TitleManager />
      <ScrollToTop />
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="messages" element={<Messages />} />
          <Route path="members" element={<MembersAdmin />} />
          <Route path="posts" element={<PostsAdmin />} />
          <Route path="intakes" element={<IntakesAdmin />} />
          <Route path="applications" element={<ApplicationsAdmin />} />
          <Route path="testimonials" element={<TestimonialsAdmin />} />
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
