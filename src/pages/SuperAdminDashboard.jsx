import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Dialog } from '../components/DialogManager';

export default function SuperAdminDashboard({ session }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const ADMIN_EMAIL = 'mrdhuhaofficial@gmail.com';

  useEffect(() => {
    if (session?.user?.email !== ADMIN_EMAIL) {
      navigate('/dashboard');
      return;
    }
    loadAllSessions();
  }, [session, navigate]);

  const loadAllSessions = async () => {
    setLoading(true);
    // Fetch all sessions. If RLS blocks this, we'll only see our own unless RLS is disabled or allows it.
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      await Dialog.alert("Gagal memuat sesi: " + error.message, "Error");
    } else {
      setSessions(data || []);
    }
    
    setLoading(false);
  };

  const handleDeleteSession = async (id, title) => {
    const confirmed = await Dialog.confirm(`Hapus sesi "${title}" secara permanen (Global)?`, "Hapus Sesi Admin");
    if (!confirmed) return;

    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) {
      await Dialog.alert("Gagal menghapus: " + error.message, "Error");
    } else {
      loadAllSessions();
    }
  };

  if (session?.user?.email !== ADMIN_EMAIL) return null;

  return (
    <section className="py-8 px-4 flex-1 bg-slate-900 min-h-screen">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-shield-halved text-rose-500"></i> Super Admin Dashboard
            </h2>
            <p className="text-slate-400 font-bold mt-1">Kelola seluruh sesi di platform ChemQuest.</p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-crown"></i> Admin Access
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-xl font-black text-white">Semua Sesi Aktif ({sessions.length})</h3>
            <button onClick={loadAllSessions} className="text-slate-400 hover:text-white transition-colors">
              <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i> Segarkan
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-widest font-black">
                  <th className="p-4 pl-6">Sesi (Judul)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">PIN</th>
                  <th className="p-4">Tanggal Dibuat</th>
                  <th className="p-4 text-right pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-bold"><i className="fa-solid fa-spinner fa-spin mr-2"></i> Memuat...</td></tr>
                ) : sessions.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-500 font-bold">Tidak ada sesi di database.</td></tr>
                ) : (
                  sessions.map(s => (
                    <tr key={s.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 pl-6 font-bold">{s.title}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider
                          ${s.status === 'live' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-600/50 text-slate-400'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-black tracking-widest text-teal-400">{s.pin}</td>
                      <td className="p-4 text-sm">{new Date(s.created_at).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-right pr-6">
                        <button 
                          onClick={() => handleDeleteSession(s.id, s.title)}
                          className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors ml-auto"
                          title="Hapus Paksa"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
