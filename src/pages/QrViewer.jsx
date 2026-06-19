import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';

export default function QrViewer() {
  const { pin } = useParams();
  const joinUrl = window.location.origin + '/?pin=' + pin;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      <div className="bg-white p-12 sm:p-20 rounded-[3rem] shadow-[0_0_100px_rgba(20,184,166,0.3)] text-center max-w-2xl w-full border-8 border-teal-500">
        <h1 className="text-4xl sm:text-5xl font-black text-slate-800 tracking-tight mb-4">Chem<span className="text-teal-500">Quest</span></h1>
        <p className="text-xl sm:text-2xl font-bold text-slate-500 uppercase tracking-widest mb-12">SCAN UNTUK BERGABUNG</p>
        
        <div className="bg-slate-50 p-6 rounded-3xl inline-block shadow-inner border-4 border-slate-100 mb-12">
          <QRCodeCanvas value={joinUrl} size={350} level="H" />
        </div>
        
        <div className="bg-slate-100 py-6 px-12 rounded-2xl inline-block border-2 border-slate-200">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">ATAU KETIK PIN</p>
          <div className="font-mono text-5xl sm:text-7xl text-slate-800 font-black tracking-[0.3em] leading-none">
            {pin}
          </div>
        </div>
      </div>
    </div>
  );
}
