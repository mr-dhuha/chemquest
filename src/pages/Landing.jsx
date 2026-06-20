import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PREDEFINED_AVATARS = [
  'Felix', 'Aneka', 'Oliver', 'Luna', 'Jasper', 'Zoe', 'Sam', 'Mia', 'Leo', 'Nova',
  'Jack', 'Bella', 'Max', 'Chloe', 'Charlie', 'Lucy', 'Cooper', 'Lily', 'Milo', 'Nala'
];

export default function Landing() {
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(() => Math.floor(Math.random() * PREDEFINED_AVATARS.length));
  const avatarSeed = PREDEFINED_AVATARS[avatarIndex];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const pinParam = searchParams.get('pin');
    if (pinParam) {
      setPin(pinParam.toUpperCase());
    }
  }, [searchParams]);

  const randomizeAvatar = () => {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * PREDEFINED_AVATARS.length);
    } while (newIndex === avatarIndex);
    setAvatarIndex(newIndex);
  };

  const nextAvatar = () => setAvatarIndex((prev) => (prev + 1) % PREDEFINED_AVATARS.length);
  const prevAvatar = () => setAvatarIndex((prev) => (prev - 1 + PREDEFINED_AVATARS.length) % PREDEFINED_AVATARS.length);

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
      setError("PIN Tidak Valid atau Kelas belum dibuka.");
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
      setError(`Nama "${cleanName}" sudah dipakai! Gunakan nama lain.`);
      return;
    }

    const { data: pData, error: pErr } = await supabase.from('players').insert({
      session_id: sessionData.id,
      name: cleanName,
      avatar: avatarSeed, // Simpan seed string-nya
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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200 flex flex-col">
      {/* Navigation Bar Minimalist */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
                <i className="fa-solid fa-flask"></i>
              </div>
              <h1 className="text-lg font-black text-slate-800 leading-tight">CHEMQUEST</h1>
            </div>

            <button onClick={() => navigate('/teacher')} className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-2">
              <i className="fa-solid fa-chalkboard-user"></i> Akses Guru
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center relative">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-10 w-64 h-64 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16 items-center relative z-10 w-full max-w-7xl">
          
          {/* Left: Phone Mockup */}
          <div className="flex justify-center lg:justify-end h-full">
            <div className="w-64 h-[500px] border-[12px] border-slate-800 rounded-[3rem] relative shadow-2xl overflow-hidden bg-slate-50 flex-shrink-0 animate-[float_4s_ease-in-out_infinite] self-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-b-xl z-10"></div>
              <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-100 to-emerald-50">
                <div className="w-32 h-32 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center relative overflow-hidden mb-8">
                  <i className="fa-solid fa-qrcode text-6xl text-slate-800 relative z-10"></i>
                  <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400 animate-[scan_2s_linear_infinite] shadow-[0_0_8px_rgba(52,211,153,0.8)] z-20"></div>
                </div>
                <div className="inline-block bg-emerald-100 text-emerald-700 text-xs font-black uppercase px-3 py-1 rounded mb-2 tracking-widest text-center">Dukungan HP</div>
                <div className="text-[12px] font-black text-center text-indigo-900 uppercase tracking-widest leading-tight">Cukup Scan QR<br/>Kamera HP</div>
              </div>
            </div>
          </div>

          {/* Middle: Content Text */}
          <div className="text-center lg:text-left flex flex-col justify-center h-full">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6 mx-auto lg:mx-0">
              <i className="fa-solid fa-gamepad"></i>
              <span>LMS Berbasis Permainan</span>
            </div>
            
            <h2 className="text-4xl xl:text-5xl font-black text-slate-800 tracking-tight leading-tight mb-6">
              Misi Pembelajaran<br />Kimia Interaktif.
            </h2>
            
            <p className="text-lg text-slate-600 font-medium mb-8 leading-relaxed">
              ChemQuest menggabungkan materi pembelajaran kimia, pre-test, dan tantangan kelas dalam satu pengalaman petualangan kooperatif. Siapkan PIN kelas dari gurumu untuk mulai mengeksplorasi.
            </p>

            <div className="flex flex-col gap-4 text-sm font-bold text-slate-500">
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <i className="fa-solid fa-check-circle text-emerald-500 text-lg"></i>
                Materi terstruktur dengan evaluasi langsung
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <i className="fa-solid fa-check-circle text-emerald-500 text-lg"></i>
                Visualisasi kemajuan melalui karakter penjelajah (Adventurer)
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <i className="fa-solid fa-check-circle text-emerald-500 text-lg"></i>
                Dukungan soal acak untuk mode ujian yang adil
              </div>
            </div>
          </div>

          {/* Right: Modern Login Card */}
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-white/50 w-full max-w-md mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400"></div>
            
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black text-slate-800">Masuk Kelas</h3>
              <p className="text-slate-500 font-medium text-sm mt-1">Buat karakter unikmu dan bergabung ke arena</p>
            </div>
            
            <div className="space-y-5">
              {/* Avatar Selector */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-28 h-28 bg-slate-100 rounded-full overflow-hidden border-4 border-white shadow-lg flex items-center justify-center relative z-10">
                    <img 
                      src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${avatarSeed}`} 
                      alt="Avatar RPG" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <button 
                    onClick={prevAvatar}
                    className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 z-20"
                    title="Avatar Sebelumnya"
                  >
                    <i className="fa-solid fa-chevron-left text-xs"></i>
                  </button>

                  <button 
                    onClick={nextAvatar}
                    className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 z-20"
                    title="Avatar Selanjutnya"
                  >
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </button>

                  <button 
                    onClick={randomizeAvatar}
                    className="absolute -bottom-2 right-0 left-0 mx-auto w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-20"
                    title="Acak Avatar"
                  >
                    <i className="fa-solid fa-dice text-lg"></i>
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Karakter Penjelajahmu</p>
              </div>

              <div>
                <input 
                  type="text" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 bg-white rounded-xl focus:border-blue-500 outline-none text-center text-2xl font-black uppercase tracking-[0.3em] text-slate-700 placeholder:text-slate-300 transition-colors shadow-sm" 
                  placeholder="PIN KELAS" 
                  maxLength="6" 
                />
              </div>
              
              <div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 bg-white rounded-xl focus:border-blue-500 outline-none font-bold text-center placeholder:text-slate-400 transition-colors shadow-sm" 
                  placeholder="Nama Panggilan" 
                  maxLength="15"
                />
              </div>
              
              <div className="pt-4">
                <button 
                  onClick={() => handleJoin('student')} 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-4 rounded-xl transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                >
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-play"></i>} 
                  MULAI PETUALANGAN
                </button>
                
                <button 
                  onClick={() => handleJoin('spectator')} 
                  disabled={loading}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-sm py-3 rounded-xl transition-all mt-3 border border-slate-200 disabled:opacity-50"
                >
                  <i className="fa-solid fa-tv"></i> Masuk Mode Penonton (Arena)
                </button>
              </div>

              {error && (
                <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-xl animate-shake">
                  <p className="text-rose-500 text-xs font-bold text-center flex items-center justify-center gap-1">
                    <i className="fa-solid fa-triangle-exclamation"></i> {error}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
