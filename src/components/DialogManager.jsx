import { useState, useEffect } from 'react';

// Global state for dialogs
let dialogCallback = null;

export const Dialog = {
  alert: (message, title = "Pemberitahuan") => {
    return new Promise((resolve) => {
      if (dialogCallback) dialogCallback({ type: 'alert', message, title, resolve });
    });
  },
  confirm: (message, title = "Konfirmasi") => {
    return new Promise((resolve) => {
      if (dialogCallback) dialogCallback({ type: 'confirm', message, title, resolve });
    });
  },
  prompt: (message, title = "Input Data", defaultValue = "") => {
    return new Promise((resolve) => {
      if (dialogCallback) dialogCallback({ type: 'prompt', message, title, defaultValue, resolve });
    });
  }
};

export default function DialogManager() {
  const [state, setState] = useState(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    dialogCallback = (newState) => {
      setState(newState);
      if (newState?.type === 'prompt') {
        setInputValue(newState.defaultValue || "");
      }
    };
    return () => { dialogCallback = null; };
  }, []);

  if (!state) return null;

  const close = (value) => {
    state.resolve(value);
    setState(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform animate-[slideUpFade_0.3s_ease-out]">
        <div className="p-6">
          <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2">
            {state.type === 'alert' && <i className="fa-solid fa-circle-info text-sky-500"></i>}
            {state.type === 'confirm' && <i className="fa-solid fa-circle-question text-amber-500"></i>}
            {state.type === 'prompt' && <i className="fa-solid fa-pen-to-square text-teal-500"></i>}
            {state.title}
          </h3>
          <p className="text-slate-600 font-medium mb-6">{state.message}</p>

          {state.type === 'prompt' && (
            <input 
              type="text" 
              autoFocus
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && close(inputValue)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:border-teal-400 focus:outline-none mb-2"
            />
          )}
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-3 justify-end">
          {state.type !== 'alert' && (
            <button 
              onClick={() => close(state.type === 'prompt' ? null : false)}
              className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
          )}
          
          <button 
            onClick={() => close(state.type === 'prompt' ? inputValue : true)}
            className={`px-6 py-2.5 rounded-xl font-black shadow-lg transition-transform transform hover:-translate-y-0.5
              ${state.type === 'alert' ? 'bg-sky-500 text-white shadow-sky-500/30 w-full' : 
                state.type === 'confirm' ? 'bg-amber-500 text-white shadow-amber-500/30' : 
                'bg-teal-500 text-white shadow-teal-500/30'}`}
          >
            {state.type === 'alert' ? 'Oke, Mengerti' : state.type === 'confirm' ? 'Ya, Lanjutkan' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
