import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Quiz() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [player, setPlayer] = useState(null);
  
  // Categorized content
  const [pretestQs, setPretestQs] = useState([]);
  const [materiQs, setMateriQs] = useState([]);
  const [misiQs, setMisiQs] = useState([]);
  
  // LMS State
  const [activeModule, setActiveModule] = useState('hub'); // hub | pretest | materi | misi | reflection | finish | timeout
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refleksiText, setRefleksiText] = useState('');
  const [feedbackState, setFeedbackState] = useState(null);

  useEffect(() => {
    const pId = localStorage.getItem('currentPlayerId');
    const sId = localStorage.getItem('currentSessionId');
    if (!pId || !sId) {
      navigate('/');
      return;
    }
    initQuiz(pId, sId);
    
    // Setup timer to check ends_at periodically
    const timer = setInterval(() => {
      checkTime();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Make checkTime accessible to closure via ref or just check sessionData
  const checkTime = () => {
    setSessionData(prevSession => {
      if (prevSession && prevSession.config?.ends_at) {
        if (Date.now() >= prevSession.config.ends_at && prevSession.status === 'live') {
          setActiveModule('timeout');
        }
      }
      return prevSession;
    });
  };

  const initQuiz = async (pId, sId) => {
    const { data: pData } = await supabase.from('players').select('*').eq('id', pId).single();
    if (!pData) { navigate('/'); return; }
    setPlayer(pData);

    const { data: sData } = await supabase.from('sessions').select('*').eq('id', sId).single();
    setSessionData(sData);

    // If time is already up
    if (sData?.config?.ends_at && Date.now() >= sData.config.ends_at) {
      setActiveModule('timeout');
      setLoading(false);
      return;
    }

    const { data: qData } = await supabase.from('questions').select('*').eq('session_id', sId).order('created_at', { ascending: true });
    const allQs = qData || [];
    
    setPretestQs(allQs.filter(q => q.category === 'PRETEST'));
    setMateriQs(allQs.filter(q => q.category === 'MATERI'));
    setMisiQs(allQs.filter(q => q.category !== 'PRETEST' && q.category !== 'MATERI'));

    if (pData.progress >= 100) {
      setActiveModule('finish');
    } else {
      setActiveModule('hub');
    }
    
    setLoading(false);
  };

  const updatePlayerState = async (updates) => {
    const newPlayer = { ...player, ...updates };
    setPlayer(newPlayer);
    await supabase.from('players').update(updates).eq('id', player.id);
  };

  const markModuleDone = async (moduleName) => {
    const catScores = player.categoryScores || {};
    catScores[`${moduleName}_done`] = true;
    await updatePlayerState({ categoryScores: catScores });
    setActiveModule('hub');
  };

  const startModule = (mod) => {
    setCurrentIndex(0);
    setActiveModule(mod);
  };

  const handlePretestAnswer = async (selectedOpt) => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < pretestQs.length) {
      setCurrentIndex(nextIndex);
    } else {
      await markModuleDone('pretest');
    }
  };

  const handleMateriNext = async () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < materiQs.length) {
      setCurrentIndex(nextIndex);
    } else {
      await markModuleDone('materi');
    }
  };

  const handleMisiAnswer = async (selectedOpt) => {
    if (feedbackState) return;
    
    const currentQ = misiQs[currentIndex];
    const isCorrect = selectedOpt === currentQ.answer;
    
    let scoreChange = 0;
    if (isCorrect) {
      scoreChange = 10;
      setFeedbackState({ isCorrect: true, text: '+10 KECEPATAN!' });
    } else {
      setFeedbackState({ isCorrect: false, text: 'TERSANDUNG!' });
    }

    const newScore = player.score + scoreChange;
    const catScores = { ...player.categoryScores };
    if (isCorrect) catScores[currentQ.category] = (catScores[currentQ.category] || 0) + 10;
    
    const nextIndex = currentIndex + 1;
    const newProgress = (nextIndex / misiQs.length) * 100;
    
    await updatePlayerState({
      score: newScore,
      progress: newProgress,
      categoryScores: catScores
    });

    setTimeout(() => {
      setFeedbackState(null);
      if (nextIndex < misiQs.length) {
        setCurrentIndex(nextIndex);
      } else {
        setActiveModule('reflection');
      }
    }, 1200);
  };

  const submitReflection = async () => {
    const txt = refleksiText.trim() || "Selesai mengerjakan!";
    await updatePlayerState({ refleksi: txt });
    setActiveModule('finish');
  };

  const logoutStudent = () => {
    localStorage.removeItem('currentPlayerId');
    localStorage.removeItem('currentSessionId');
    navigate('/');
  };

  if (loading) {
    return (
      <section className="flex-1 bg-slate-50 flex items-center justify-center">
        <i className="fa-solid fa-spinner fa-spin text-5xl text-teal-400"></i>
      </section>
    );
  }

  const config = sessionData?.config || {};
  const catScores = player?.categoryScores || {};
  const isSeq = config.flow === 'sequential';

  // Lock logic
  const isPretestLocked = false;
  const isMateriLocked = isSeq && config.enablePretest && pretestQs.length > 0 && !catScores.pretest_done;
  const isMisiLocked = isSeq && ((config.enablePretest && pretestQs.length > 0 && !catScores.pretest_done) || (config.enableMateri && materiQs.length > 0 && !catScores.materi_done));

  // --- RENDERS ---

  if (activeModule === 'timeout') {
    return (
      <section className="py-6 px-4 flex-1 bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-rose-500/10"></div>
        <i className="fa-regular fa-clock text-9xl text-rose-500 mb-6 drop-shadow-lg animate-pulse"></i>
        <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tight">Waktu Habis!</h2>
        <p className="text-xl font-bold text-slate-500 text-center max-w-md mb-8">Gerbang arena telah ditutup oleh guru. Silakan lihat layar guru untuk hasil klasemen podium!</p>
        <button onClick={logoutStudent} className="bg-slate-800 hover:bg-slate-900 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl">
          Tutup
        </button>
      </section>
    );
  }

  if (activeModule === 'hub') {
    return (
      <section className="py-8 px-4 flex-1 bg-slate-50">
        <div className="max-w-3xl mx-auto w-full">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5 mb-8">
            <div className="text-5xl">{player?.avatar}</div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">{player?.name}</h2>
              <p className="font-bold text-slate-400">Peta Pembelajaran ChemQuest</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Skor Misi</p>
              <p className="text-3xl font-black text-teal-500">{player?.score}</p>
            </div>
          </div>

          <div className="space-y-4 relative">
            {/* Connecting line */}
            <div className="absolute left-[39px] top-10 bottom-10 w-1 bg-slate-200 z-0"></div>

            {config.enablePretest && pretestQs.length > 0 && (
              <div className="relative z-10 flex gap-4">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shadow-inner shrink-0 ${catScores.pretest_done ? 'bg-emerald-100 text-emerald-500 border-2 border-emerald-200' : 'bg-white border-4 border-slate-200 text-slate-300'}`}>
                  {catScores.pretest_done ? <i className="fa-solid fa-check"></i> : '1'}
                </div>
                <div className="bg-white flex-1 p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center group hover:border-sky-200 transition-colors">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Pre-Test</h3>
                    <p className="text-sm font-bold text-slate-400">Uji kemampuan awalmu ({pretestQs.length} Soal)</p>
                  </div>
                  {!catScores.pretest_done ? (
                    <button onClick={() => startModule('pretest')} className="bg-sky-100 text-sky-600 hover:bg-sky-500 hover:text-white px-6 py-3 rounded-xl font-black transition-colors">Mulai</button>
                  ) : (
                    <span className="text-emerald-500 font-black"><i className="fa-solid fa-check-circle mr-1"></i> Selesai</span>
                  )}
                </div>
              </div>
            )}

            {config.enableMateri && materiQs.length > 0 && (
              <div className="relative z-10 flex gap-4">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shadow-inner shrink-0 ${catScores.materi_done ? 'bg-emerald-100 text-emerald-500 border-2 border-emerald-200' : isMateriLocked ? 'bg-slate-100 text-slate-300 border-2 border-slate-200' : 'bg-white border-4 border-slate-200 text-slate-300'}`}>
                  {catScores.materi_done ? <i className="fa-solid fa-check"></i> : isMateriLocked ? <i className="fa-solid fa-lock"></i> : '2'}
                </div>
                <div className={`bg-white flex-1 p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center transition-colors ${isMateriLocked ? 'opacity-50' : 'hover:border-amber-200'}`}>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Materi Interaktif</h3>
                    <p className="text-sm font-bold text-slate-400">Pelajari konsep penting ({materiQs.length} Halaman)</p>
                  </div>
                  {!catScores.materi_done ? (
                    <button onClick={() => startModule('materi')} disabled={isMateriLocked} className={`px-6 py-3 rounded-xl font-black transition-colors ${isMateriLocked ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700 hover:bg-amber-500 hover:text-white'}`}>
                      {isMateriLocked ? 'Terkunci' : 'Baca Materi'}
                    </button>
                  ) : (
                    <span className="text-emerald-500 font-black"><i className="fa-solid fa-check-circle mr-1"></i> Selesai</span>
                  )}
                </div>
              </div>
            )}

            {config.enableMisi && misiQs.length > 0 && (
              <div className="relative z-10 flex gap-4">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black shadow-inner shrink-0 ${player.progress >= 100 ? 'bg-emerald-100 text-emerald-500 border-2 border-emerald-200' : isMisiLocked ? 'bg-slate-100 text-slate-300 border-2 border-slate-200' : 'bg-teal-500 text-white shadow-teal-500/40 shadow-lg'}`}>
                  {player.progress >= 100 ? <i className="fa-solid fa-check"></i> : isMisiLocked ? <i className="fa-solid fa-lock"></i> : <i className="fa-solid fa-gamepad"></i>}
                </div>
                <div className={`bg-white flex-1 p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center transition-colors ${isMisiLocked ? 'opacity-50' : 'hover:border-teal-400 border-2 border-teal-100'}`}>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Misi Utama (Arena)</h3>
                    <p className="text-sm font-bold text-slate-400">Raih skor tertinggi di lintasan ({misiQs.length} Soal)</p>
                  </div>
                  {player.progress < 100 ? (
                    <button onClick={() => startModule('misi')} disabled={isMisiLocked} className={`px-6 py-3 rounded-xl font-black transition-colors ${isMisiLocked ? 'bg-slate-100 text-slate-400' : 'bg-teal-500 text-white hover:bg-teal-600 shadow-md'}`}>
                      {isMisiLocked ? 'Terkunci' : player.progress > 0 ? 'Lanjutkan' : 'Masuk Arena'}
                    </button>
                  ) : (
                    <span className="text-emerald-500 font-black"><i className="fa-solid fa-medal mr-1"></i> Selesai</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Generic Question Renderer for Pretest and Misi
  const renderQuestion = (qsArray, handler) => {
    const currentQ = qsArray[currentIndex];
    let opts = [];
    try { opts = typeof currentQ?.options === 'string' ? JSON.parse(currentQ.options) : currentQ?.options || []; } 
    catch(e) { opts = []; }

    const progressPct = ((currentIndex) / qsArray.length) * 100;

    return (
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveModule('hub')} className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center font-black transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
            <span className="font-black text-slate-700 uppercase tracking-widest text-sm">{activeModule === 'pretest' ? 'PRE-TEST' : 'MISI UTAMA'}</span>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-slate-800"><span className="text-teal-500">{currentIndex + 1}</span>/<span>{qsArray.length}</span></p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-200 rounded-full mb-8 mt-2 overflow-hidden shadow-inner border border-slate-300">
          <div className="h-full bg-gradient-to-r from-teal-400 to-sky-500 transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }}></div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-10 relative overflow-hidden">
          {currentQ.imageBase64 && (
            <div className="mb-8 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <img src={currentQ.imageBase64} className="w-full max-h-64 object-contain bg-slate-50 mx-auto" />
              {currentQ.caption && <div className="bg-slate-800/5 text-slate-600 p-3 text-sm font-bold text-center border-t border-slate-100">{currentQ.caption}</div>}
            </div>
          )}
          
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-10 text-center leading-tight">{currentQ.q}</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {opts.map((opt, i) => (
              <button 
                key={i} 
                onClick={() => handler(opt)}
                disabled={!!feedbackState}
                className={`p-5 text-lg font-black rounded-2xl border-4 border-slate-100 bg-white text-slate-700 transition-all text-left flex items-center justify-between group 
                  ${feedbackState ? 'opacity-50' : 'hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 hover:shadow-md'}`}
              >
                <span>{opt}</span> 
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Overlay */}
        {feedbackState && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] bg-white/60 backdrop-blur-sm">
            <div className={`px-10 py-8 rounded-[2rem] font-black text-3xl shadow-2xl transition-all duration-300 flex flex-col items-center text-center gap-3 border-4 bg-white
              ${feedbackState.isCorrect ? 'border-emerald-400 text-emerald-500' : 'border-rose-400 text-rose-500'}`}>
              <i className={`text-7xl drop-shadow-md ${feedbackState.isCorrect ? 'fa-solid fa-bolt text-amber-400' : 'fa-solid fa-triangle-exclamation text-rose-500'}`}></i>
              <span>{feedbackState.text}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (activeModule === 'pretest') {
    return <section className="py-6 px-4 flex-1 bg-slate-50">{renderQuestion(pretestQs, handlePretestAnswer)}</section>;
  }

  if (activeModule === 'misi') {
    return <section className="py-6 px-4 flex-1 bg-slate-50">{renderQuestion(misiQs, handleMisiAnswer)}</section>;
  }

  if (activeModule === 'materi') {
    const currentM = materiQs[currentIndex];
    const progressPct = ((currentIndex) / materiQs.length) * 100;
    
    return (
      <section className="py-6 px-4 flex-1 bg-slate-50">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <button onClick={() => setActiveModule('hub')} className="text-slate-400 hover:text-slate-800 font-black flex items-center gap-2"><i className="fa-solid fa-arrow-left"></i> Hub</button>
            <span className="font-black text-slate-800 bg-amber-100 text-amber-700 px-3 py-1 rounded-lg uppercase text-xs">Materi Pembelajaran</span>
            <span className="font-black text-slate-500">{currentIndex + 1} / {materiQs.length}</span>
          </div>

          <div className="w-full h-2 bg-slate-200 rounded-full mb-6 overflow-hidden">
            <div className="h-full bg-amber-400 transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }}></div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden mb-6">
            {currentM.imageBase64 && (
              <div className="bg-slate-900 flex justify-center border-b border-slate-100">
                <img src={currentM.imageBase64} className="max-h-96 w-auto object-contain" />
              </div>
            )}
            <div className="p-8 sm:p-12">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-800 mb-6 leading-tight">{currentM.q}</h2>
              <div className="prose prose-lg text-slate-600 max-w-none prose-p:font-medium whitespace-pre-wrap">
                {currentM.caption}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleMateriNext} className="bg-amber-500 hover:bg-amber-600 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-amber-500/30 flex items-center gap-3 transition-transform hover:-translate-y-1">
              {currentIndex + 1 < materiQs.length ? 'Halaman Selanjutnya' : 'Tandai Selesai'} <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (activeModule === 'reflection') {
    return (
      <section className="py-6 px-4 flex-1 bg-slate-50">
        <div className="max-w-xl mx-auto mt-10">
          <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border-t-8 border-teal-500 text-center">
            <div className="w-20 h-20 bg-teal-50 text-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
              <i className="fa-solid fa-comment-dots text-4xl -rotate-3"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3">Garis Finish Terlihat!</h2>
            <p className="font-bold text-slate-500 mb-8">Ceritakan singkat refleksi atau perasaanmu tentang pembelajaran ini.</p>
            <textarea 
              value={refleksiText} 
              onChange={e => setRefleksiText(e.target.value)} 
              className="w-full h-36 p-5 border-2 border-slate-200 bg-slate-50 rounded-2xl focus:bg-white focus:border-teal-500 outline-none resize-none mb-8 font-medium text-lg placeholder:text-slate-300" 
              placeholder="Ketik refleksimu di sini..."
            ></textarea>
            <button onClick={submitReflection} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black text-xl py-5 rounded-2xl shadow-lg transition-transform hover:-translate-y-1">
              Kirim & Selesaikan Balapan
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (activeModule === 'finish') {
    return (
      <section className="py-6 px-4 flex-1 bg-slate-50">
        <div className="max-w-md mx-auto mt-10 text-center bg-white p-10 sm:p-14 rounded-[3rem] shadow-2xl border-4 border-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=')] opacity-50 z-0"></div>
          <div className="relative z-10">
            <i className="fa-solid fa-medal text-7xl text-amber-400 mb-6 drop-shadow-lg animate-bounce block mx-auto"></i>
            <h2 className="text-3xl font-black mb-2 text-slate-800">Luar Biasa!</h2>
            <p className="font-bold text-slate-500 mb-8">Kamu telah menyelesaikan semua tahapan.</p>
            <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 mb-10">
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Skor Akhir</p>
              <div className="text-6xl font-black text-teal-500">{player?.score}</div>
            </div>
            <button onClick={logoutStudent} className="text-slate-500 font-bold hover:text-slate-800 transition-colors flex items-center justify-center gap-2 mx-auto">
              <i className="fa-solid fa-door-open"></i> Keluar Kelas
            </button>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
