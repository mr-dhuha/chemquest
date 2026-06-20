import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function WaitingApproval() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center animate-[slideUpFade_0.5s_ease-out]">
        <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fa-solid fa-hourglass-half text-3xl animate-pulse"></i>
        </div>
        
        <h1 className="text-2xl font-black text-slate-800 mb-2">Akun Sedang Ditinjau</h1>
        <p className="text-slate-500 mb-8 font-medium leading-relaxed">
          Pendaftaran Anda berhasil! Namun, demi keamanan platform, akun Anda saat ini sedang menunggu persetujuan dari Super Admin. Silakan hubungi admin atau periksa kembali nanti.
        </p>

        <button 
          onClick={handleLogout}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all"
        >
          <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i> Keluar
        </button>
      </div>
    </div>
  );
}
