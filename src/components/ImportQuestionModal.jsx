import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Dialog from '../components/DialogManager';

export default function ImportQuestionModal({ isOpen, onClose, targetSessionId, targetCategory, onImportSuccess, profile }) {
  const [source, setSource] = useState('bank'); // 'bank' | 'session'
  const [bankCategories, setBankCategories] = useState([]);
  const [otherSessions, setOtherSessions] = useState([]);
  
  const [selectedBankCategory, setSelectedBankCategory] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  
  const [questions, setQuestions] = useState([]);
  const [selectedQIds, setSelectedQIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isLegacy, setIsLegacy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSources();
      setQuestions([]);
      setSelectedQIds([]);
    }
  }, [isOpen, source]);

  useEffect(() => {
    if (source === 'bank' && selectedBankCategory) {
      loadBankQuestions();
    } else if (source === 'session' && selectedSessionId) {
      loadSessionQuestions();
    } else {
      setQuestions([]);
    }
  }, [selectedBankCategory, selectedSessionId, source]);

  const loadSources = async () => {
    setLoading(true);
    if (source === 'bank') {
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase.from('bank_categories').select('*, teachers(email)');
      
      if (error && error.code === '42P01') {
        setIsLegacy(true);
        const { data: oldData } = await supabase.from('question_banks').select('category, teacher_id');
        if (oldData) {
          const uniqueCats = [...new Set(oldData.map(d => d.category))];
          setBankCategories(uniqueCats.map(cat => ({ id: cat, name: cat, teachers: { email: 'Legacy' } })));
        }
      } else if (data && !error) {
        let filtered = data;
        if (profile && !profile.can_access_all_banks) {
          filtered = data.filter(c => c.teacher_id === user?.id || c.visibility === 'public' || c.visibility === 'collaborative');
        }
        setBankCategories(filtered.sort((a,b) => a.name.localeCompare(b.name)));
      } else if (error) {
        console.error("Bank load error:", error);
        alert("Gagal memuat bank: " + error.message);
      }
    } else {
      const { data, error } = await supabase.from('sessions').select('id, title, pin').neq('id', targetSessionId).order('created_at', { ascending: false });
      if (error) {
        console.error("Sessions load error:", error);
        alert("Gagal memuat sesi lain: " + error.message);
      }
      if (data) {
        setOtherSessions(data);
      }
    }
    setLoading(false);
  };

  const mapTargetCategoryToType = (cat) => {
    if (cat === 'pretest') return 'PRETEST';
    if (cat === 'materi') return 'MATERI';
    return 'SOAL'; // representing everything else
  };

  const targetType = mapTargetCategoryToType(targetCategory);

  const loadBankQuestions = async () => {
    setLoading(true);
    let query = supabase.from('question_banks').select('*');
    if (isLegacy) {
      query = query.eq('category', selectedBankCategory);
    } else {
      query = query.eq('bank_category_id', selectedBankCategory);
    }
    const { data, error } = await query;
    if (error) alert("Gagal memuat soal bank: " + error.message);
    if (data) setQuestions(data);
    setLoading(false);
  };

  const loadSessionQuestions = async () => {
    setLoading(true);
    let query = supabase.from('questions').select('*').eq('session_id', selectedSessionId);
    
    if (targetType === 'PRETEST') query = query.eq('category', 'PRETEST');
    else if (targetType === 'MATERI') query = query.eq('category', 'MATERI');
    else query = query.neq('category', 'PRETEST').neq('category', 'MATERI');

    const { data, error } = await query;
    if (error) alert("Gagal memuat soal kelas: " + error.message);
    if (data) setQuestions(data);
    setLoading(false);
  };

  const toggleSelect = (id) => {
    setSelectedQIds(prev => prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedQIds.length === questions.length) {
      setSelectedQIds([]);
    } else {
      setSelectedQIds(questions.map(q => q.id));
    }
  };

  const handleImport = async () => {
    if (selectedQIds.length === 0) return;
    setLoading(true);

    const questionsToImport = questions.filter(q => selectedQIds.includes(q.id));
    
    const payloads = questionsToImport.map(q => {
      let finalCategory = 'Pahami Konsep';
      
      if (targetType === 'PRETEST') finalCategory = 'PRETEST';
      else if (targetType === 'MATERI') finalCategory = 'MATERI';
      else {
        // If importing to Misi Game
        if (source === 'session') {
          finalCategory = q.category; // Keep original (e.g. Pahami Konsep)
        } else {
          finalCategory = 'Pahami Konsep'; // Default for Bank Soal to Misi
        }
      }

      return {
        session_id: targetSessionId,
        category: finalCategory,
        q: q.q,
        options: q.options || [],
        answer: q.answer || '',
        imageBase64: q.imageBase64 || null,
        caption: q.caption || ''
      };
    });

    const { error } = await supabase.from('questions').insert(payloads);
    setLoading(false);

    if (error) {
      await Dialog.alert("Gagal mengimpor: " + error.message, "Error");
    } else {
      onImportSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-[slideUpFade_0.3s_ease-out]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800"><i className="fa-solid fa-download text-indigo-500 mr-2"></i> Import Soal / Materi</h2>
            <p className="text-sm font-bold text-slate-500 mt-1">Target: Tab <span className="uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{targetCategory}</span></p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-200 text-slate-500 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition-colors">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Sidebar */}
          <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-slate-100 p-6 bg-slate-50/50 flex flex-col gap-6 overflow-y-auto">
            <div>
              <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-wider">Sumber Import</label>
              <div className="flex bg-slate-200 p-1 rounded-xl">
                <button 
                  onClick={() => setSource('bank')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${source === 'bank' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <i className="fa-solid fa-vault mr-1"></i> Bank Soal
                </button>
                <button 
                  onClick={() => setSource('session')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${source === 'session' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <i className="fa-solid fa-chalkboard-user mr-1"></i> Kelas Lain
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-wider">
                {source === 'bank' ? 'Pilih Kategori Bank' : 'Pilih Kelas'}
              </label>
              
              {source === 'bank' ? (
                <div className="space-y-2">
                  {bankCategories.length === 0 ? <p className="text-sm italic text-slate-400">Tidak ada kategori di Bank Soal.</p> : null}
                  {bankCategories.map(cat => (
                    <button 
                      key={cat.id} 
                      onClick={() => setSelectedBankCategory(cat.id)}
                      className={`w-full text-left p-3 rounded-xl border text-sm font-bold transition-colors ${selectedBankCategory === cat.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-100'}`}
                    >
                      <i className="fa-regular fa-folder mr-2"></i> {cat.name} {cat.teachers?.email ? `(${cat.teachers.email})` : ''}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {otherSessions.length === 0 ? <p className="text-sm italic text-slate-400">Tidak ada kelas lain.</p> : null}
                  {otherSessions.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => setSelectedSessionId(s.id)}
                      className={`w-full text-left p-3 rounded-xl border text-sm font-bold transition-colors ${selectedSessionId === s.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-100'}`}
                    >
                      <div className="truncate"><i className="fa-solid fa-chalkboard mr-2"></i> {s.title}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">PIN: {s.pin}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="md:w-2/3 flex flex-col bg-white">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={questions.length > 0 && selectedQIds.length === questions.length}
                  onChange={toggleSelectAll}
                  disabled={questions.length === 0}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-bold text-slate-600">Pilih Semua ({selectedQIds.length}/{questions.length})</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {loading ? (
                <div className="text-center py-10 text-slate-400"><i className="fa-solid fa-spinner fa-spin text-2xl mb-2 block"></i> Memuat...</div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic">
                  <i className="fa-solid fa-box-open text-4xl mb-3 block opacity-50"></i>
                  Pilih folder/kelas di samping untuk melihat item.
                </div>
              ) : (
                questions.map(q => (
                  <div 
                    key={q.id} 
                    onClick={() => toggleSelect(q.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-colors flex gap-4 ${selectedQIds.includes(q.id) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}
                  >
                    <div className="pt-1">
                      <input 
                        type="checkbox" 
                        checked={selectedQIds.includes(q.id)}
                        readOnly
                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700 line-clamp-2">{q.q}</p>
                      {q.imageBase64 && <span className="inline-block mt-2 text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider"><i className="fa-regular fa-image"></i> Gambar</span>}
                      {Array.isArray(q.options) && q.options.length > 0 && (
                        <div className="mt-2 text-xs text-slate-500 truncate">
                          Opsi: {q.options.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <button 
                onClick={handleImport}
                disabled={selectedQIds.length === 0 || loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                Import {selectedQIds.length} Item ke Kelas Ini
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
