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
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const pinParam = searchParams.get('pin');
    if (pinParam) {
      setPin(pinParam.toUpperCase());
      setShowJoinModal(true);
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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border-2 border-blue-100">
                <i className="fa-solid fa-flask text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 leading-tight">CHEMQUEST</h1>
                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Belajar Kimia Seperti Game</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-8">
              <a href="#" className="text-blue-600 font-bold border-b-2 border-blue-600 py-2">Beranda</a>
              <a href="#" className="text-slate-500 hover:text-slate-800 font-bold py-2 transition-colors">Untuk Siswa</a>
              <a href="#" className="text-slate-500 hover:text-slate-800 font-bold py-2 transition-colors">Untuk Guru</a>
              <a href="#" className="text-slate-500 hover:text-slate-800 font-bold py-2 transition-colors">Fitur</a>
              <a href="#" className="text-slate-500 hover:text-slate-800 font-bold py-2 transition-colors">Tentang</a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/teacher')} className="hidden sm:block px-5 py-2.5 text-slate-600 hover:text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition-colors">Masuk</button>
              <button onClick={() => navigate('/teacher')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-0.5">Daftar / Coba Gratis</button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-50 z-0"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-3xl opacity-50 z-0"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Content */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6">
                <i className="fa-solid fa-graduation-cap"></i>
                <span>Belajar • Bermain • Berprestasi</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-black text-slate-800 tracking-tight leading-[1.1] mb-6">
                Belajar Kimia<br />Jadi Lebih <span className="text-blue-600">Seru</span>
              </h1>
              
              <p className="text-lg text-slate-500 font-medium mb-8 leading-relaxed max-w-lg">
                ChemQuest adalah platform pembelajaran kimia berbasis game. Kerjakan kuis, kumpulkan XP, naik level, dan jadi yang terbaik di kelasmu!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => setShowJoinModal(true)} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black shadow-xl shadow-blue-600/20 transition-all transform hover:-translate-y-1">
                  <i className="fa-solid fa-users"></i> Masuk Kelas
                </button>
                <button className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 px-8 py-4 rounded-xl font-black transition-all shadow-sm">
                  <i className="fa-solid fa-play text-blue-600"></i> Coba Demo
                </button>
              </div>
              
              <div className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-400">
                <i className="fa-solid fa-shield-halved text-emerald-500"></i>
                Aman, mudah, dan 100% gratis untuk siswa
              </div>
            </div>

            {/* Right Mockup Dashboard */}
            <div className="relative">
              {/* Floating elements to make it look dynamic */}
              <div className="absolute -top-6 -left-6 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-2xl animate-bounce" style={{ animationDuration: '3s' }}>⚛️</div>
              <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center text-3xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>📚</div>

              <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 sm:p-8 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Mockup Header */}
                <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 text-4xl flex items-center justify-center rounded-2xl border-4 border-white shadow-sm">👨‍🎓</div>
                    <div>
                      <h3 className="font-black text-xl text-slate-800">Halo, Ahmad! 👋</h3>
                      <p className="text-sm font-bold text-slate-500 mb-1">Level 3 Chemist</p>
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-[70%] h-full bg-emerald-500 rounded-full"></div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">350 / 500 XP</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl text-center min-w-[80px]">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">Total XP</p>
                      <p className="font-black text-xl text-amber-600"><i className="fa-solid fa-star text-amber-400"></i> 350</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl text-center min-w-[80px]">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Ranking</p>
                      <p className="font-black text-xl text-blue-600"><i className="fa-solid fa-trophy text-amber-400"></i> 3 <span className="text-sm text-blue-400">/ 24</span></p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Left Column Mockup */}
                  <div>
                    <h4 className="font-black text-slate-700 mb-3 text-sm uppercase tracking-wider">Progress Materi</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 font-bold text-slate-700"><i className="fa-solid fa-circle-check text-emerald-500"></i> Atom</div>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full"><div className="w-full h-full bg-emerald-500 rounded-full"></div></div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 font-bold text-slate-700"><i className="fa-solid fa-circle-check text-emerald-500"></i> Molekul</div>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full"><div className="w-[60%] h-full bg-emerald-500 rounded-full"></div></div>
                      </div>
                      <div className="flex items-center justify-between text-sm opacity-50">
                        <div className="flex items-center gap-2 font-bold text-slate-500"><i className="fa-solid fa-lock text-slate-300"></i> Stoikiometri</div>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full"></div>
                      </div>
                      <div className="flex items-center justify-between text-sm opacity-50">
                        <div className="flex items-center gap-2 font-bold text-slate-500"><i className="fa-solid fa-lock text-slate-300"></i> Asam Basa</div>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full"></div>
                      </div>
                    </div>
                    <button className="text-blue-500 text-xs font-bold mt-4 hover:underline">Lihat semua materi <i className="fa-solid fa-arrow-right"></i></button>
                  </div>

                  {/* Right Column Mockup */}
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="font-black text-slate-700 mb-2 text-xs uppercase tracking-wider">Kuis Hari Ini</h4>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-500 rounded-lg flex items-center justify-center shrink-0"><i className="fa-solid fa-clipboard-list"></i></div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">Stoikiometri Dasar</p>
                          <p className="text-xs font-bold text-slate-400">20 soal</p>
                        </div>
                      </div>
                      <button className="w-full bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg">Mulai Kuis</button>
                    </div>

                    <div>
                      <h4 className="font-black text-slate-700 mb-2 text-xs uppercase tracking-wider">Badge Saya</h4>
                      <div className="flex gap-2">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm"><i className="fa-solid fa-flask"></i></div>
                        <div className="w-10 h-10 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm"><i className="fa-solid fa-share-nodes"></i></div>
                        <div className="w-10 h-10 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm"><i className="fa-solid fa-vial"></i></div>
                        <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center border-2 border-white shadow-sm"><i className="fa-solid fa-lock"></i></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl shrink-0"><i className="fa-solid fa-gamepad"></i></div>
              <div>
                <h3 className="font-black text-slate-800 mb-1">Belajar Sambil Bermain</h3>
                <p className="text-sm text-slate-500 font-medium">Kuis interaktif dan tantangan seru untuk memahami kimia.</p>
              </div>
            </div>
            {/* Feature 2 */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl shrink-0"><i className="fa-solid fa-star"></i></div>
              <div>
                <h3 className="font-black text-slate-800 mb-1">Kumpulkan XP & Badge</h3>
                <p className="text-sm text-slate-500 font-medium">Dapatkan XP, buka badge, dan naik level seperti game.</p>
              </div>
            </div>
            {/* Feature 3 */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl shrink-0"><i className="fa-solid fa-trophy"></i></div>
              <div>
                <h3 className="font-black text-slate-800 mb-1">Bersaing Sehat</h3>
                <p className="text-sm text-slate-500 font-medium">Lihat peringkat kelas dan jadi yang terbaik!</p>
              </div>
            </div>
            {/* Feature 4 */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center text-2xl shrink-0"><i className="fa-solid fa-chart-simple"></i></div>
              <div>
                <h3 className="font-black text-slate-800 mb-1">Pantau Perkembangan</h3>
                <p className="text-sm text-slate-500 font-medium">Guru dan siswa dapat melihat kemajuan belajar dengan mudah.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-800">Cara Kerja ChemQuest</h2>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-blue-100 -translate-y-1/2 z-0"></div>
            
            {[
              { num: 1, title: 'Masuk Kelas', desc: 'Masukkan PIN kelas dari gurumu.', icon: '123' },
              { num: 2, title: 'Pilih Materi', desc: 'Pilih materi atau misi yang tersedia.', icon: '📖' },
              { num: 3, title: 'Kerjakan Kuis', desc: 'Jawab soal dengan benar dan kumpulkan poin.', icon: '📝' },
              { num: 4, title: 'Dapat XP', desc: 'Setiap jawaban benar memberikan XP.', icon: '⭐' },
              { num: 5, title: 'Naik Level', desc: 'Kumpulkan XP untuk naik level lebih tinggi.', icon: '🏅' },
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center max-w-[180px] bg-slate-50 md:bg-transparent">
                <div className="w-16 h-16 bg-white rounded-full border-4 border-blue-100 flex items-center justify-center text-2xl shadow-sm mb-4">
                  {step.icon}
                </div>
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-black absolute top-0 right-10 border-2 border-white">{step.num}</div>
                <h4 className="font-black text-slate-800 mb-2">{step.title}</h4>
                <p className="text-xs text-slate-500 font-bold">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner Section */}
      <section className="py-16 bg-white pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="text-6xl animate-bounce" style={{ animationDuration: '3s' }}>🚀</div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">Siap jadi Chemist terbaik?</h2>
                <p className="text-slate-500 font-bold">Mulai petualanganmu sekarang dan raih prestasi di setiap misi!</p>
              </div>
            </div>
            
            <button onClick={() => setShowJoinModal(true)} className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black shadow-xl shadow-blue-600/20 transition-all transform hover:-translate-y-1 relative z-10 flex items-center gap-2">
              Masuk Kelas Sekarang <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </section>

      {/* Join Modal Overlay */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-slideUpFade">
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/20 w-full max-w-md relative">
            <button onClick={() => setShowJoinModal(false)} className="absolute top-6 right-6 w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors">
              <i className="fa-solid fa-times"></i>
            </button>
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-400 to-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 transform rotate-3">
                <i className="fa-solid fa-flask text-3xl text-white -rotate-3"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Masuk Kelas</h2>
              <p className="text-slate-500 font-bold mt-1">Siapkan PIN dari gurumu!</p>
            </div>
            
            <div className="space-y-5">
              <div>
                <input 
                  type="text" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 bg-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none text-center text-3xl font-black uppercase tracking-[0.3em] text-slate-700 placeholder:text-slate-300 transition-colors" 
                  placeholder="PIN" 
                  maxLength="6" 
                />
              </div>
              <div>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 border-2 border-slate-200 bg-slate-50 rounded-2xl focus:bg-white focus:border-blue-500 outline-none font-bold text-center text-lg placeholder:text-slate-400 transition-colors" 
                  placeholder="Nama Panggilanmu" 
                  maxLength="15"
                />
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 mb-3 text-center uppercase tracking-wider">Pilih Avatar Jawaramu</p>
                <div className="flex flex-wrap justify-center gap-2 max-h-40 overflow-y-auto p-3 border-2 border-slate-100 bg-slate-50 rounded-2xl hide-scrollbar">
                  {AVATAR_LIST.map(a => (
                    <button 
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`text-3xl p-2 rounded-2xl transition-all transform duration-300 ${avatar === a ? 'bg-white border-2 border-blue-400 shadow-md scale-110' : 'border-2 border-transparent hover:bg-white hover:scale-105 opacity-70 hover:opacity-100'}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="pt-2">
                <button 
                  onClick={() => handleJoin('student')} 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xl py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/30 transform hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-rocket"></i>} 
                  MULAI KUIS
                </button>
                <button 
                  onClick={() => handleJoin('spectator')} 
                  disabled={loading}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm py-3 rounded-2xl transition-all mt-3 disabled:opacity-50"
                >
                  <i className="fa-solid fa-tv"></i> Tonton Klasemen Arena
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
      )}
    </div>
  );
}
