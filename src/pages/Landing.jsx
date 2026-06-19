import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AVATAR_LIST = ['🦊','🐼','🐯','🐸','🐶','🐱','🐭','🐹','🐰','🐻','🐨','🐷','🐮','🐵','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞'];

export default function Landing() {
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (mode) => {
    setError('');
    const cleanPin = pin.trim().toUpperCase();
    
    if (cleanPin.length !== 6) {
      setError("Masukkan PIN 6 Karakter!");
      return;
    }
    if (mode === 'student' && !name.trim()) {
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

    // mode === 'student'
    const { data: pData, error: pErr } = await supabase.from('players').insert({
      session_id: sessionData.id,
      name: name.substring(0, 15),
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

    // Save player record id in local storage or state to pass it to quiz route
    localStorage.setItem('currentPlayerId', pData.id);
    localStorage.setItem('currentSessionId', sessionData.id);
    
    setLoading(false);
    navigate(`/quiz/${cleanPin}`);
  };

  return (
    <section className="flex-1 bg-gradient-to-br from-teal-50 via-sky-50 to-amber-50 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button onClick={() => navigate('/teacher')} className="text-teal-600 hover:text-white bg-white hover:bg-teal-500 px-5 py-2.5 rounded-2xl shadow-sm text-sm font-bold border-2 border-teal-100 hover:border-teal-500 transition-all">
          <i className="fa-solid fa-chalkboard-user mr-1"></i> Area Guru
        </button>
      </div>

      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-[2rem] shadow-2xl border-4 border-white">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-teal-400 to-sky-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-200 transform rotate-3">
            <i className="fa-solid fa-flask text-4xl text-white -rotate-3"></i>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight">Chem<span className="text-teal-500">Quest</span></h1>
          <p className="text-slate-500 font-bold mt-2">Arena Belajar Interaktif</p>
        </div>
        
        <div className="space-y-5">
          <div>
            <input 
              type="text" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-4 border-2 border-slate-200 bg-slate-50 rounded-2xl focus:bg-white focus:border-teal-500 outline-none text-center text-3xl font-black uppercase tracking-[0.3em] text-slate-700 placeholder:text-slate-300 transition-colors" 
              placeholder="PIN" 
              maxLength="6" 
            />
          </div>
          <div>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 border-2 border-slate-200 bg-slate-50 rounded-2xl focus:bg-white focus:border-teal-500 outline-none font-bold text-center text-lg placeholder:text-slate-400 transition-colors" 
              placeholder="Nama Panggilanmu" 
            />
          </div>
          <div>
            <p className="text-sm font-black text-slate-500 mb-3 text-center uppercase tracking-wide">Pilih Karaktermu</p>
            <div className="flex flex-wrap justify-center gap-2 max-h-40 overflow-y-auto p-3 border-2 border-slate-100 bg-slate-50 rounded-2xl hide-scrollbar">
              {AVATAR_LIST.map(a => (
                <button 
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-3xl sm:text-4xl p-2 rounded-2xl transition-all transform hover:scale-110 border-4 ${avatar === a ? 'bg-white border-teal-400 shadow-md' : 'border-transparent hover:border-slate-200 hover:bg-white'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={() => handleJoin('student')} 
            disabled={loading}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black text-xl py-4 rounded-2xl mt-2 transition-all shadow-lg shadow-teal-500/30 transform hover:-translate-y-1 disabled:opacity-50"
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : ''} 
            MULAI KUIS
          </button>
          <button 
            onClick={() => handleJoin('spectator')} 
            disabled={loading}
            className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-black text-lg py-3 rounded-2xl transition-all shadow-sm transform hover:-translate-y-1 mt-2 disabled:opacity-50"
          >
            TONTON KLASEMEN ARENA
          </button>
          {error && <p className="text-rose-500 text-sm font-bold text-center bg-rose-50 p-3 rounded-xl border border-rose-100 mt-2">{error}</p>}
        </div>
      </div>
    </section>
  );
}
