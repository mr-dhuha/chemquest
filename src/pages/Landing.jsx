import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AVATAR_LIST = ['🦊','🐼','🐯','🐸','🐶','🐱','🐭','🐹','🐰','🐻','🐨','🐷','🐮','🐵','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞'];

export default function Landing() {
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const pinParam = searchParams.get('pin');
    if (pinParam) {
      setPin(pinParam.toUpperCase());
    }
  }, [searchParams]);

  const handleJoin = async (mode) => {
    setError('');
    const cleanPin = pin.trim().toUpperCase();
    
    if (cleanPin.length !== 6) {
      setError("Masukkan PIN 6 Karakter!");
      return;
    }
    const cleanName = name.trim().substring(0, 15);
    if (mode === 'student' && !cleanName) {
      setError("Masukkan Namamu!");
      return;
    }

    setLoading(true);

    const { data: sessionData, error: sessErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('pin', cleanPin)
      .eq('status', 'live')
      .single();

    if (sessErr || !sessionData) {
      setLoading(false);
      setError("PIN Tidak Valid atau Gerbang Kuis belum dibuka.");
      return;
    }

    if (mode === 'spectator') {
      setLoading(false);
      navigate(`/arena/${cleanPin}`, { state: { session: sessionData } });
      return;
    }

    // Check for duplicate name
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('id, name')
      .eq('session_id', sessionData.id)
      .ilike('name', cleanName);

    if (existingPlayers && existingPlayers.length > 0) {
      setLoading(false);
      setError(`Nama "${cleanName}" sudah dipakai di arena ini! Silakan tambahkan angka atau gunakan nama lain.`);
      return;
    }

    // mode === 'student'
    const { data: pData, error: pErr } = await supabase.from('players').insert({
      session_id: sessionData.id,
      name: cleanName,
      avatar: avatar,
      score: 0,
      progress: 0,
      categoryScores: {},
      refleksi: ""
    }).select().single();

    if (pErr) {
      setLoading(false);
      setError("Gagal masuk: " + pErr.message);
      return;
    }

    localStorage.setItem('currentPlayerId', pData.id);
    localStorage.setItem('currentSessionId', sessionData.id);
    
    setLoading(false);
    navigate(`/quiz/${cleanPin}`);
  };

  return (
    <section className="min-h-screen bg-slate-900 overflow-hidden relative flex flex-col justify-center items-center p-4">
      {/* Animated Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-teal-500/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-sky-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] bg-indigo-500/20 rounded-full blur-[90px] animate-pulse" style={{ animationDelay: '4s' }}></div>

      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50">
        <button onClick={() => navigate('/teacher')} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg border border-white/20 hover:border-white/40 transition-all font-bold tracking-wide flex items-center gap-2">
          <i className="fa-solid fa-chalkboard-user"></i> Area Guru
        </button>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Hero Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-tr from-teal-400 to-sky-400 rounded-3xl mb-6 shadow-[0_0_40px_rgba(45,212,191,0.4)] transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <i className="fa-solid fa-flask text-5xl text-white"></i>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-3 drop-shadow-lg">
            Chem<span className="text-teal-400">Quest</span>
          </h1>
          <p className="text-sky-200/80 font-medium text-lg tracking-wide uppercase">Petualangan Kimia Interaktif</p>
        </div>
        
        {/* Glassmorphism Card */}
        <div className="bg-white/10 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          
          <div className="space-y-6 relative z-10">
            <div className="relative group">
              <input 
                type="text" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full p-5 bg-black/20 border-2 border-white/10 rounded-2xl focus:bg-black/40 focus:border-teal-400 outline-none text-center text-4xl font-black uppercase tracking-[0.3em] text-white placeholder:text-white/30 transition-all shadow-inner" 
                placeholder="PIN" 
                maxLength="6" 
              />
              <div className="absolute inset-0 border-2 border-teal-400 rounded-2xl opacity-0 group-focus-within:opacity-100 group-focus-within:animate-pulse pointer-events-none"></div>
            </div>
            
            <div>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 bg-black/20 border-2 border-white/10 rounded-2xl focus:bg-black/40 focus:border-sky-400 outline-none font-bold text-center text-xl text-white placeholder:text-white/30 transition-all shadow-inner" 
                placeholder="Nama Panggilanmu" 
                maxLength="15"
              />
            </div>
            
            <div className="pt-2">
              <p className="text-xs font-black text-sky-200/70 mb-3 text-center uppercase tracking-widest">Pilih Avatar Jawaramu</p>
              <div className="flex flex-wrap justify-center gap-2 max-h-40 overflow-y-auto p-4 bg-black/20 border-2 border-white/10 rounded-2xl hide-scrollbar shadow-inner">
                {AVATAR_LIST.map(a => (
                  <button 
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`text-3xl p-2 rounded-2xl transition-all transform duration-300 ${avatar === a ? 'bg-white/20 border-2 border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.5)] scale-110' : 'border-2 border-transparent hover:bg-white/10 hover:scale-105 opacity-70 hover:opacity-100'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="pt-4 space-y-3">
              <button 
                onClick={() => handleJoin('student')} 
                disabled={loading}
                className="w-full bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-white font-black text-xl py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(45,212,191,0.4)] hover:shadow-[0_0_30px_rgba(45,212,191,0.6)] transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center gap-2"
              >
                {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-rocket"></i>} 
                MULAI PETUALANGAN
              </button>
              
              <button 
                onClick={() => handleJoin('spectator')} 
                disabled={loading}
                className="w-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-bold text-sm py-3 rounded-2xl transition-all border border-white/10 hover:border-white/20 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                <i className="fa-solid fa-tv"></i> Tonton Klasemen Arena
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl backdrop-blur-sm animate-shake">
                <p className="text-rose-200 text-sm font-bold text-center flex items-center justify-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i> {error}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-center mt-8 text-white/30 text-xs font-bold uppercase tracking-widest">
          Build with ❤️ for Chemistry Students
        </p>
      </div>
    </section>
  );
}
