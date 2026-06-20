import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import { sampleQuestions } from '../data/sampleQuestions';
import { Dialog } from '../components/DialogManager';
import ImportQuestionModal from '../components/ImportQuestionModal';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function SessionManager({ session, profile }) {
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
  const [editQuestionId, setEditQuestionId] = useState(null);

  // Config Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [sessionConfig, setSessionConfig] = useState({
    timerPretestMinutes: 5,
    timerMateriMinutes: 10,
    timerMisiMinutes: 15,
    flow: 'sequential', // 'sequential' or 'free'
    enablePretest: true,
    enableMateri: true,
    enableMisi: true,
    examMode: false,
    shuffleQuestions: false
  });

  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadSession();
  }, [id]);

  useEffect(() => {
    if (activeSession) {
      if (activeTab === 'soal') loadQuestions();
      if (activeTab === 'siswa') loadPlayers();
    }
    
    let subscription;
    if (activeSession && activeTab === 'siswa') {
      subscription = supabase.channel('siswa-manager-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${activeSession.id}` }, payload => {
          loadPlayers();
        })
        .subscribe();
    }
    
    return () => {
      if (subscription) supabase.removeChannel(subscription);
    }
  }, [activeSession, activeTab]);

  const loadSession = async () => {
    const { data, error } = await supabase.from('sessions').select('*').eq('id', id).single();
    if (data) {
      setActiveSession(data);
      if (data.config) {
        setSessionConfig(prev => ({ ...prev, ...data.config }));
      }
    }
  };

  const loadQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').eq('session_id', id).order('created_at', { ascending: true });
    if (data) setQuestions(data);
  };

  const loadPlayers = async () => {
    const { data } = await supabase.from('players').select('*').eq('session_id', id).order('score', { ascending: false });
    if (data) setPlayers(data);
  };

  const openLiveConfig = () => {
    setShowConfigModal(true);
  };

  const startLive = async (finalConfig = null) => {
    const updates = { status: 'live' };
    
    if (finalConfig) {
      updates.config = {
        ...finalConfig
      };
    }

    const { error } = await supabase.from('sessions').update(updates).eq('id', id);
    if (!error) {
      setActiveSession({ ...activeSession, status: 'live', config: updates.config || activeSession.config });
      setShowConfigModal(false);
    } else {
      await Dialog.alert("Gagal update status: " + error.message, "Error");
    }
  };

  const finishMatch = async () => {
    if (await Dialog.confirm("Akhiri pertandingan ini secara permanen? Hasil akan difinalisasi dan layar Arena akan menampilkan podium.", "Selesaikan Pertandingan")) {
      const { error } = await supabase.from('sessions').update({ status: 'finished' }).eq('id', id);
      if (!error) {
        setActiveSession({ ...activeSession, status: 'finished' });
      } else {
        await Dialog.alert("Gagal menyelesaikan: " + error.message, "Error");
      }
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) return await Dialog.alert("Ukuran maksimal gambar 500KB agar arena tidak berat.", "Ukuran File Terlalu Besar");
      const reader = new FileReader();
      reader.onloadend = () => setQImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const loadSampleQuestions = async () => {
    if (await Dialog.confirm("Muat 3 soal contoh ke sesi ini?", "Muat Contoh Soal")) {
      const payload = sampleQuestions.map(sq => ({ ...sq, session_id: id }));
      const { error } = await supabase.from('questions').insert(payload);
      if (error) await Dialog.alert("Gagal memuat: " + error.message, "Error");
      else loadQuestions();
    }
  };

  const saveQuestion = async () => {
    const optsArray = qOptions.split(',').map(s => s.trim()).filter(Boolean);
    
    if (qCategory === 'MATERI') {
      if (!qText) return await Dialog.alert("Lengkapi minimal konten/isi materi.", "Data Tidak Lengkap");
    } else {
      if (!qText || !qAnswer || optsArray.length < 2) return await Dialog.alert("Lengkapi minimal pertanyaan, jawaban, dan 2 opsi jawaban.", "Data Tidak Lengkap");
      if (!optsArray.includes(qAnswer.trim())) return await Dialog.alert("Jawaban Benar harus diketik persis sama dengan salah satu opsi.", "Jawaban Tidak Valid");
    }

    const payload = {
      session_id: id,
      q: qText,
      options: JSON.stringify(optsArray),
      answer: qAnswer.trim(),
      category: qCategory,
      imageBase64: qImage,
      caption: qCaption,
    };

    let error;
    if (editQuestionId) {
      const { error: updErr } = await supabase.from('questions').update(payload).eq('id', editQuestionId);
      error = updErr;
    } else {
      const { error: insErr } = await supabase.from('questions').insert([payload]);
      error = insErr;
    }

    if (!error) {
      setShowQForm(false);
      setEditQuestionId(null);
      setQText(''); setQOptions(''); setQAnswer(''); setQImage(null); setQCaption('');
      loadQuestions();
    } else {
      await Dialog.alert(error.message, "Gagal Menyimpan");
    }
  };

  const handleEditQuestion = (q) => {
    setEditQuestionId(q.id);
    setQCategory(q.category);
    setQText(q.q);
    
    let opts = q.options;
    try { if (typeof opts === 'string') opts = JSON.parse(opts); } catch(e){}
    if (Array.isArray(opts)) opts = opts.join(', ');
    setQOptions(opts || '');
    
    setQAnswer(q.answer || '');
    setQImage(q.imageBase64 || null);
    setQCaption(q.caption || '');
    
    setShowQForm(true);
  };

  const moveQuestion = async (filteredQs, index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === filteredQs.length - 1) return;
    
    const currentQ = filteredQs[index];
    const targetQ = filteredQs[index + direction];
    
    const tempTime = currentQ.created_at;
    
    await supabase.from('questions').update({ created_at: targetQ.created_at }).eq('id', currentQ.id);
    await supabase.from('questions').update({ created_at: tempTime }).eq('id', targetQ.id);
    
    loadQuestions();
  };

  const deleteQuestion = async (qId) => {
    if (await Dialog.confirm("Hapus soal ini?", "Konfirmasi Hapus")) {
      await supabase.from('questions').delete().eq('id', qId);
      loadQuestions();
    }
  };

  const kickPlayer = async (pId) => {
    if (await Dialog.confirm("Diskualifikasi siswa ini?", "Konfirmasi Diskualifikasi")) {
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
                  <button onClick={() => window.open('/qrcode/' + activeSession.pin, '_blank')} className="text-slate-400 hover:text-teal-500 transition-colors ml-2" title="Tampilkan QR Code di Tab Baru">
                    <i className="fa-solid fa-qrcode text-lg"></i>
                  </button>
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-800">{activeSession.title}</h2>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {!isLive ? (
                <button 
                  onClick={openLiveConfig} 
                  className="flex-1 lg:flex-none px-6 py-3.5 rounded-xl font-black shadow-lg transition-all flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                >
                  <i className="fa-solid fa-play"></i> Buka Gerbang Kuis
                </button>
              ) : (
                <button 
                  onClick={finishMatch} 
                  className="flex-1 lg:flex-none px-6 py-3.5 rounded-xl font-black shadow-lg transition-all flex justify-center items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                >
                  <i className="fa-solid fa-flag-checkered"></i> Selesaikan Pertandingan
                </button>
              )}
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
              onClick={() => { setActiveTab(tab); setShowQForm(false); }}
              className={`pb-3 px-4 font-black text-lg whitespace-nowrap border-b-4 transition-colors ${activeTab === tab ? 'text-teal-600 border-teal-500' : 'text-slate-400 hover:text-slate-600 border-transparent'}`}
            >
              {tab === 'pretest' && <><i className="fa-solid fa-clipboard-list mr-1"></i> Pre-Test</>}
              {tab === 'materi' && <><i className="fa-solid fa-book-open mr-1"></i> Materi</>}
              {tab === 'soal' && <><i className="fa-solid fa-gamepad mr-1"></i> Misi Game</>}
              {tab === 'siswa' && <><i className="fa-solid fa-chart-pie mr-1"></i> Analisis Siswa</>}
            </button>
          ))}
        </div>

        {/* Dynamic Content Tabs (Pretest, Materi, Soal) */}
        {['pretest', 'materi', 'soal'].includes(activeTab) && (
          <div>
            <div className="flex flex-wrap gap-4 mb-8">
              <button onClick={() => setShowQForm(!showQForm)} className="bg-teal-50 text-teal-600 hover:bg-teal-100 px-6 py-3 rounded-xl font-black border border-teal-200 transition-colors flex items-center gap-2">
                <i className={`fa-solid ${showQForm ? 'fa-times' : 'fa-plus'}`}></i> 
                {activeTab === 'pretest' ? 'Tambah Soal Pre-Test' : activeTab === 'materi' ? 'Tambah Materi' : 'Tambah Misi Game'}
              </button>
              
              <button onClick={() => setShowImportModal(true)} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-6 py-3 rounded-xl font-black border border-indigo-200 transition-colors flex items-center gap-2">
                <i className="fa-solid fa-download"></i> Import dari Bank/Kelas Lain
              </button>

              {activeTab === 'soal' && (
                <button onClick={loadSampleQuestions} className="bg-amber-50 text-amber-600 hover:bg-amber-100 px-6 py-3 rounded-xl font-black border border-amber-200 transition-colors flex items-center gap-2">
                  <i className="fa-solid fa-magic"></i> Muat Soal Contoh
                </button>
              )}
            </div>
            
            {showQForm && (
              <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border-2 border-teal-100 mb-8 transform transition-all">
                <h3 className="font-black text-2xl mb-6 text-slate-800">
                  <i className="fa-solid fa-pen-to-square text-teal-500 mr-2"></i> 
                  {activeTab === 'pretest' ? 'Buat Soal Pre-Test Baru' : activeTab === 'materi' ? 'Buat Materi Baru' : 'Buat Misi Baru'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {/* Category Dropdown (Only for Misi Game) */}
                    {activeTab === 'soal' && (
                      <div>
                        <label className="block font-bold text-sm text-slate-500 mb-1.5 uppercase tracking-wide">Kategori Misi</label>
                        <select value={qCategory} onChange={e => setQCategory(e.target.value)} className="w-full p-3.5 border-2 border-slate-200 bg-slate-50 rounded-xl focus:border-teal-500 outline-none font-bold">
                          <option value="Pahami Konsep">Pahami Konsep</option>
                          <option value="Selesaikan Masalah">Selesaikan Masalah</option>
                          <option value="Kaitkan Kehidupan">Kaitkan Kehidupan</option>
                        </select>
                      </div>
                    )}
                    
                    <div>
                      <label className="block font-bold text-sm text-slate-500 mb-1.5 uppercase tracking-wide">
                        {activeTab === 'materi' ? 'Judul Materi' : 'Pertanyaan'}
                      </label>
                      <textarea value={qText} onChange={e => setQText(e.target.value)} className={`w-full p-4 border-2 border-slate-200 bg-slate-50 rounded-xl focus:border-teal-500 outline-none font-medium resize-none ${activeTab === 'materi' ? 'h-16' : 'h-32'}`} placeholder={activeTab === 'materi' ? "Contoh: Struktur Atom" : "Ketik pertanyaan di sini..."}></textarea>
                    </div>

                    {/* Options and Answer (Only for Pretest and Soal) */}
                    {activeTab !== 'materi' ? (
                      <>
                        <div>
                          <label className="block font-bold text-sm text-slate-500 mb-1.5 uppercase tracking-wide">Opsi Jawaban (Pisahkan dengan koma)</label>
                          <input type="text" value={qOptions} onChange={e => setQOptions(e.target.value)} className="w-full p-4 border-2 border-slate-200 bg-slate-50 rounded-xl focus:border-teal-500 outline-none font-medium" placeholder="Contoh: Merah, Kuning, Hijau, Biru" />
                        </div>
                        <div>
                          <label className="block font-bold text-sm text-emerald-500 mb-1.5 uppercase tracking-wide">Jawaban Benar</label>
                          <input type="text" value={qAnswer} onChange={e => setQAnswer(e.target.value)} className="w-full p-4 border-2 border-emerald-300 bg-emerald-50 rounded-xl focus:border-emerald-500 outline-none font-black text-emerald-700" placeholder="Ketik persis seperti salah satu opsi" />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block font-bold text-sm text-slate-500 mb-1.5 uppercase tracking-wide">Isi Materi</label>
                        <ReactQuill theme="snow" value={qCaption} onChange={setQCaption} className="bg-white rounded-xl overflow-hidden" style={{height: '300px', marginBottom: '50px'}} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-6 rounded-xl border-2 border-dashed border-slate-300 h-full flex flex-col justify-center">
                      <label className="block font-bold text-sm text-slate-500 mb-3 text-center uppercase tracking-wide"><i className="fa-solid fa-image text-xl mb-2 block"></i> Gambar Pendukung (Opsional)</label>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-black file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer mb-4" />
                      {qImage && <img src={qImage} className="max-h-40 mx-auto rounded-xl shadow-sm border-2 border-white mb-4" />}
                      
                      {activeTab !== 'materi' && (
                        <div>
                          <label className="block font-bold text-xs text-slate-400 mb-1 uppercase">Keterangan Gambar</label>
                          <input type="text" value={qCaption} onChange={e => setQCaption(e.target.value)} className="w-full p-3 border-2 border-slate-200 bg-white rounded-lg focus:border-teal-500 outline-none text-sm" placeholder="Caption..." />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button onClick={() => { setShowQForm(false); setEditQuestionId(null); }} className="px-6 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-black transition-colors">Batal</button>
                  <button onClick={() => {
                    // Inject correct category based on activeTab
                    if (activeTab === 'pretest') setQCategory('PRETEST');
                    else if (activeTab === 'materi') {
                      setQCategory('MATERI');
                      setQOptions('Materi'); // Dummy options for DB constraint if any
                      setQAnswer('Materi');  // Dummy answer
                    }
                    setTimeout(saveQuestion, 50); // Small delay to allow state to update before saving
                  }} className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-black shadow-lg shadow-teal-500/30 transition-transform transform hover:-translate-y-1">
                    Simpan
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {(() => {
                const filteredQuestions = questions.filter(q => {
                  if (activeTab === 'pretest') return q.category === 'PRETEST';
                  if (activeTab === 'materi') return q.category === 'MATERI';
                  return q.category !== 'PRETEST' && q.category !== 'MATERI';
                });

                if (filteredQuestions.length === 0) {
                  return (
                    <div className="p-10 text-center text-slate-400 font-bold bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                      Belum ada data untuk bagian ini. Tambahkan sekarang!
                    </div>
                  );
                }

                return filteredQuestions.map((q, i) => {
                  let opts = q.options;
                  try { if(typeof opts === 'string') opts = JSON.parse(opts); } catch(e){}
                  if(Array.isArray(opts)) opts = opts.join(', ');

                  return (
                    <div key={q.id} className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-5 hover:border-teal-200 transition-colors">
                      <div className="bg-teal-100 text-teal-700 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-inner">{i+1}</div>
                      
                      <div className="flex-1">
                        {activeTab !== 'materi' && (
                          <span className="text-[10px] font-black tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-lg uppercase border border-sky-100">
                            {q.category || '-'}
                          </span>
                        )}
                        
                        <p className="font-black text-xl mt-3 text-slate-800 leading-snug">{q.q}</p>
                        
                        {q.imageBase64 && (
                          <div className="mt-4 inline-block p-2 bg-slate-50 border border-slate-200 rounded-xl">
                            <img src={q.imageBase64} className="h-24 rounded-lg object-contain" />
                          </div>
                        )}
                        
                        {activeTab === 'materi' ? (
                          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-slate-600 font-medium whitespace-pre-wrap ql-editor px-0 py-0" dangerouslySetInnerHTML={{ __html: q.caption }} />
                          </div>
                        ) : (
                          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-sm font-bold text-slate-500 mb-1">Pilihan: <span className="font-medium text-slate-700">{opts}</span></p>
                            <p className="text-sm font-black text-emerald-600"><i className="fa-solid fa-check-circle mr-1"></i> Jawaban: {q.answer}</p>
                            {q.caption && <p className="text-xs font-bold text-slate-400 mt-2 italic">Caption: {q.caption}</p>}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex md:flex-col gap-2 shrink-0 h-fit justify-end">
                        <button onClick={() => moveQuestion(filteredQuestions, i, -1)} disabled={i === 0} className={`p-2 rounded-xl transition-colors font-bold ${i === 0 ? 'text-slate-300 bg-slate-50' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`} title="Geser ke Atas"><i className="fa-solid fa-arrow-up"></i></button>
                        <button onClick={() => moveQuestion(filteredQuestions, i, 1)} disabled={i === filteredQuestions.length - 1} className={`p-2 rounded-xl transition-colors font-bold ${i === filteredQuestions.length - 1 ? 'text-slate-300 bg-slate-50' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`} title="Geser ke Bawah"><i className="fa-solid fa-arrow-down"></i></button>
                        <button onClick={() => handleEditQuestion(q)} className="p-3 mt-2 text-blue-500 bg-blue-50 hover:bg-blue-500 hover:text-white rounded-xl transition-colors font-bold" title="Edit Soal"><i className="fa-solid fa-pen"></i></button>
                        <button onClick={() => deleteQuestion(q.id)} className="p-3 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-xl transition-colors font-bold" title="Hapus Soal"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    </div>
                  );
                });
              })()}
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
                        <img src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${p.avatar}`} className="w-16 h-16 rounded-full border-2 border-slate-200 bg-slate-100 shadow-sm" alt="avatar" />
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

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-800">
                <i className="fa-solid fa-gears text-teal-500 mr-2"></i> Pengaturan Sesi
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-rose-500 w-10 h-10 rounded-xl hover:bg-rose-50 flex items-center justify-center transition-colors">
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest text-center">Pre-Test</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={sessionConfig.timerPretestMinutes} 
                      onChange={e => setSessionConfig({...sessionConfig, timerPretestMinutes: parseInt(e.target.value) || 1})}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-2 py-2 font-black text-lg text-center focus:border-teal-400 focus:outline-none"
                      min="1"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">mnt</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest text-center">Materi</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={sessionConfig.timerMateriMinutes} 
                      onChange={e => setSessionConfig({...sessionConfig, timerMateriMinutes: parseInt(e.target.value) || 1})}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-2 py-2 font-black text-lg text-center focus:border-amber-400 focus:outline-none"
                      min="1"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">mnt</span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest text-center">Misi Kuis</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={sessionConfig.timerMisiMinutes} 
                      onChange={e => setSessionConfig({...sessionConfig, timerMisiMinutes: parseInt(e.target.value) || 1})}
                      className="w-full bg-white border-2 border-slate-200 rounded-lg px-2 py-2 font-black text-lg text-center focus:border-rose-400 focus:outline-none"
                      min="1"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">mnt</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Alur Belajar Siswa</label>
                <div className="flex bg-slate-100 p-1.5 rounded-xl">
                  <button 
                    onClick={() => setSessionConfig({...sessionConfig, flow: 'sequential'})}
                    className={`flex-1 py-2.5 rounded-lg font-black text-sm transition-all ${sessionConfig.flow === 'sequential' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Berurutan (Wajib)
                  </button>
                  <button 
                    onClick={() => setSessionConfig({...sessionConfig, flow: 'free'})}
                    className={`flex-1 py-2.5 rounded-lg font-black text-sm transition-all ${sessionConfig.flow === 'free' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Bebas Akses
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2 font-bold px-1">
                  {sessionConfig.flow === 'sequential' ? 'Siswa harus melewati Pre-test dan Materi sebelum bisa main Kuis.' : 'Siswa bisa melompat langsung ke Kuis tanpa membaca materi.'}
                </p>
              </div>
              
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">Modul Aktif</label>
                
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="font-bold text-slate-600 group-hover:text-slate-800"><i className="fa-solid fa-clipboard-list w-6 text-center text-sky-400"></i> Pre-Test</span>
                  <input type="checkbox" className="w-5 h-5 accent-teal-500" checked={sessionConfig.enablePretest} onChange={e => setSessionConfig({...sessionConfig, enablePretest: e.target.checked})} />
                </label>
                
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="font-bold text-slate-600 group-hover:text-slate-800"><i className="fa-solid fa-book-open w-6 text-center text-amber-400"></i> Materi</span>
                  <input type="checkbox" className="w-5 h-5 accent-teal-500" checked={sessionConfig.enableMateri} onChange={e => setSessionConfig({...sessionConfig, enableMateri: e.target.checked})} />
                </label>
                
                <label className="flex items-center justify-between cursor-pointer group opacity-50">
                  <span className="font-bold text-slate-600"><i className="fa-solid fa-gamepad w-6 text-center text-rose-400"></i> Misi Kuis (Balapan)</span>
                  <input type="checkbox" className="w-5 h-5 accent-teal-500" checked={true} readOnly />
                </label>
              </div>

              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5">
                <label className="flex items-start justify-between cursor-pointer group gap-4">
                  <div>
                    <span className="font-black text-rose-700 block mb-1"><i className="fa-solid fa-user-ninja w-6 text-center"></i> Mode Ujian (Tanpa Feedback)</span>
                    <span className="text-xs font-bold text-rose-600/70 block">Siswa dapat bolak-balik soal dan mengubah jawaban. Jawaban benar/salah tidak akan ditampilkan secara *live* di layar siswa.</span>
                  </div>
                  <input type="checkbox" className="w-6 h-6 mt-1 accent-rose-500 rounded-md cursor-pointer shrink-0" checked={sessionConfig.examMode} onChange={e => setSessionConfig({...sessionConfig, examMode: e.target.checked})} />
                </label>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                <label className="flex items-start justify-between cursor-pointer group gap-4">
                  <div>
                    <span className="font-black text-indigo-700 block mb-1"><i className="fa-solid fa-shuffle w-6 text-center"></i> Acak Urutan Soal</span>
                    <span className="text-xs font-bold text-indigo-600/70 block">Soal pada Pre-Test dan Misi Utama akan diacak (shuffle) berbeda-beda untuk tiap siswa untuk mencegah saling menyontek.</span>
                  </div>
                  <input type="checkbox" className="w-6 h-6 mt-1 accent-indigo-500 rounded-md cursor-pointer shrink-0" checked={sessionConfig.shuffleQuestions} onChange={e => setSessionConfig({...sessionConfig, shuffleQuestions: e.target.checked})} />
                </label>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => startLive(sessionConfig)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-black shadow-lg shadow-emerald-500/20 transition-transform transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-rocket"></i> Mulai & Buka Gerbang Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
      <ImportQuestionModal 
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)}
        targetSessionId={id}
        targetCategory={activeTab === 'soal' ? 'misi' : activeTab === 'pretest' ? 'pretest' : 'materi'}
        onImportSuccess={() => loadQuestions()}
        profile={profile}
      />
    </section>
  );
}
