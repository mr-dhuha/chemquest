import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Dialog } from '../components/DialogManager';

export default function SuperAdminDashboard({ session }) {
  const [sessions, setSessions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('accounts'); // accounts, sessions, banks, logs
  const [logFilter, setLogFilter] = useState('');
  const [logSortDesc, setLogSortDesc] = useState(true);
  const navigate = useNavigate();
  
  const ADMIN_EMAIL = 'mrdhuhaofficial@gmail.com';

  useEffect(() => {
    if (session?.user?.email !== ADMIN_EMAIL) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [session, navigate, activeTab]);

  const loadData = () => {
    if (activeTab === 'accounts') loadAllTeachers();
    else if (activeTab === 'sessions') loadAllSessions();
    else if (activeTab === 'banks') loadAllBanks();
    else if (activeTab === 'logs') loadLogs();
  };

  const getTeacherEmail = (tid) => {
    const t = teachers.find(x => x.id === tid);
    return t ? t.email : 'Unknown';
  };

  const loadAllTeachers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('teachers').select('*').order('created_at', { ascending: false });
    if (!error) setTeachers(data || []);
    setLoading(false);
  };

  const loadAllSessions = async () => {
    setLoading(true);
    // Ensure we have teachers loaded first so we can map IDs to Emails
    if (teachers.length === 0) {
      const { data: tData } = await supabase.from('teachers').select('*');
      if (tData) setTeachers(tData);
    }
    const { data, error } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
    if (!error) setSessions(data || []);
    setLoading(false);
  };

  const loadAllBanks = async () => {
    setLoading(true);
    if (teachers.length === 0) {
      const { data: tData } = await supabase.from('teachers').select('*');
      if (tData) setTeachers(tData);
    }
    const { data, error } = await supabase.from('question_banks').select('*').order('created_at', { ascending: false });
    if (!error) setBanks(data || []);
    setLoading(false);
  };

  const loadLogs = async () => {
    setLoading(true);
    if (teachers.length === 0) {
      const { data: tData } = await supabase.from('teachers').select('*');
      if (tData) setTeachers(tData);
    }
    const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100);
    if (!error) setLogs(data || []);
    setLoading(false);
  };

  const handleDeleteSession = async (id, title) => {
    if (!await Dialog.confirm(`Hapus sesi "${title}" secara permanen?`, "Hapus Sesi")) return;
    const { error } = await supabase.from('sessions').delete().eq('id', id);
    if (!error) loadData();
  };

  const handleApproveAccount = async (id, email) => {
    if (!await Dialog.confirm(`Setujui akun ${email}?`, "Setujui")) return;
    setLoading(true);
    const { error } = await supabase.rpc('admin_approve_teacher', { target_id: id });
    if (!error) loadData();
    else Dialog.alert(error.message, "Gagal");
  };

  const handleBlockAccount = async (id, email) => {
    if (!await Dialog.confirm(`Blokir/bekukan akun ${email}? Guru tidak akan bisa login.`, "Blokir Akun")) return;
    setLoading(true);
    const { error } = await supabase.from('teachers').update({ is_approved: false }).eq('id', id);
    if (!error) loadData();
    else Dialog.alert(error.message, "Gagal");
  };

  const handleDeleteAccount = async (id, email) => {
    if (!await Dialog.confirm(`Hapus akun ${email} permanen?`, "Hapus")) return;
    setLoading(true);
    const { error } = await supabase.rpc('admin_delete_teacher', { target_id: id });
    if (!error) loadData();
    else Dialog.alert(error.message, "Gagal");
  };

  const handleResetPassword = async (id, email) => {
    const newPwd = await Dialog.prompt(`Password baru untuk ${email}:`, "Reset Password");
    if (!newPwd || newPwd.length < 6) return;
    setLoading(true);
    const { error } = await supabase.rpc('admin_reset_password', { target_id: id, new_password: newPwd });
    setLoading(false);
    if (error) Dialog.alert(error.message, "Gagal");
    else Dialog.alert("Berhasil reset password!", "Sukses");
  };

  const handleToggleBankAccess = async (id, currentAccess) => {
    setLoading(true);
    const { error } = await supabase.rpc('admin_toggle_bank_access', { target_id: id, new_status: !currentAccess });
    if (!error) loadData();
    else Dialog.alert(error.message, "Gagal Toggle Akses");
  };

  const handleExportLogs = () => {
    let csvContent = "data:text/csv;charset=utf-8,Waktu,Guru,Aktivitas,Detail\n";
    const filteredLogs = logs.filter(l => 
      getTeacherEmail(l.teacher_id).toLowerCase().includes(logFilter.toLowerCase()) || 
      (l.action && l.action.toLowerCase().includes(logFilter.toLowerCase()))
    ).sort((a, b) => logSortDesc ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));

    filteredLogs.forEach(l => {
      const email = getTeacherEmail(l.teacher_id);
      const time = new Date(l.created_at).toLocaleString('id-ID').replace(/,/g, '');
      const action = l.action ? l.action.replace(/,/g, '') : '';
      const details = l.details ? l.details.replace(/,/g, '') : '';
      csvContent += `${time},${email},${action},${details}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "chemquest_activity_logs.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (session?.user?.email !== ADMIN_EMAIL) return null;

  return (
    <section className="py-8 px-4 flex-1 bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-shield-halved text-rose-500"></i> Super Admin Dashboard
            </h2>
            <p className="text-slate-400 font-bold mt-1">Kelola seluruh platform ChemQuest.</p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-crown"></i> Admin Access
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setActiveTab('accounts')} className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'accounts' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
            <i className="fa-solid fa-users mr-2"></i> Akun Guru
          </button>
          <button onClick={() => setActiveTab('sessions')} className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'sessions' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
            <i className="fa-solid fa-gamepad mr-2"></i> Sesi Kelas
          </button>
          <button onClick={() => setActiveTab('banks')} className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'banks' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
            <i className="fa-solid fa-vault mr-2"></i> Bank Soal
          </button>
          <button onClick={() => setActiveTab('logs')} className={`px-6 py-3 rounded-xl font-bold transition-colors ${activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
            <i className="fa-solid fa-clock-rotate-left mr-2"></i> Log Aktivitas
          </button>
        </div>

        <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xl font-black text-white capitalize">Tab {activeTab.replace('-', ' ')}</h3>
            <div className="flex flex-wrap items-center gap-3">
              {activeTab === 'logs' && (
                <>
                  <input 
                    type="text" 
                    placeholder="Cari email/aktivitas..." 
                    value={logFilter}
                    onChange={e => setLogFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                  <button onClick={() => setLogSortDesc(!logSortDesc)} className="text-slate-400 hover:text-white transition-colors text-sm font-bold bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
                    <i className={`fa-solid fa-sort-${logSortDesc ? 'down' : 'up'}`}></i> Sort
                  </button>
                  <button onClick={handleExportLogs} className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                    <i className="fa-solid fa-file-csv"></i> Export CSV
                  </button>
                </>
              )}
              <button onClick={loadData} className="text-slate-400 hover:text-white transition-colors text-sm font-bold bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5">
                <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i> Segarkan
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left border-collapse relative">
              {/* HEADERS */}
              <thead className="sticky top-0 bg-slate-800 shadow-md z-10">
                <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-widest font-black">
                  {activeTab === 'accounts' && (
                    <>
                      <th className="p-4 pl-6">Email / Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Terakhir Login</th>
                      <th className="p-4">Akses Bank Global</th>
                      <th className="p-4 text-right pr-6">Aksi</th>
                    </>
                  )}
                  {activeTab === 'sessions' && (
                    <>
                      <th className="p-4 pl-6">Judul Sesi</th>
                      <th className="p-4">Pembuat (Guru)</th>
                      <th className="p-4">Status / PIN</th>
                      <th className="p-4 text-right pr-6">Aksi</th>
                    </>
                  )}
                  {activeTab === 'banks' && (
                    <>
                      <th className="p-4 pl-6">Soal / Materi</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Pembuat (Guru)</th>
                    </>
                  )}
                  {activeTab === 'logs' && (
                    <>
                      <th className="p-4 pl-6">Waktu</th>
                      <th className="p-4">Guru</th>
                      <th className="p-4">Aktivitas</th>
                      <th className="p-4">Detail Tambahan</th>
                    </>
                  )}
                </tr>
              </thead>
              
              {/* BODY */}
              <tbody className="text-slate-300 text-sm">
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-500 font-bold"><i className="fa-solid fa-spinner fa-spin mr-2"></i> Memuat...</td></tr>
                ) : (
                  <>
                    {/* ACCOUNTS */}
                    {activeTab === 'accounts' && teachers.map(t => (
                      <tr key={t.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="p-4 pl-6 font-bold">{t.email} <br/><span className="text-xs text-slate-500 font-normal">{t.role}</span></td>
                        <td className="p-4">
                          {t.is_approved ? <span className="text-emerald-400 font-bold">Disetujui</span> : <span className="text-amber-400 font-bold">Menunggu</span>}
                        </td>
                        <td className="p-4 text-slate-400">{t.last_login ? new Date(t.last_login).toLocaleString('id-ID') : 'Belum Pernah'}</td>
                        <td className="p-4">
                          <button onClick={() => handleToggleBankAccess(t.id, t.can_access_all_banks)} className={`px-3 py-1 rounded-full font-bold text-xs ${t.can_access_all_banks ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
                            {t.can_access_all_banks ? 'DIZINKAN' : 'DIBATASI'}
                          </button>
                        </td>
                        <td className="p-4 text-right pr-6 flex justify-end gap-2">
                          {!t.is_approved ? (
                            <button onClick={() => handleApproveAccount(t.id, t.email)} className="w-8 h-8 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white" title="Buka Blokir / Setujui"><i className="fa-solid fa-check"></i></button>
                          ) : (
                            t.email !== ADMIN_EMAIL && <button onClick={() => handleBlockAccount(t.id, t.email)} className="w-8 h-8 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white" title="Blokir / Bekukan Akun"><i className="fa-solid fa-ban"></i></button>
                          )}
                          <button onClick={() => handleResetPassword(t.id, t.email)} className="w-8 h-8 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white" title="Reset Password"><i className="fa-solid fa-key"></i></button>
                          {t.role !== 'admin' && <button onClick={() => handleDeleteAccount(t.id, t.email)} className="w-8 h-8 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white" title="Hapus Permanen"><i className="fa-solid fa-trash"></i></button>}
                        </td>
                      </tr>
                    ))}
                    
                    {/* SESSIONS */}
                    {activeTab === 'sessions' && sessions.map(s => (
                      <tr key={s.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="p-4 pl-6 font-bold">{s.title}</td>
                        <td className="p-4 text-indigo-300 font-bold">{getTeacherEmail(s.teacher_id)}</td>
                        <td className="p-4">{s.status} / <span className="text-teal-400 font-mono">{s.pin}</span></td>
                        <td className="p-4 text-right pr-6">
                          <button onClick={() => handleDeleteSession(s.id, s.title)} className="w-8 h-8 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white"><i className="fa-solid fa-trash"></i></button>
                        </td>
                      </tr>
                    ))}

                    {/* BANKS */}
                    {activeTab === 'banks' && banks.map(b => (
                      <tr key={b.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="p-4 pl-6 max-w-xs truncate">{b.q || '(Gambar)'}</td>
                        <td className="p-4 font-bold text-slate-400">{b.category}</td>
                        <td className="p-4 text-indigo-300 font-bold">{getTeacherEmail(b.teacher_id)}</td>
                      </tr>
                    ))}

                    {/* LOGS */}
                    {activeTab === 'logs' && logs.filter(l => 
                      getTeacherEmail(l.teacher_id).toLowerCase().includes(logFilter.toLowerCase()) || 
                      (l.action && l.action.toLowerCase().includes(logFilter.toLowerCase()))
                    ).sort((a, b) => logSortDesc ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at)).map(l => (
                      <tr key={l.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="p-4 pl-6 text-xs text-slate-400 whitespace-nowrap">{new Date(l.created_at).toLocaleString('id-ID')}</td>
                        <td className="p-4 text-indigo-300 font-bold">{getTeacherEmail(l.teacher_id)}</td>
                        <td className="p-4 font-bold">{l.action}</td>
                        <td className="p-4 text-slate-400">{l.details}</td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
