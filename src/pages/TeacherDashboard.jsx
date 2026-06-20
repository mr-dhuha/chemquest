import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Dialog } from '../components/DialogManager';

export default function TeacherDashboard({ session }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.user) {
      loadSessions();
    }
  }, [session]);

  const loadSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('teacher_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) setError(error.message);
    else setSessions(data);
    
    setLoading(false);
  };

  const handleCreateSession = async () => {
    const title = await Dialog.prompt("Masukkan judul sesi kuis (misal: Latihan Asam Basa XA):", "Buat Sesi Baru");
    if (!title || !title.trim()) return;
    
    const pin = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { error } = await supabase.from('sessions').insert({
      title: title.trim(),
      pin,
      teacher_id: session.user.id,
      status: 'draft'
    });
    
    if (error) await Dialog.alert("Gagal membuat sesi: " + error.message, "Error");
    else {
      supabase.from('activity_logs').insert({ teacher_id: session.user.id, action: 'Membuat sesi kelas baru', details: `Sesi: ${title.trim()} (PIN: ${pin})` }).then();
      loadSessions();
    }
  };

  const handleRenameSession = async (e, id, oldTitle) => {
    e.stopPropagation();
    const newTitle = await Dialog.prompt("Ubah judul sesi:", "Ganti Nama Sesi", oldTitle);
    if (!newTitle || !newTitle.trim() || newTitle.trim() === oldTitle) return;

    const { error } = await supabase.from('sessions').update({ title: newTitle.trim() }).eq('id', id);
    if (error) await Dialog.alert("Gagal mengganti nama: " + error.message, "Error");
    else {
      supabase.from('activity_logs').insert({ teacher_id: session.user.id, action: 'Mengganti nama sesi kelas', details: `Dari ${oldTitle} menjadi ${newTitle.trim()}` }).then();
      loadSessions();
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    const confirmed = await Dialog.confirm("Apakah Anda yakin ingin menghapus sesi ini secara permanen? Semua soal dan data siswa akan hilang.", "Hapus Sesi");
    if (!confirmed) return;

    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (error) await Dialog.alert("Gagal menghapus sesi: " + error.message, "Error");
    else {
      supabase.from('activity_logs').insert({ teacher_id: session.user.id, action: 'Menghapus sesi kelas' }).then();
      loadSessions();
    }
  };

  const handleChangePassword = async () => {
    const oldPwd = await Dialog.prompt("Masukkan password lama Anda:", "Verifikasi Password Lama", "", true);
    if (!oldPwd) return;

    // Verify old password by signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: oldPwd
    });

    if (signInError) return Dialog.alert("Password lama salah!", "Gagal");

    const newPwd = await Dialog.prompt("Masukkan password baru Anda (minimal 6 karakter):", "Ganti Password Baru", "", true);
    if (!newPwd) return;
    if (newPwd.length < 6) return Dialog.alert("Password minimal 6 karakter!", "Gagal");

    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) await Dialog.alert(error.message, "Gagal");
    else await Dialog.alert("Password berhasil diubah!", "Sukses");
  };

  return (
    <section className="py-8 px-4 flex-1 bg-slate-50">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">Ruang Kendali</h2>
            <p className="text-slate-500 font-bold mt-1">Kelola sesi kelas, pre-test, materi, dan kuis Anda.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button 
              onClick={() => navigate('/guide')} 
              className="bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-transform transform hover:-translate-y-1"
            >
              <i className="fa-solid fa-circle-question text-xl"></i> Panduan
            </button>
            <button 
              onClick={handleChangePassword} 
              className="bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-transform transform hover:-translate-y-1"
            >
              <i className="fa-solid fa-key text-xl"></i> Ganti Password
            </button>
            <button 
              onClick={() => navigate('/bank')} 
              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-transform transform hover:-translate-y-1"
            >
              <i className="fa-solid fa-vault text-xl"></i> Bank Soal
            </button>
            <button 
              onClick={handleCreateSession} 
              className="bg-teal-500 hover:bg-teal-600 text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-teal-500/30 transition-transform transform hover:-translate-y-1"
            >
              <i className="fa-solid fa-plus text-xl"></i> Buat Sesi Baru
            </button>
          </div>
        </div>

        {error && <div className="text-rose-500 font-bold p-4 bg-rose-50 rounded-xl mb-4">Error: {error}</div>}

        <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex-1 relative">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text" 
              placeholder="Cari sesi atau PIN..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:border-indigo-400 focus:bg-white outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="py-3 px-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:border-indigo-400 outline-none cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="live">Live</option>
              <option value="closed">Closed</option>
            </select>
            <select 
              value={sortOrder} 
              onChange={e => setSortOrder(e.target.value)}
              className="py-3 px-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold text-slate-700 focus:border-indigo-400 outline-none cursor-pointer"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="az">A-Z</option>
              <option value="za">Z-A</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center p-10 text-slate-400 font-bold">
              <i className="fa-solid fa-spinner fa-spin text-2xl mb-2"></i><br/>Memuat sesi...
            </div>
          ) : sessions.length === 0 ? (
            <div className="col-span-full text-center bg-white border-2 border-dashed border-slate-200 p-12 rounded-[2rem] text-slate-400 font-bold text-lg">
              <i className="fa-solid fa-box-open text-4xl mb-3 block"></i>Belum ada sesi kuis yang dibuat.
            </div>
          ) : (
            sessions.filter(s => {
              const matchSearch = s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.pin.toLowerCase().includes(searchQuery.toLowerCase());
              const matchStatus = filterStatus === 'all' || s.status === filterStatus;
              return matchSearch && matchStatus;
            }).sort((a, b) => {
              if (sortOrder === 'newest') return new Date(b.created_at) - new Date(a.created_at);
              if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
              if (sortOrder === 'az') return a.title.localeCompare(b.title);
              if (sortOrder === 'za') return b.title.localeCompare(a.title);
              return 0;
            }).map(s => {
              const isLive = s.status === 'live';
              return (
                <div 
                  key={s.id} 
                  onClick={() => navigate(`/session/${s.id}`)}
                  className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border-2 border-slate-100 hover:border-teal-300 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black tracking-wider uppercase ${isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.status}
                    </span>
                    <span className="font-mono font-black text-slate-400 text-sm bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                      PIN: <span className="text-slate-700">{s.pin}</span>
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-2 group-hover:text-teal-600 transition-colors line-clamp-2 flex-1">
                    {s.title}
                  </h3>
                  
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                    <p className="text-sm text-slate-400 font-bold">
                      <i className="fa-solid fa-calendar-day mr-1"></i> 
                      {new Date(s.created_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                    </p>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleRenameSession(e, s.id, s.title)}
                        className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                        title="Ganti Nama"
                      >
                        <i className="fa-solid fa-pen text-xs"></i>
                      </button>
                      <button 
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                        title="Hapus Sesi"
                      >
                        <i className="fa-solid fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
