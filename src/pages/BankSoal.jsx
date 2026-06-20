import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../components/DialogManager';

export default function BankSoal({ session, profile }) {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [questions, setQuestions] = useState([]);

  // QForm states
  const [showQForm, setShowQForm] = useState(false);
  const [qType, setQType] = useState('soal'); // 'soal' (misi) atau 'materi'
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState('');
  const [qAnswer, setQAnswer] = useState('');
  const [qImage, setQImage] = useState(null);
  const [qCaption, setQCaption] = useState('');
  const [editQuestionId, setEditQuestionId] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeCategory) {
      loadQuestions();
    } else {
      setQuestions([]);
    }
  }, [activeCategory]);

  const loadCategories = async () => {
    let query = supabase.from('question_banks').select('category');
    if (profile && !profile.can_access_all_banks) {
      query = query.eq('teacher_id', session.user.id);
    }
    const { data, error } = await query;
    if (error) console.error("Error loadCategories:", error);
    if (data && !error) {
      const uniqueCats = [...new Set(data.map(d => d.category))];
      setCategories(uniqueCats.sort());
    }
  };

  const loadQuestions = async () => {
    let query = supabase.from('question_banks').select('*').eq('category', activeCategory).order('created_at', { ascending: true });
    if (profile && !profile.can_access_all_banks) {
      query = query.eq('teacher_id', session.user.id);
    }
    const { data, error } = await query;
    if (error) console.error("Error loadQuestions:", error);
    if (data && !error) setQuestions(data);
  };

  const createCategory = async () => {
    const newCat = await Dialog.prompt("Masukkan nama kategori baru (misal: Hidrokarbon):", "Kategori Baru");
    if (!newCat || !newCat.trim()) return;
    const catName = newCat.trim();

    // To create a category, we must insert a dummy row or just set it as active and wait for first insertion.
    // It's cleaner to set it as active category. It will "exist" once a question is added.
    if (!categories.includes(catName)) {
      setCategories(prev => [...prev, catName].sort());
    }
    setActiveCategory(catName);
  };

  const deleteCategory = async (catName) => {
    if (await Dialog.confirm(`Hapus kategori "${catName}" beserta SELURUH soal di dalamnya?`, "Hapus Kategori")) {
      await supabase.from('question_banks').delete().eq('category', catName);
      if (activeCategory === catName) setActiveCategory('');
      loadCategories();
    }
  };

  const resetForm = () => {
    setQType('soal');
    setQText('');
    setQOptions('');
    setQAnswer('');
    setQImage(null);
    setQCaption('');
    setEditQuestionId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setQImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const saveQuestion = async () => {
    if (!qText) {
      await Dialog.alert("Konten materi/soal wajib diisi!", "Error");
      return;
    }

    const payload = {
      category: activeCategory,
      type: qType === 'soal' ? 'misi' : 'materi', // for simplicity, use 'misi' for bank questions
      q: qText,
      options: qType === 'soal' ? qOptions.split(',').map(s => s.trim()).filter(Boolean) : [],
      answer: qAnswer,
      imageBase64: qImage,
      caption: qCaption,
      teacher_id: session.user.id
    };

    if (editQuestionId) {
      const { error } = await supabase.from('question_banks').update(payload).eq('id', editQuestionId);
      if (error) {
        await Dialog.alert("Gagal update soal: " + error.message, "Error");
      } else {
        supabase.from('activity_logs').insert({ teacher_id: session.user.id, action: 'Memperbarui soal di Bank Soal', details: `Kategori: ${activeCategory}` }).then();
        setShowQForm(false);
        resetForm();
        loadQuestions();
        if (!categories.includes(activeCategory)) loadCategories();
      }
    } else {
      const { error } = await supabase.from('question_banks').insert([payload]);
      if (error) {
        await Dialog.alert("Gagal simpan soal: " + error.message, "Error");
      } else {
        supabase.from('activity_logs').insert({ teacher_id: session.user.id, action: 'Membuat soal baru di Bank Soal', details: `Kategori: ${activeCategory}` }).then();
        setShowQForm(false);
        resetForm();
        loadQuestions();
        if (!categories.includes(activeCategory)) loadCategories();
      }
    }
  };

  const handleEditQuestion = (q) => {
    setEditQuestionId(q.id);
    setQType(q.type === 'materi' ? 'materi' : 'soal');
    setQText(q.q);

    let opts = q.options;
    try { if (typeof opts === 'string') opts = JSON.parse(opts); } catch (e) { }
    if (Array.isArray(opts)) opts = opts.join(', ');
    setQOptions(opts || '');

    setQAnswer(q.answer || '');
    setQImage(q.imageBase64 || null);
    setQCaption(q.caption || '');

    setShowQForm(true);
  };

  const deleteQuestion = async (id) => {
    if (await Dialog.confirm("Yakin hapus item ini?", "Hapus")) {
      const { error } = await supabase.from('question_banks').delete().eq('id', id);
      if (error) await Dialog.alert("Gagal hapus soal: " + error.message, "Error");
      else {
        supabase.from('activity_logs').insert({ teacher_id: session.user.id, action: 'Menghapus soal di Bank Soal', details: `Kategori: ${activeCategory}` }).then();
        loadQuestions();
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pt-16 sm:pt-20">
      <div className="max-w-6xl mx-auto w-full p-6 sm:p-8 flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-800 font-black mb-4 flex items-center gap-2 transition-colors">
              <i className="fa-solid fa-arrow-left"></i> Kembali ke Dashboard
            </button>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <i className="fa-solid fa-vault text-amber-500"></i> Bank Soal & Materi
            </h1>
            <p className="text-slate-500 mt-1 font-medium">Buat template soal dan materi untuk di-import ke kelas-kelas Anda.</p>
          </div>

          <button
            onClick={createCategory}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-transform hover:-translate-y-0.5"
          >
            <i className="fa-solid fa-folder-plus"></i> Kategori Baru
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Categories */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-100 border-b border-slate-200">
                <h2 className="font-black text-slate-700"><i className="fa-solid fa-folder-tree mr-2 text-slate-400"></i> Kategori</h2>
              </div>
              <div className="p-2 space-y-1">
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-400 p-4 text-center italic">Belum ada kategori.</p>
                ) : categories.map(cat => (
                  <div
                    key={cat}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${activeCategory === cat ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' : 'hover:bg-slate-50 text-slate-600'}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    <span className="truncate pr-2"><i className={`fa-solid ${activeCategory === cat ? 'fa-folder-open text-indigo-500' : 'fa-folder text-slate-300'} mr-2`}></i> {cat}</span>
                    {activeCategory === cat && (
                      <button onClick={(e) => { e.stopPropagation(); deleteCategory(cat); }} className="text-rose-400 hover:text-rose-600 p-1">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:w-3/4">
            {!activeCategory ? (
              <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-200 h-full flex flex-col items-center justify-center">
                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                  <i className="fa-solid fa-folder-open text-4xl text-indigo-300"></i>
                </div>
                <h3 className="text-xl font-black text-slate-700 mb-2">Pilih Kategori</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Silakan pilih kategori di menu samping atau buat kategori baru untuk mulai menambahkan soal dan materi.</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <i className="fa-solid fa-folder text-indigo-500"></i> {activeCategory}
                  </h3>
                  <button
                    onClick={() => { resetForm(); setShowQForm(true); }}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                  >
                    <i className="fa-solid fa-plus"></i> Tambah Item
                  </button>
                </div>

                {/* Form Input */}
                {showQForm && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8 animate-[slideDown_0.3s_ease-out]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-black text-slate-800">{editQuestionId ? 'Edit Item' : 'Tambah Item Baru'}</h3>
                      <button onClick={() => setShowQForm(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                        <i className="fa-solid fa-times text-xl"></i>
                      </button>
                    </div>

                    <div className="flex gap-4 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
                        <input type="radio" checked={qType === 'materi'} onChange={() => setQType('materi')} className="accent-indigo-600" />
                        <span className="font-bold text-slate-700">Modul Materi</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
                        <input type="radio" checked={qType === 'soal'} onChange={() => setQType('soal')} className="accent-indigo-600" />
                        <span className="font-bold text-slate-700">Soal Kuis</span>
                      </label>
                    </div>

                    <textarea
                      value={qText}
                      onChange={e => setQText(e.target.value)}
                      className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none mb-4 resize-y min-h-[100px]"
                      placeholder={qType === 'materi' ? "Tulis penjelasan materi di sini..." : "Pertanyaan soal..."}
                    />

                    <div className="mb-4">
                      <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-wider">Gambar Pendukung (Opsional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {qImage && (
                        <div className="mt-4 relative inline-block">
                          <img src={qImage} alt="Preview" className="h-32 rounded-xl shadow-md border border-slate-200" />
                          <button onClick={() => { setQImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-rose-600 shadow-md">
                            <i className="fa-solid fa-times text-xs"></i>
                          </button>
                        </div>
                      )}
                    </div>

                    {qImage && (
                      <input
                        type="text"
                        value={qCaption}
                        onChange={e => setQCaption(e.target.value)}
                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none mb-4 text-sm"
                        placeholder="Caption gambar (opsional)..."
                      />
                    )}

                    {qType === 'soal' && (
                      <>
                        <input
                          type="text"
                          value={qOptions}
                          onChange={e => setQOptions(e.target.value)}
                          className="w-full p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none mb-4"
                          placeholder="Pilihan ganda (pisahkan dengan koma: Opsi A, Opsi B, Opsi C)"
                        />
                        <input
                          type="text"
                          value={qAnswer}
                          onChange={e => setQAnswer(e.target.value)}
                          className="w-full p-4 border-2 border-emerald-200 bg-emerald-50 rounded-xl focus:border-emerald-400 outline-none mb-4"
                          placeholder="Kunci Jawaban (harus sama persis dengan salah satu opsi)"
                        />
                      </>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                      <button onClick={() => setShowQForm(false)} className="px-6 py-2.5 text-slate-500 hover:bg-slate-200 rounded-xl font-bold transition-colors">Batal</button>
                      <button onClick={saveQuestion} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-600/20 transition-transform hover:-translate-y-0.5">
                        <i className="fa-solid fa-save mr-2"></i> Simpan
                      </button>
                    </div>
                  </div>
                )}

                {/* List Questions */}
                <div className="space-y-4">
                  {questions.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <i className="fa-solid fa-box-open text-4xl text-slate-300 mb-3"></i>
                      <p className="text-slate-500">Kategori ini masih kosong.</p>
                    </div>
                  ) : questions.map((q, i) => (
                    <div key={q.id} className="border-2 border-slate-100 p-5 rounded-2xl hover:border-indigo-200 transition-colors bg-white relative group">
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditQuestion(q)} className="w-8 h-8 rounded-lg bg-sky-50 text-sky-500 hover:bg-sky-500 hover:text-white flex items-center justify-center transition-colors">
                          <i className="fa-solid fa-pencil text-sm"></i>
                        </button>
                        <button onClick={() => deleteQuestion(q.id)} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors">
                          <i className="fa-solid fa-trash-can text-sm"></i>
                        </button>
                      </div>

                      <div className="flex items-start gap-4 pr-16">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${q.type === 'materi' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          <i className={`fa-solid ${q.type === 'materi' ? 'fa-book-open' : 'fa-question'} text-lg`}></i>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {q.type === 'materi' ? 'Materi' : 'Soal'}
                            </span>
                          </div>
                          <p className="text-slate-800 font-medium whitespace-pre-wrap">{q.q}</p>

                          {q.imageBase64 && (
                            <div className="mt-3">
                              <img src={q.imageBase64} alt="Attachment" className="max-h-40 rounded-lg border border-slate-200" />
                              {q.caption && <p className="text-xs text-slate-500 mt-1 italic">{q.caption}</p>}
                            </div>
                          )}

                          {q.type !== 'materi' && Array.isArray(q.options) && q.options.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, idx) => (
                                <div key={idx} className={`text-sm p-2 rounded-lg border-2 ${opt === q.answer ? 'border-emerald-400 bg-emerald-50 font-bold text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-600'}`}>
                                  {opt === q.answer && <i className="fa-solid fa-check-circle mr-2 text-emerald-500"></i>}
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
