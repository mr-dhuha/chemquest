import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import TeacherAuth from './pages/TeacherAuth';
import TeacherDashboard from './pages/TeacherDashboard';
import BankSoal from './pages/BankSoal';
import SessionManager from './pages/SessionManager';
import Quiz from './pages/Quiz';
import Arena from './pages/Arena';
import QrViewer from './pages/QrViewer';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Modal from './components/Modal';
import DialogManager from './components/DialogManager';
import WaitingApproval from './pages/WaitingApproval';

function App() {
  const [session, setSession] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else {
        setTeacherProfile(null);
        setLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfile = async (userId) => {
    // Check if teachers table exists and fetch profile
    const { data, error } = await supabase.from('teachers').select('*').eq('id', userId).single();
    if (!error && data) {
      setTeacherProfile(data);
      // Update last login
      supabase.from('teachers').update({ last_login: new Date().toISOString() }).eq('id', userId).then();
    } else {
      // Fallback if table doesn't exist yet (before Super Admin setup SQL is run)
      setTeacherProfile({ is_approved: true, role: 'teacher', can_access_all_banks: true }); 
    }
    setLoadingAuth(false);
  };

  if (loadingAuth) return <div className="h-screen bg-slate-50 flex justify-center items-center"><i className="fa-solid fa-spinner fa-spin text-4xl text-teal-500"></i></div>;

  const ProtectedRoute = ({ children }) => {
    if (!session) return <Navigate to="/teacher" />;
    if (teacherProfile && !teacherProfile.is_approved) return <WaitingApproval />;
    return children;
  };

  const AdminRoute = ({ children }) => {
    if (!session) return <Navigate to="/teacher" />;
    if (teacherProfile?.role !== 'admin' && session.user.email !== 'mrdhuhaofficial@gmail.com') return <Navigate to="/dashboard" />;
    return children;
  };

  return (
    <Router>
      <Navbar session={session} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/teacher" element={!session ? <TeacherAuth /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<ProtectedRoute><TeacherDashboard session={session} profile={teacherProfile} /></ProtectedRoute>} />
        <Route path="/bank" element={<ProtectedRoute><BankSoal session={session} profile={teacherProfile} /></ProtectedRoute>} />
        <Route path="/superadmin" element={<AdminRoute><SuperAdminDashboard session={session} /></AdminRoute>} />
        <Route path="/session/:id" element={<ProtectedRoute><SessionManager session={session} profile={teacherProfile} /></ProtectedRoute>} />
        <Route path="/quiz/:pin" element={<Quiz />} />
        <Route path="/arena/:pin" element={<Arena session={session} />} />
        <Route path="/qrcode/:pin" element={<QrViewer />} />
      </Routes>
      <Modal />
      <DialogManager />
    </Router>
  );
}

export default App;
