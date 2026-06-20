import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Dialog } from '../components/DialogManager';

export default function Arena({ session: teacherSession }) {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(location.state?.session || null);
  const [players, setPlayers] = useState([]);
  const [arenaMaxScore, setArenaMaxScore] = useState(10);
  const [timeLeftStr, setTimeLeftStr] = useState(location.state?.session?.status === 'finished' ? '00:00' : '');
  const [isTimeUp, setIsTimeUp] = useState(location.state?.session?.status === 'finished');

  useEffect(() => {
    if (!sessionData) {
      supabase.from('sessions').select('*').eq('pin', pin).in('status', ['live', 'finished']).single().then(({ data }) => {
        if (data) {
          setSessionData(data);
          if (data.status === 'finished') {
            setIsTimeUp(true);
            setTimeLeftStr('00:00');
          }
        } else {
          Dialog.alert('Sesi Arena tidak ditemukan atau belum live.', 'Arena Tidak Tersedia').then(() => {
            navigate('/');
          });
        }
      });
    } else {
      if (sessionData.status === 'finished' && !isTimeUp) {
        setIsTimeUp(true);
        setTimeLeftStr('00:00');
      }
    }
  }, [pin, sessionData, isTimeUp]);

  useEffect(() => {
    if (sessionData) {
      initArena();
      
      const subscription = supabase.channel('custom-all-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, payload => {
          if (payload.new && payload.new.session_id === sessionData.id) fetchPlayersArena();
          if (payload.old && !payload.new) fetchPlayersArena();
        })
        .subscribe();

      return () => supabase.removeChannel(subscription);
    }
  }, [sessionData]);

  // Timer loop
  useEffect(() => {
    if (!sessionData?.config?.ends_at) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const endsAt = sessionData.config.ends_at;
      const diff = endsAt - now;
      
      if (diff <= 0) {
        setIsTimeUp(true);
        setTimeLeftStr('00:00');
        clearInterval(interval);
      } else {
        const m = Math.floor(diff / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setTimeLeftStr(`${m}:${s}`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionData]);

  const initArena = async () => {
    const { data: qData } = await supabase.from('questions').select('id').eq('session_id', sessionData.id);
    setArenaMaxScore((qData && qData.length > 0) ? qData.length * 10 : 10);
    fetchPlayersArena();
  };

  const fetchPlayersArena = async () => {
    const { data } = await supabase.from('players').select('*').eq('session_id', sessionData?.id);
    if (data) {
      // Sort by score first, then progress
      data.sort((a, b) => b.score - a.score || b.progress - a.progress);
      setPlayers(data);
    }
  };

  const closeArena = () => {
    if (teacherSession && sessionData && sessionData.teacher_id === teacherSession.user.id) {
      navigate(`/session/${sessionData.id}`);
    } else {
      navigate('/');
    }
  };

  if (!sessionData) return <div className="p-8 flex justify-center items-center h-screen"><i className="fa-solid fa-spinner fa-spin text-4xl text-teal-500"></i></div>;

  return (
    <section className="flex-1 bg-sky-50 overflow-hidden relative flex flex-col h-screen">
      {/* Header Arena */}
      <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 border-b border-white/50 shadow-sm z-50 flex flex-col sm:flex-row justify-between items-center gap-4 relative">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-100 text-sky-500 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-sky-200">
            <i className="fa-solid fa-stopwatch"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 leading-none mb-1">ARENA SPRINT</h1>
            <p className="text-slate-500 font-bold text-sm">Siswa Berlari: <span className="text-teal-600 font-black px-1.5 py-0.5 bg-teal-50 rounded">{players.length}</span></p>
          </div>
        </div>
        
        {timeLeftStr && !isTimeUp && (
          <div className="bg-slate-800 text-white px-6 py-2 rounded-2xl flex flex-col items-center shadow-lg border-2 border-slate-700 animate-pulse">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Sisa Waktu</span>
            <span className="text-3xl font-mono font-black tracking-widest text-rose-400">{timeLeftStr}</span>
          </div>
        )}

        {isTimeUp && (
          <div className="bg-rose-500 text-white px-6 py-2 rounded-2xl flex items-center shadow-lg border-2 border-rose-600">
            <span className="text-2xl font-black tracking-widest uppercase">WAKTU HABIS!</span>
          </div>
        )}

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div 
            onClick={() => window.open('/qrcode/' + sessionData.pin, '_blank')} 
            className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-6 py-2 rounded-2xl text-center border-2 border-amber-200 flex-1 sm:flex-none cursor-pointer transition-colors relative"
            title="Tampilkan QR Code di Tab Baru"
          >
            <p className="text-[10px] uppercase font-black tracking-widest text-amber-600/80 mb-0.5"><i className="fa-solid fa-qrcode mr-1"></i> PIN JOIN</p>
            <p className="text-3xl font-black tracking-[0.2em] font-mono leading-none">{sessionData.pin}</p>
          </div>
          <button onClick={closeArena} className="bg-slate-800 hover:bg-slate-900 text-white w-12 h-12 rounded-2xl shadow-lg transition-transform transform hover:-translate-y-1 flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
      </div>

      {isTimeUp ? (
        // PODIUM VIEW
        <div className="flex-1 overflow-y-auto bg-slate-900 relative p-6 flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzMzQxNTUiLz48L3N2Zz4=')] opacity-50 z-0"></div>
          
          <div className="relative z-10 w-full max-w-4xl">
            <h2 className="text-center text-5xl font-black text-white mb-16 drop-shadow-xl uppercase tracking-tight">
              <i className="fa-solid fa-trophy text-amber-400 mr-4"></i>
              PODIUM JUARA
              <i className="fa-solid fa-trophy text-amber-400 ml-4"></i>
            </h2>
            
            <div className="flex flex-row items-end justify-center gap-2 sm:gap-6 h-64 sm:h-96 w-full px-2">
              {/* JUARA 2 */}
              {players[1] ? (
                <div className="flex flex-col items-center justify-end w-[30%] sm:w-40 order-1 animate-[slideUpFade_0.5s_ease-out_forwards]">
                  <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${players[1].avatar}`} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-slate-300 bg-slate-100 mb-2 drop-shadow-lg" alt="avatar" />
                  <div className="bg-slate-800 text-white px-2 sm:px-4 py-2 rounded-t-xl text-center w-full shadow-xl">
                    <p className="font-black text-[10px] sm:text-sm truncate">{players[1].name}</p>
                    <p className="text-teal-400 font-black text-xs sm:text-base">{players[1].score} pt</p>
                  </div>
                  <div className="w-full bg-gradient-to-t from-slate-400 to-slate-300 h-24 sm:h-32 rounded-t-lg border-2 border-b-0 border-slate-300 flex items-center justify-center shadow-inner">
                    <span className="text-3xl sm:text-5xl font-black text-slate-100 opacity-80">2</span>
                  </div>
                </div>
              ) : <div className="w-[30%] sm:w-40 order-1 h-24 sm:h-32 bg-slate-800/50 rounded-t-lg border-2 border-b-0 border-slate-700"></div>}

              {/* JUARA 1 */}
              {players[0] ? (
                <div className="flex flex-col items-center justify-end w-[40%] sm:w-48 order-2 z-10 animate-[slideUpFade_0.7s_ease-out_forwards]">
                  <i className="fa-solid fa-crown text-amber-400 text-3xl sm:text-4xl mb-1 drop-shadow-md animate-bounce"></i>
                  <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${players[0].avatar}`} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-300 bg-slate-100 mb-2 drop-shadow-xl" alt="avatar" />
                  <div className="bg-slate-800 text-white px-2 sm:px-4 py-3 rounded-t-xl text-center w-full shadow-2xl border-2 border-b-0 border-amber-400/30">
                    <p className="font-black text-xs sm:text-lg truncate text-amber-300">{players[0].name}</p>
                    <p className="text-teal-400 font-black text-xs sm:text-base">{players[0].score} pt</p>
                  </div>
                  <div className="w-full bg-gradient-to-t from-amber-400 to-amber-300 h-32 sm:h-48 rounded-t-lg border-2 border-b-0 border-amber-200 flex items-start pt-2 sm:pt-4 justify-center shadow-[0_-10px_30px_rgba(251,191,36,0.3)]">
                    <span className="text-5xl sm:text-7xl font-black text-amber-100 opacity-80">1</span>
                  </div>
                </div>
              ) : <div className="w-[40%] sm:w-48 order-2 h-32 sm:h-48 bg-slate-800/50 rounded-t-lg border-2 border-b-0 border-slate-700"></div>}

              {/* JUARA 3 */}
              {players[2] ? (
                <div className="flex flex-col items-center justify-end w-[30%] sm:w-40 order-3 animate-[slideUpFade_0.9s_ease-out_forwards]">
                  <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${players[2].avatar}`} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-orange-300 bg-slate-100 mb-2 drop-shadow-md" alt="avatar" />
                  <div className="bg-slate-800 text-white px-2 sm:px-4 py-2 rounded-t-xl text-center w-full shadow-lg">
                    <p className="font-black text-[10px] sm:text-sm truncate">{players[2].name}</p>
                    <p className="text-teal-400 font-black text-xs sm:text-base">{players[2].score} pt</p>
                  </div>
                  <div className="w-full bg-gradient-to-t from-orange-400 to-orange-300 h-16 sm:h-24 rounded-t-lg border-2 border-b-0 border-orange-300 flex items-center justify-center shadow-inner">
                    <span className="text-2xl sm:text-4xl font-black text-orange-100 opacity-80">3</span>
                  </div>
                </div>
              ) : <div className="w-[30%] sm:w-40 order-3 h-16 sm:h-24 bg-slate-800/50 rounded-t-lg border-2 border-b-0 border-slate-700"></div>}
            </div>
            
            {/* OTHER PLAYERS */}
            {players.length > 3 && (
              <div className="mt-12 bg-slate-800/80 backdrop-blur border border-slate-700 rounded-3xl p-6 max-w-2xl mx-auto">
                <h3 className="text-slate-400 font-black uppercase tracking-widest text-sm mb-4 text-center">Peringkat Lainnya</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {players.slice(3, 9).map((p, i) => (
                    <div key={p.id} className="bg-slate-700/50 rounded-xl p-3 flex items-center gap-3">
                      <span className="text-slate-500 font-black">#{i+4}</span>
                      <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${p.avatar}`} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-500" alt="avatar" />
                      <div className="overflow-hidden">
                        <p className="text-white font-bold text-xs truncate">{p.name}</p>
                        <p className="text-teal-400 font-black text-xs">{p.score} pt</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // TRACK VIEW
        <div className="flex-1 overflow-hidden bg-green-400 relative p-2 sm:p-6 flex flex-col">
          <div className="w-full flex-1 bg-[#cb5d38] rounded-[2rem] sm:rounded-[3rem] border-8 sm:border-[12px] border-white/40 shadow-inner flex flex-col relative overflow-hidden">
            <div className="absolute right-[5%] top-0 bottom-0 w-12 sm:w-16 checkerboard-bg z-0 opacity-90 border-l-4 border-white drop-shadow-xl"></div>
            <div className="absolute right-[5%] -top-4 w-12 sm:w-16 text-center z-10 font-black text-white text-xl drop-shadow-md">FINISH</div>
            
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(laneIdx => {
              const isPelotonLane = laneIdx === 9;
              const lanePlayers = isPelotonLane ? players.slice(9) : (players[laneIdx] ? [players[laneIdx]] : []);

              return (
                <div key={`lane-${laneIdx}`} className="relative flex-1 w-full border-b-[3px] border-dashed border-white/20 flex items-center z-10 box-border px-4 shrink-0">
                  {lanePlayers.map((p, pIndex) => {
                    let pct = (p.score / arenaMaxScore) * 90;
                    pct = Math.min(95, Math.max(0, pct));
                    const isFinished = p.progress >= 100;
                    
                    // Rank text
                    const rank = isPelotonLane ? 10 + pIndex : laneIdx + 1;

                    return (
                      <div key={p.id} className="absolute transition-all duration-[1500ms] ease-out flex items-center gap-2 sm:gap-4 group hover:z-50" style={{ left: `${pct}%`, transform: `translateX(${pct > 50 ? '-50%' : '0%'})`, zIndex: 40 - pIndex }}>
                        <div className="flex flex-col items-center">
                          <div className="text-[10px] sm:text-xs font-black bg-white/90 text-slate-800 px-2 py-0.5 rounded shadow-md whitespace-nowrap mb-0.5">{p.score} pt</div>
                          <div className={`relative ${isFinished ? 'animate-bounce' : 'animate-[pulse_1s_ease-in-out_infinite]'}`}>
                            <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${p.avatar}`} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-slate-100 border-2 border-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]" alt="avatar" />
                            {isFinished && <i className="fa-solid fa-medal absolute -bottom-2 -right-2 text-xl text-amber-400 drop-shadow-md z-20"></i>}
                            <div className="absolute -top-2 -left-2 w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-md z-30">{rank}</div>
                          </div>
                        </div>
                        <div className="bg-slate-900/80 backdrop-blur border-2 border-white/20 text-white px-3 sm:px-4 py-1.5 rounded-xl shadow-xl flex flex-col min-w-[100px] max-w-[140px] sm:max-w-[180px] opacity-90 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs sm:text-sm font-black truncate">{p.name}</span>
                          <div className="w-full bg-white/20 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-emerald-400" style={{ width: `${p.progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {lanePlayers.length === 0 && (
                    <div className="text-white/20 font-black text-xl italic px-4 select-none">TRACK {laneIdx + 1}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
