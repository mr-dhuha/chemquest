import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';

export default function Arena({ session: teacherSession }) {
  const { pin } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(location.state?.session || null);
  const [players, setPlayers] = useState([]);
  const [arenaMaxScore, setArenaMaxScore] = useState(10);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!sessionData) {
      // Fetch session by PIN if not provided via router state
      supabase.from('sessions').select('*').eq('pin', pin).eq('status', 'live').single().then(({ data }) => {
        if (data) {
          setSessionData(data);
        } else {
          alert('Sesi Arena tidak ditemukan atau belum live.');
          navigate('/');
        }
      });
    }
  }, [pin, sessionData]);

  useEffect(() => {
    if (sessionData) {
      initArena();
      
      const subscription = supabase.channel('custom-all-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, payload => {
          if (payload.new && payload.new.session_id === sessionData.id) fetchPlayersArena();
          if (payload.old && !payload.new) fetchPlayersArena();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [sessionData]);

  const initArena = async () => {
    const { data: qData } = await supabase.from('questions').select('id').eq('session_id', sessionData.id);
    setArenaMaxScore((qData && qData.length > 0) ? qData.length * 10 : 10);
    fetchPlayersArena();
  };

  const fetchPlayersArena = async () => {
    const { data } = await supabase.from('players').select('*').eq('session_id', sessionData.id);
    if (data) {
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

  if (!sessionData) return <div className="p-8">Memuat Arena...</div>;

  const joinUrl = window.location.origin + '/?pin=' + sessionData.pin;

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
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div 
            onClick={() => setShowQr(!showQr)} 
            className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-6 py-2 rounded-2xl text-center border-2 border-amber-200 flex-1 sm:flex-none cursor-pointer transition-colors relative"
            title="Tampilkan QR Code"
          >
            <p className="text-[10px] uppercase font-black tracking-widest text-amber-600/80 mb-0.5"><i className="fa-solid fa-qrcode mr-1"></i> PIN JOIN</p>
            <p className="text-3xl font-black tracking-[0.2em] font-mono leading-none">{sessionData.pin}</p>
            
            {showQr && (
              <div className="absolute top-full right-0 mt-4 bg-white p-6 rounded-3xl shadow-2xl border-4 border-amber-400 z-50 text-center animate-slideUpFade">
                <p className="text-sm font-black text-amber-600 mb-4 uppercase tracking-widest">SCAN UNTUK JOIN</p>
                <div className="bg-white p-4 rounded-2xl inline-block shadow-inner border-2 border-slate-100 mb-4">
                  <QRCodeCanvas value={joinUrl} size={250} level="H" />
                </div>
                <div className="bg-slate-100 p-3 rounded-xl font-mono text-slate-700 font-bold text-xl tracking-widest">
                  PIN: {sessionData.pin}
                </div>
              </div>
            )}
          </div>
          <button onClick={closeArena} className="bg-slate-800 hover:bg-slate-900 text-white w-12 h-12 rounded-2xl shadow-lg transition-transform transform hover:-translate-y-1 flex items-center justify-center text-xl shrink-0">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>
      </div>

      {/* Track Container */}
      <div className="flex-1 overflow-y-auto bg-green-400 relative p-2 sm:p-6">
        <div className="w-full min-h-full bg-[#cb5d38] rounded-[2rem] sm:rounded-[3rem] border-8 sm:border-[12px] border-white/40 shadow-inner flex flex-col relative overflow-hidden">
          <div className="absolute right-[5%] top-0 bottom-0 w-12 sm:w-16 checkerboard-bg z-0 opacity-90 border-l-4 border-white drop-shadow-xl"></div>
          <div className="absolute right-[5%] -top-4 w-12 sm:w-16 text-center z-10 font-black text-white text-xl drop-shadow-md">FINISH</div>
          
          {players.map(p => {
            let pct = (p.score / arenaMaxScore) * 90;
            pct = Math.min(95, Math.max(0, pct));
            const isFinished = p.progress >= 100;

            return (
              <div key={p.id} className="relative h-[4.5rem] sm:h-[5.5rem] w-full border-b-[3px] border-dashed border-white/20 flex items-center z-10 box-border px-4 shrink-0">
                <div className="absolute transition-all duration-[1500ms] ease-out flex items-center gap-2 sm:gap-4 group" style={{ left: `${pct}%`, transform: `translateX(${pct > 50 ? '-50%' : '0%'})` }}>
                  <div className="flex flex-col items-center">
                    <div className="text-[10px] sm:text-xs font-black bg-white/90 text-slate-800 px-2 py-0.5 rounded shadow-md whitespace-nowrap mb-0.5">{p.score} pt</div>
                    <div className={`text-3xl sm:text-5xl drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] relative ${isFinished ? 'animate-bounce' : 'animate-[pulse_1s_ease-in-out_infinite]'}`}>
                      {p.avatar}
                      {isFinished && <i className="fa-solid fa-medal absolute -bottom-2 -right-2 text-xl text-amber-400 drop-shadow-md"></i>}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 backdrop-blur border-2 border-white/20 text-white px-3 sm:px-4 py-1.5 rounded-xl shadow-xl flex flex-col min-w-[100px] max-w-[140px] sm:max-w-[180px]">
                    <span className="text-xs sm:text-sm font-black truncate">{p.name}</span>
                    <div className="w-full bg-white/20 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: `${p.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
