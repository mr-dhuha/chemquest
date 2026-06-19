import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { sampleQuestions } from '../data/sampleQuestions';

export default function SessionManager({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeSession, setActiveSession] = useState(null);
  const [activeTab, setActiveTab] = useState('soal');
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [showQr, setShowQr] = useState(false);
  
  // Question Form State
  const [showQForm, setShowQForm] = useState(false);
  const [qCategory, setQCategory] = useState('Pahami Konsep');
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState('');
  const [qAnswer, setQAnswer] = useState('');
  const [qImage, setQImage] = useState(null);
  const [qCaption, setQCaption] = useState('');

  useEffect(() => {
    loadSession();
  }, [id]);

  useEffect(() => {
    if (activeSession) {
      if (activeTab === 'soal') loadQuestions();
      if (activeTab === 'siswa') loadPlayers();
    }
  }, [activeSession, activeTab]);

  const loadSession = async () => {
    const { data, error } = await supabase.from('sessions').select('*').eq('id', id).single();
    if (data) setActiveSession(data);
  };

  const loadQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').eq('session_id', id).order('created_at', { ascending: true });
    if (data) setQuestions(data);
  };

  const loadPlayers = async () => {
    const { data } = await supabase.from('players').select('*').eq('session_id', id).order('score', { ascending: false });
    if (data) setPlayers(data);
  };

  const toggleLive = async () => {
    const newStatus = activeSession.status === 'live' ? 'finished' : 'live';
    const { error } = await supabase.from('sessions').update({ status: newStatus }).eq('id', id);
    if (!error) setActiveSession({ ...activeSession, status: newStatus });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) return alert("Ukuran maksimal gambar 500KB agar arena tidak berat.");
      const reader = new FileReader();
      reader.onloadend = () => setQImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const loadSampleQuestions = async () => {
    if (window.confirm("Muat 3 soal contoh ke sesi ini?")) {
      const payload = sampleQuestions.map(sq => ({ ...sq, session_id: id }));
      const { error } = await supabase.from('questions').insert(payload);
      if (error) alert("Gagal memuat: " + error.message);
      else loadQuestions();
    }
  };

  const saveQuestion = async () => {
    const optsArray = qOptions.split(',').map(s => s.trim()).filter(Boolean);
    if (!qText || !qAnswer || optsArray.length < 2) return alert("Lengkapi minimal pertanyaan, jawaban, dan 2 opsi jawaban.");
    if (!optsArray.includes(qAnswer.trim())) return alert("Jawaban Benar harus diketik persis sama dengan salah satu opsi.");

    const payload = {
      session_id: id,
      q: qText,
      options: JSON.stringify(optsArray),
      answer: qAnswer.trim(),
      category: qCategory,
      imageBase64: qImage,
      caption: qCaption,
    };

    const { error } = await supabase.from('questions').insert([payload]);
    if (!error) {
      setShowQForm(false);
      setQText(''); setQOptions(''); setQAnswer(''); setQImage(null); setQCaption('');
      loadQuestions();
    } else {
      alert(error.message);
    }
  };

  const deleteQuestion = async (qId) => {
    if (window.confirm("Hapus soal ini?")) {
      await supabase.from('questions').delete().eq('id', qId);
      loadQuestions();
    }
  };

  const kickPlayer = async (pId) => {
    if (window.confirm("Diskualifikasi siswa ini?")) {
      await supabase.from('players').delete().eq('id', pId);
      loadPlayers();
    }
  };

  if (!activeSession) return <div className="p-8">Memuat...</div>;

  const isLive = activeSession.status === 'live';
  const joinUrl = window.location.origin + '/?pin=' + activeSession.pin;

  return (
    <section className="py-8 px-4 flex-1 bg-slate-50">
      <div className="max-w-6xl mx-auto w-full">
        <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-800 font-black mb-6 flex items-center gap-2 transition-colors">
          <i className="fa-solid fa-arrow-left"></i> Kembali ke Dashboard
        </button>
        
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-8 relative">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className={`px-3 py-1.5 rounded-lg font-black text-xs uppercase tracking-wider ${isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {isLive ? 'SESI LIVE' : 'DRAFT'}
                </span>
                <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-lg font-mono font-black tracking-widest border border-slate-200 flex items-center gap-2">
                  PIN: {activeSession.pin}
                  <button onClick={() => setShowQr(!showQr)} className="text-slate-400 hover:text-teal-500 transition-colors ml-2" title="Tampilkan QR Code">
                    <i className="fa-solid fa-qrcode text-lg"></i>
                  </button>
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-800">{activeSession.title}</h2>
            </div>
            
            {showQr && (
              <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-4 bg-white p-6 rounded-3xl shadow-2xl border-4 border-teal-500 z-50 text-center animate-slideUpFade">
                <p className="text-sm font-black text-teal-600 mb-4 uppercase tracking-widest">SCAN UNTUK JOIN</p>
                <div className="bg-white p-4 rounded-2xl inline-block shadow-inner border-2 border-slate-100 mb-4">
                  <QRCodeCanvas value={joinUrl} size={200} level="H" />
                </div>
                <div className="bg-slate-100 p-3 rounded-xl font-mono text-slate-700 font-bold text-lg tracking-widest">
                  PIN: {activeSession.pin}
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button 
                onClick={toggleLive} 
                className={`flex-1 lg:flex-none px-6 py-3.5 rounded-xl font-black shadow-lg transition-all flex justify-center items-center gap-2 ${isLive ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'}`}
              >
                {isLive ? <><i className="fa-solid fa-lock"></i> Tutup Gerbang</> : <><i className="fa-solid fa-play"></i> Buka Gerbang Kuis</>}
              </button>
              <button 
                onClick={() => navigate(`/arena/${activeSession.pin}`)} 
                className="flex-1 lg:flex-none bg-sky-500 hover:bg-sky-600 text-white px-6 py-3.5 rounded-xl font-black shadow-lg shadow-sky-500/20 transition-all flex justify-center items-center gap-2"
              >
                <i className="fa-solid fa-flag-checkered"></i> Pantau Lintasan Arena
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 sm:gap-6 border-b-2 border-slate-200 mb-8 pb-2 hide-scrollbar">
          {['pretest', 'materi', 'soal', 'siswa'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 font-black text-lg whitespace-nowrap border-b-4 transition-colors ${activeTab === tab ? 'text-teal-600 border-teal-500' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
            >
              {tab === 'pretest' && <><i className="fa-solid fa-clipboard-list mr-1"></i> Pre-Test</>}
              {tab === 'materi' && <><i className="fa-solid fa-book-open mr-1"></i> Materi</>}
              {tab === 'soal' && <><i className="fa-solid fa-gamepad mr-1"></i> Misi Game</>}
              {tab === 'siswa' && <><i className="fa-solid fa-chart-pie mr-1"></i> Analisis Siswa</>}
            </button>
          ))}
        </div>

        {/* Tab Content Placeholder for Pretest/Materi */}
        {(activeTab === 'pretest' || activeTab === 'materi') && (
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border-2 border-slate-100 text-center text-slate-500 font-bold">
            Fitur ini sedang dalam pengembangan.
          </div>
        )}

        {/* Soal Tab */}
        {activeTab === 'soal' && (
          <div>
            <div className="flex flex-wrap gap-4 mb-8">
              <button onClick={() => setShowQForm(!showQForm)} className="bg-teal-50 text-teal-600 hover:bg-teal-100 px-6 py-3 rounded-xl font-black border border-teal-200 transition-colors flex items-center gap-2">
                <i className="fa-solid fa-plus"></i> Tambah Pertanyaan Misi
              </button>
              <button onClick={loadSampleQuestions} className="bg-amber-50 text-amber-600 hover:bg-amber-100 px-6 py-3 rounded-xl font-black border border-amber-200 transition-colors flex items-center gap-2">
                <i className="fa-solid fa-magic"></i> Muat Soal Contoh
              </button>
            </div>
            
            {showQForm && (
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border-2 border-teal-100 mb-8 transform transition-all">
                <h3 className="font-black text-2xl mb-6 text-slate-800"><i className="fa-solid fa-pen-to-square text-teal-500 mr-2"></i> Buat Misi Baru</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block font-bold text-sm text-slate-500 mb-1.5 uppercase tracking-wide">Kategori</label>
                      <select value={qCategory} onChange={e => setQCategory(e.target.value)} className="w-full p-3.5 border-2 border-slate-200 bg-slate-50 rounded-xl focus:border-teal-500 outline-none font-bold">
                        <option value="Pahami Konsep">Pahami Konsep</option>
                        <option value="Selesaikan Masalah">Selesaikan Masalah</option>
                        <option value="Kaitkan Kehidupan">Kaitkan Kehidupan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-sm text-slate-500 mb-1.5 uppercase tracking-wide">Pertanyaan</label>
                      <textarea value={qText} onChange={e => setQText(e.target.value)} className="w-full p-4 border-2 border-slate-200 bg-slate-50 rounded-xl focus:border-teal-500 outline-none font-medium resize-none" rows="4"></textarea>
                    </div>
                    <div>
                      <label className="block font-bold text-sm text-slate-500 mb-1.5 uppercase tracking-wide">Opsi Jawaban (Pisahkan dengan koma)</label>
                      <input type="text" value={qOptions} onChange={e => setQOptions(e.target.value)} className="w-full p-4 border-2 border-slate-200 bg-slate-50 rounded-xl focus:border-teal-500 outline-none font-medium" placeholder="Contoh: Merah, Kuning, Hijau, Biru" />
                    </div>
                    <div>
                      <label className="block font-bold text-sm text-emerald-500 mb-1.5 uppercase tracking-wide">Jawaban Benar</label>
                      <input type="text" value={qAnswer} onChange={e => setQAnswer(e.target.value)} className="w-full p-4 border-2 border-emerald-300 bg-emerald-50 rounded-xl focus:border-emerald-500 outline-none font-black text-emerald-700" placeholder="Ketik persis seperti salah satu opsi" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300 h-full flex flex-col justify-center">
                      <label className="block font-bold text-sm text-slate-500 mb-3 text-center uppercase tracking-wide"><i className="fa-solid fa-image text-xl mb-2 block"></i> Gambar Pendukung (Opsional)</label>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-black file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer mb-4" />
                      {qImage && <img src={qImage} className="max-h-40 mx-auto rounded-xl shadow-sm border-2 border-white mb-4" />}
                      <div>
                        <label className="block font-bold text-xs text-slate-400 mb-1 uppercase">Keterangan Gambar</label>
                        <input type="text" value={qCaption} onChange={e => setQCaption(e.target.value)} className="w-full p-3 border-2 border-slate-200 bg-white rounded-lg focus:border-teal-500 outline-none text-sm" placeholder="Caption..." />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button onClick={() => setShowQForm(false)} className="px-6 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-black transition-colors">Batal</button>
                  <button onClick={saveQuestion} className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-black shadow-lg shadow-teal-500/30 transition-transform transform hover:-translate-y-1">Simpan Misi</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="p-10 text-center text-slate-400 font-bold bg-white rounded-[2rem] border-2 border-dashed border-slate-200">Belum ada misi permainan. Tambahkan soal pertama!</div>
              ) : (
                questions.map((q, i) => {
                  let opts = q.options;
                  try { if(typeof opts === 'string') opts = JSON.parse(opts); } catch(e){}
                  if(Array.isArray(opts)) opts = opts.join(', ');

                  return (
                    <div key={q.id} className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-5 hover:border-teal-200 transition-colors">
                      <div className="bg-teal-100 text-teal-700 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-inner">{i+1}</div>
                      <div className="flex-1">
                        <span className="text-[10px] font-black tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-lg uppercase border border-sky-100">{q.category || '-'}</span>
                        <p className="font-black text-xl mt-3 text-slate-800 leading-snug">{q.q}</p>
                        {q.imageBase64 && <div className="mt-4 inline-block p-2 bg-slate-50 border border-slate-200 rounded-xl"><img src={q.imageBase64} className="h-20 rounded-lg object-contain" /></div>}
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-sm font-bold text-slate-500 mb-1">Pilihan: <span className="font-medium text-slate-700">{opts}</span></p>
                          <p className="text-sm font-black text-emerald-600"><i className="fa-solid fa-check-circle mr-1"></i> Jawaban: {q.answer}</p>
                        </div>
                      </div>
                      <div className="flex md:flex-col gap-2 shrink-0 h-fit justify-end">
                        <button onClick={() => deleteQuestion(q.id)} className="p-3 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-xl transition-colors font-bold"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Siswa Tab */}
        {activeTab === 'siswa' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.length === 0 ? (
                <div className="col-span-full p-10 text-center text-slate-400 font-bold bg-white rounded-[2rem] border-2 border-dashed border-slate-200">Lintasan masih kosong. Menunggu siswa...</div>
              ) : (
                players.map((p, index) => {
                  let maxScoreForPct = Math.max(10, questions.length * 10);
                  let pct = (p.score / maxScoreForPct) * 100;
                  
                  let badgeUI;
                  if(pct >= 80) badgeUI = <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider"><i className="fa-solid fa-arrow-trend-up"></i> Level Lanjut</span>;
                  else if(pct >= 50) badgeUI = <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider"><i className="fa-solid fa-arrows-spin"></i> Ulang Materi</span>;
                  else badgeUI = <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider"><i className="fa-solid fa-arrow-trend-down"></i> Remedial</span>;

                  return (
                    <div key={p.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-slate-100 text-slate-400 font-black px-4 py-2 rounded-bl-2xl text-xl opacity-50">#{index+1}</div>
                      <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                        <span className="text-5xl drop-shadow-md">{p.avatar}</span>
                        <div>
                          <h3 className="font-black text-xl text-slate-800 leading-tight">{p.name}</h3>
                          <div className="mt-1 flex gap-2 text-sm font-bold items-center flex-wrap">
                            <span className="text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">{p.score} pt</span>
                            {badgeUI}
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 min-h-[80px]">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1"><i className="fa-solid fa-comment-dots"></i> Refleksi Siswa</p>
                        <p className="text-sm text-slate-600 font-medium italic">
                          {p.refleksi ? `"${p.refleksi}"` : "Belum memberikan refleksi."}
                        </p>
                      </div>
                      <button onClick={() => kickPlayer(p.id)} className="w-full text-sm text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white py-2 rounded-xl font-bold transition-colors">Diskualifikasi</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
