import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Quiz() {
  const { pin } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [player, setPlayer] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [refleksiText, setRefleksiText] = useState('');
  const [quizPhase, setQuizPhase] = useState('playing'); // playing | reflection | finish
  const [feedbackState, setFeedbackState] = useState(null); // { isCorrect, text }

  useEffect(() => {
    const pId = localStorage.getItem('currentPlayerId');
    const sId = localStorage.getItem('currentSessionId');
    if (!pId || !sId) {
      navigate('/');
      return;
    }
    
    initQuiz(pId, sId);
  }, []);

  const initQuiz = async (pId, sId) => {
    const { data: pData } = await supabase.from('players').select('*').eq('id', pId).single();
    if (!pData) { navigate('/'); return; }
    setPlayer(pData);

    const { data: sData } = await supabase.from('sessions').select('*').eq('id', sId).single();
    setSessionData(sData);

    const { data: qData } = await supabase.from('questions').select('*').eq('session_id', sId).order('created_at', { ascending: true });
    setQuestions(qData || []);
    
    // Check if player already finished based on progress
    if (pData.progress >= 100) {
      setQuizPhase('finish');
    } else {
      // Find where they left off (simple approach: use their progress to guess index)
      // For simplicity, just start from where they are based on progress percentage
      const estimatedIndex = Math.floor((pData.progress / 100) * (qData?.length || 1));
      setCurrentIndex(Math.min(estimatedIndex, (qData?.length || 1) - 1));
    }
    
    setLoading(false);
  };

  const handleAnswer = async (selectedOpt) => {
    if (feedbackState) return; // Prevent double clicking
    
    const currentQ = questions[currentIndex];
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
    if (isCorrect) {
      catScores[currentQ.category] = (catScores[currentQ.category] || 0) + 10;
    }
    
    const nextIndex = currentIndex + 1;
    const newProgress = (nextIndex / questions.length) * 100;
    
    const newPlayerState = {
      ...player,
      score: newScore,
      progress: newProgress,
      categoryScores: catScores
    };
    
    setPlayer(newPlayerState);

    // Update DB asynchronously
    supabase.from('players').update({
      score: newScore,
      progress: newProgress,
      categoryScores: catScores
    }).eq('id', player.id).then();

    setTimeout(() => {
      setFeedbackState(null);
      if (nextIndex < questions.length) {
        setCurrentIndex(nextIndex);
      } else {
        setQuizPhase('reflection');
      }
    }, 1200);
  };

  const submitReflection = async () => {
    const txt = refleksiText.trim() || "Selesai mengerjakan!";
    await supabase.from('players').update({ refleksi: txt }).eq('id', player.id);
    setQuizPhase('finish');
  };

  const logoutStudent = () => {
    localStorage.removeItem('currentPlayerId');
    localStorage.removeItem('currentSessionId');
    navigate('/');
  };

  if (loading) {
    return (
      <section className="py-6 px-4 flex-1 bg-slate-50 overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center h-full pt-20">
          <i className="fa-solid fa-spinner fa-spin text-5xl text-teal-400 mb-4"></i>
          <h2 className="text-2xl font-black text-slate-800 animate-pulse">Menyiapkan Kuis...</h2>
        </div>
      </section>
    );
  }

  if (questions.length === 0) {
    return (
      <section className="py-6 px-4 flex-1 bg-slate-50 flex items-center justify-center">
        <div className='text-center font-black text-slate-500 text-xl bg-white p-10 rounded-3xl shadow-sm border border-slate-200'>
          Kuis belum siap.<br/>Guru belum menambahkan soal.
        </div>
      </section>
    );
  }

  const currentQ = questions[currentIndex];
  let opts = [];
  try { opts = typeof currentQ?.options === 'string' ? JSON.parse(currentQ.options) : currentQ?.options || []; } 
  catch(e) { opts = []; }

  const progressPct = ((currentIndex) / questions.length) * 100;

  return (
    <section className="py-6 px-4 flex-1 bg-slate-50 overflow-y-auto relative">
      {quizPhase === 'playing' && (
        <div className="max-w-3xl mx-auto w-full">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-amber-300">
                {player?.avatar}
              </div>
              <div>
                <p className="font-black text-slate-800 text-lg leading-none mb-1">{player?.name}</p>
                <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-black bg-emerald-100 text-emerald-700">
                  <i className="fa-solid fa-star mr-1 text-emerald-500"></i> <span>{player?.score} Poin</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Soal</p>
              <p className="text-xl font-black text-slate-800"><span className="text-teal-500">{currentIndex + 1}</span>/<span>{questions.length}</span></p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-200 rounded-full mb-8 mt-2 overflow-hidden shadow-inner border border-slate-300">
            <div className="h-full bg-gradient-to-r from-teal-400 to-sky-500 transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }}></div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-sky-100 text-sky-700 px-5 py-2 rounded-bl-2xl font-black text-xs uppercase tracking-wider border-b border-l border-sky-200">
              {currentQ.category || 'Kategori'}
            </div>
            
            {currentQ.imageBase64 && (
              <div className="mb-8 rounded-2xl overflow-hidden border border-slate-100 mt-6 shadow-sm">
                <img src={currentQ.imageBase64} className="w-full max-h-64 object-contain bg-slate-50 mx-auto" />
                {currentQ.caption && <div className="bg-slate-800/5 text-slate-600 p-3 text-sm font-bold text-center border-t border-slate-100">{currentQ.caption}</div>}
              </div>
            )}
            
            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-10 text-center mt-8 leading-tight">{currentQ.q}</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {opts.map((opt, i) => (
                <button 
                  key={i} 
                  onClick={() => handleAnswer(opt)}
                  disabled={!!feedbackState}
                  className={`p-5 sm:p-6 text-xl font-black rounded-[1.5rem] border-[4px] border-slate-100 bg-white text-slate-700 transition-all text-left flex items-center justify-between group 
                    ${feedbackState ? 'opacity-50' : 'hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 hover:shadow-lg transform active:scale-95'}`}
                >
                  <span>{opt}</span> 
                  <i className={`fa-solid fa-circle-chevron-right text-2xl ${feedbackState ? 'text-slate-200' : 'text-slate-200 group-hover:text-teal-400'}`}></i>
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
      )}

      {quizPhase === 'reflection' && (
        <div className="max-w-xl mx-auto mt-10 p-4">
          <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border-t-8 border-teal-500 text-center">
            <div className="w-20 h-20 bg-teal-50 text-teal-500 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
              <i className="fa-solid fa-comment-dots text-4xl -rotate-3"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-3">Garis Finish Terlihat!</h2>
            <p className="font-bold text-slate-500 mb-8">Sebelum menyentuh pita finish, ceritakan singkat refleksi atau perasaanmu tentang kuis ini.</p>
            <textarea 
              value={refleksiText} 
              onChange={e => setRefleksiText(e.target.value)} 
              className="w-full h-36 p-5 border-2 border-slate-200 bg-slate-50 rounded-2xl focus:bg-white focus:border-teal-500 outline-none resize-none mb-8 font-medium text-lg placeholder:text-slate-300 transition-colors" 
              placeholder="Ketik refleksimu di sini..."
            ></textarea>
            <button onClick={submitReflection} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-black text-xl py-5 rounded-2xl shadow-lg shadow-teal-500/30 transition-transform transform hover:-translate-y-1">
              Kirim & Selesaikan Balapan
            </button>
          </div>
        </div>
      )}

      {quizPhase === 'finish' && (
        <div className="max-w-md mx-auto mt-10 text-center bg-white p-10 sm:p-14 rounded-[3rem] shadow-2xl border-4 border-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=')] opacity-50 z-0"></div>
          <div className="relative z-10">
            <i className="fa-solid fa-medal text-7xl text-amber-400 mb-6 drop-shadow-lg animate-bounce block mx-auto"></i>
            <h2 className="text-3xl font-black mb-2 text-slate-800">Luar Biasa!</h2>
            <p className="font-bold text-slate-500 mb-8">Kamu telah menyelesaikan semua soal.</p>
            <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 mb-10">
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Skor Akhir</p>
              <div className="text-6xl font-black text-teal-500">{player?.score}</div>
            </div>
            <button onClick={logoutStudent} className="text-slate-500 font-bold hover:text-slate-800 transition-colors flex items-center justify-center gap-2 mx-auto">
              <i className="fa-solid fa-door-open"></i> Keluar Kuis
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
