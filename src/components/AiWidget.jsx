import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AiWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Halo! Saya Asisten AI Anda. Ada yang bisa saya bantu terkait penyusunan Pre-Test, materi, atau analisis hasil adaptif siswa?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error("Sesi tidak valid");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ promptText: userMessage })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Backend Error');
      }

      const result = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: result.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-2xl transform transition-transform hover:scale-110"
      >
        <i className="fa-solid fa-robot"></i>
      </button>
      
      {isOpen && (
        <div className="fixed bottom-28 right-6 w-80 sm:w-96 bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] border border-slate-200 z-50 flex flex-col overflow-hidden transition-all origin-bottom-right h-[500px] max-h-[70vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-sky-500 p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl"><i className="fa-solid fa-robot text-xl"></i></div>
              <div>
                <h4 className="font-black leading-none">ChemBot AI</h4>
                <span className="text-xs font-bold text-teal-100">Asisten Guru</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white"><i className="fa-solid fa-times text-xl"></i></button>
          </div>
          
          {/* Chat Area */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 text-sm">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-robot"></i>
                  </div>
                )}
                <div className={`p-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-teal-500 text-white rounded-tr-none text-right' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`} dangerouslySetInnerHTML={{__html: msg.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')}}>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center shrink-0"><i className="fa-solid fa-robot"></i></div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 flex items-center gap-1">
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-typing" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-typing" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-typing" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="flex gap-2 relative">
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSend()}
                className="w-full p-3 pr-12 border-2 border-slate-200 rounded-xl focus:border-teal-500 outline-none text-sm font-medium" 
                placeholder="Tanya sesuatu..." 
              />
              <button 
                onClick={handleSend}
                disabled={loading}
                className="absolute right-2 top-1.5 bottom-1.5 bg-teal-500 hover:bg-teal-600 text-white w-10 rounded-lg shadow-md transition-colors flex items-center justify-center disabled:opacity-50"
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
