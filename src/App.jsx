import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import TeacherAuth from './pages/TeacherAuth';
import TeacherDashboard from './pages/TeacherDashboard';
import SessionManager from './pages/SessionManager';
import Quiz from './pages/Quiz';
import Arena from './pages/Arena';
import QrViewer from './pages/QrViewer';
import AiWidget from './components/AiWidget';
import Modal from './components/Modal';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <Navbar session={session} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/teacher" element={!session ? <TeacherAuth /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={session ? <TeacherDashboard session={session} /> : <Navigate to="/teacher" />} />
        <Route path="/session/:id" element={session ? <SessionManager session={session} /> : <Navigate to="/teacher" />} />
        <Route path="/quiz/:pin" element={<Quiz />} />
        <Route path="/arena/:pin" element={<Arena session={session} />} />
        <Route path="/qrcode/:pin" element={<QrViewer />} />
      </Routes>
      <Modal />
      {session && <AiWidget />}
    </Router>
  );
}

export default App;
