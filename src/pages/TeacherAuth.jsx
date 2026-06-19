import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function TeacherAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError('');
    if (!email || !password) return setError("Isi email & sandi");
    
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!email || password.length < 6) return setError("Email valid & sandi min 6 char");
    
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    
    if (err) setError(err.message);
    else alert("Akun terdaftar! Silakan Login masuk."); // Ideally replace with a proper toast/modal
  };

  return (
    <section className="flex-1 bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[2rem] shadow-xl border border-slate-100">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-700 font-bold mb-6 flex items-center gap-2 transition-colors">
          <i className="fa-solid fa-arrow-left"></i> Kembali ke Awal
        </button>
        
        <h2 className="text-3xl font-black text-slate-800 mb-2">
          <i className="fa-solid fa-chalkboard-user text-sky-500 mr-2"></i> Portal Guru
        </h2>
        <p className="text-slate-500 font-medium mb-8">Login untuk mengelola soal, materi adaptif, dan Arena Kuis.</p>
        
        <div className="space-y-4">
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 border-2 border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:border-sky-500 outline-none font-bold placeholder:font-normal transition-colors" 
            placeholder="Email Terdaftar" 
          />
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 border-2 border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:border-sky-500 outline-none font-bold placeholder:font-normal transition-colors" 
            placeholder="Kata Sandi" 
          />
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button 
              onClick={handleLogin} 
              disabled={loading}
              className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-black py-4 rounded-xl shadow-lg shadow-sky-500/30 transition-transform transform hover:-translate-y-1 disabled:opacity-50"
            >
              Login Masuk
            </button>
            <button 
              onClick={handleRegister} 
              disabled={loading}
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg transition-transform transform hover:-translate-y-1 disabled:opacity-50"
            >
              Daftar Baru
            </button>
          </div>
          {error && <p className="text-rose-500 text-sm font-bold text-center bg-rose-50 p-3 rounded-xl mt-2">{error}</p>}
        </div>
      </div>
    </section>
  );
}
