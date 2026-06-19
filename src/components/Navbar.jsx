import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Navbar({ session }) {
  const location = useLocation();
  const hiddenRoutes = ['/', '/arena', '/teacher', '/quiz'];
  
  // Hide navbar on standalone views (similar to original HTML logic)
  const isHidden = hiddenRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'));

  if (isHidden) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="bg-white border-b-2 border-slate-200 p-4 shadow-sm flex justify-between items-center z-50 sticky top-0 w-full">
      <Link to="/dashboard" className="font-black text-xl flex items-center gap-2 text-slate-800">
        <i className="fa-solid fa-flask text-teal-500 text-2xl"></i> Chem<span className="text-teal-500">Quest</span>
      </Link>
      <div className="flex items-center gap-4">
        {session && (
          <>
            {session.user?.email === 'mrdhuhaofficial@gmail.com' && (
              <Link to="/superadmin" className="text-sm bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors px-3 py-2 rounded-xl font-black border border-rose-100 hidden sm:block">
                <i className="fa-solid fa-shield-halved mr-1"></i> Admin
              </Link>
            )}
            <span className="text-sm font-bold text-slate-500 hidden sm:block">
              {session.user?.email?.split('@')[0] || 'Guru'}
            </span>
            <button 
              onClick={handleLogout} 
              className="text-sm bg-slate-100 text-slate-600 hover:bg-rose-500 hover:text-white transition-colors px-4 py-2 rounded-xl font-bold"
            >
              <i className="fa-solid fa-sign-out-alt mr-1"></i> Keluar
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
