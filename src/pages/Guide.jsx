import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Guide() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', title: '1. Memulai Sesi', icon: 'fa-rocket' },
    { id: 'manage-bank', title: '2. Mengelola Bank Soal', icon: 'fa-book' },
    { id: 'live-arena', title: '3. Memantau Arena Live', icon: 'fa-gamepad' },
    { id: 'analysis', title: '4. Analisis & Evaluasi', icon: 'fa-chart-pie' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 flex items-center gap-2 font-black transition-colors" title="Kembali ke Dashboard">
              <i className="fa-solid fa-arrow-left"></i> Dashboard
            </button>
            <div>
              <h1 className="font-black text-xl text-slate-800">Panduan Penggunaan ChemQuest</h1>
              <p className="text-xs font-bold text-slate-500">Pusat Bantuan Guru & Admin</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-xs font-black uppercase tracking-wider">V1.0 Help Center</span>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col md:flex-row gap-8 p-4 py-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sticky top-24">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Daftar Isi</h2>
            <nav className="space-y-1">
              {sections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all text-left ${activeSection === sec.id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <i className={`fa-solid ${sec.icon} w-5 text-center ${activeSection === sec.id ? 'text-teal-500' : 'text-slate-400'}`}></i>
                  {sec.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1">
          {activeSection === 'getting-started' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-fade-in">
              <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
                <i className="fa-solid fa-rocket"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-4">Memulai Sesi Baru</h2>
              <p className="text-slate-600 mb-8 font-medium leading-relaxed">Sesi adalah sebuah ruang virtual tempat siswa Anda akan belajar dan bermain. Setiap sesi memiliki PIN unik yang bisa dibagikan ke siswa.</p>
              
              <div className="space-y-6">
                <div className="border-l-4 border-teal-500 pl-5">
                  <h3 className="font-black text-lg text-slate-800 mb-2">1. Buat Kelas/Sesi di Dashboard</h3>
                  <p className="text-slate-600 mb-4 text-sm leading-relaxed">Klik tombol <strong>"Buat Kelas/Sesi Baru"</strong> pada dashboard utama Anda. Masukkan nama kelas (misal: "Kimia Dasar X-A") dan klik Buat.</p>
                  <div className="bg-slate-100 p-4 rounded-xl flex items-center justify-center border border-slate-200">
                    <button className="bg-teal-500 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-teal-500/20"><i className="fa-solid fa-plus mr-2"></i> Buat Kelas/Sesi Baru</button>
                  </div>
                </div>

                <div className="border-l-4 border-teal-500 pl-5">
                  <h3 className="font-black text-lg text-slate-800 mb-2">2. Bagikan PIN Sesi</h3>
                  <p className="text-slate-600 mb-4 text-sm leading-relaxed">Setelah sesi dibuat, Anda akan mendapatkan <strong>PIN Sesi (6 digit)</strong>. Anda bisa memberikan PIN ini ke siswa, atau membagikan QR Code dengan menekan tombol barcode di samping PIN.</p>
                  <div className="bg-slate-100 p-4 rounded-xl flex items-center justify-center gap-4 border border-slate-200">
                    <span className="bg-white text-slate-800 px-6 py-2 rounded-lg font-mono font-black text-xl border border-slate-200 shadow-sm">PIN: ABC123</span>
                    <button className="bg-white text-teal-600 w-10 h-10 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center"><i className="fa-solid fa-qrcode"></i></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'manage-bank' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-fade-in">
              <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
                <i className="fa-solid fa-book"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-4">Mengelola Bank Soal & Materi</h2>
              <p className="text-slate-600 mb-8 font-medium leading-relaxed">Anda dapat membuat pertanyaan secara manual satu per satu, atau mengimpor soal-soal yang sudah pernah Anda buat di Bank Soal.</p>
              
              <div className="space-y-6">
                <div className="bg-sky-50 rounded-2xl p-6 border border-sky-100">
                  <h3 className="font-black text-lg text-sky-800 mb-2"><i className="fa-solid fa-download mr-2"></i> Import dari Bank Soal</h3>
                  <p className="text-sky-700 mb-4 text-sm leading-relaxed">Untuk menghemat waktu, Anda dapat mengambil set soal dari Bank Soal Anda sendiri. Klik tombol <strong>Import dari Bank/Kelas Lain</strong> di dalam tab Misi Game.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 p-5 rounded-2xl">
                    <h4 className="font-black text-slate-700 mb-2">Tab Pre-Test</h4>
                    <p className="text-xs text-slate-500 font-medium">Buatlah pertanyaan pemanasan untuk mengukur pengetahuan awal siswa. Soal ini dikerjakan sebelum siswa membaca materi.</p>
                  </div>
                  <div className="border border-slate-200 p-5 rounded-2xl">
                    <h4 className="font-black text-slate-700 mb-2">Tab Materi</h4>
                    <p className="text-xs text-slate-500 font-medium">Buat halaman materi menggunakan <em>Rich Text Editor</em>. Anda dapat menyisipkan gambar dan merapikan teks di sini.</p>
                  </div>
                  <div className="border border-slate-200 p-5 rounded-2xl sm:col-span-2">
                    <h4 className="font-black text-slate-700 mb-2">Tab Misi Game</h4>
                    <p className="text-xs text-slate-500 font-medium">Soal-soal utama yang akan dimainkan di Arena. Terdapat 3 level kategori yang akan terbuka sesuai urutan.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'live-arena' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-fade-in">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
                <i className="fa-solid fa-gamepad"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-4">Memantau Arena Live</h2>
              <p className="text-slate-600 mb-8 font-medium leading-relaxed">ChemQuest dirancang khusus untuk memotivasi siswa dengan Arena gamifikasi yang interaktif.</p>
              
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-black mt-1">1</div>
                  <div>
                    <h3 className="font-black text-slate-800 mb-1">Buka Gerbang Kuis</h3>
                    <p className="text-sm text-slate-600">Klik tombol berwarna hijau <strong>Buka Gerbang Kuis</strong> pada menu Manajemen Sesi. Anda bisa mengatur batas waktu (timer) untuk masing-masing modul sebelum membukanya.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 font-black mt-1">2</div>
                  <div>
                    <h3 className="font-black text-slate-800 mb-1">Pantau Lintasan Arena</h3>
                    <p className="text-sm text-slate-600 mb-3">Klik tombol <strong>Pantau Lintasan Arena</strong> untuk membuka layar *Leaderboard* interaktif yang bisa Anda proyeksikan ke proyektor kelas.</p>
                    <div className="bg-slate-900 rounded-xl p-4 shadow-inner relative overflow-hidden">
                      <div className="flex items-center justify-between mb-2 opacity-50">
                        <span className="text-white text-xs font-black">Arena Live</span>
                        <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div><div className="w-2 h-2 rounded-full bg-amber-500"></div></div>
                      </div>
                      <div className="space-y-2">
                        <div className="bg-slate-800 rounded p-2 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-700"></div>
                          <div className="h-2 w-1/3 bg-slate-700 rounded-full"></div>
                          <div className="h-2 w-1/4 bg-emerald-500 rounded-full ml-auto"></div>
                        </div>
                        <div className="bg-slate-800 rounded p-2 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-700"></div>
                          <div className="h-2 w-1/4 bg-slate-700 rounded-full"></div>
                          <div className="h-2 w-1/5 bg-emerald-500 rounded-full ml-auto"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-black mt-1">3</div>
                  <div>
                    <h3 className="font-black text-slate-800 mb-1">Selesaikan Pertandingan</h3>
                    <p className="text-sm text-slate-600">Saat waktu habis atau semua siswa selesai, klik <strong>Selesaikan Pertandingan</strong>. Layar Arena akan berubah menjadi podium kemenangan untuk 3 juara teratas.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'analysis' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-fade-in">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
                <i className="fa-solid fa-chart-pie"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-4">Analisis & Evaluasi</h2>
              <p className="text-slate-600 mb-8 font-medium leading-relaxed">Pantau perkembangan kelas dan temukan kelemahan siswa dengan mudah menggunakan dasbor analisis metrik kelas.</p>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="border border-slate-200 rounded-2xl p-6">
                  <h3 className="font-black text-slate-800 mb-2 flex items-center gap-2"><i className="fa-solid fa-chart-simple text-indigo-500"></i> Ringkasan Analisis Kelas</h3>
                  <p className="text-sm text-slate-600 mb-4">Di dalam tab <strong>Analisis Siswa</strong>, Anda bisa melihat performa kelas secara menyeluruh. Metrik ini menampilkan rata-rata kelas, dan persentase siswa berdasarkan kategori kemampuan (Level Lanjut, Ulang Materi, Remedial).</p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black rounded uppercase">Lanjut &gt;= 80%</span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-black rounded uppercase">Ulang 50-79%</span>
                    <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-black rounded uppercase">Remedial &lt; 50%</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50">
                  <h3 className="font-black text-slate-800 mb-2 flex items-center gap-2"><i className="fa-solid fa-file-excel text-emerald-600"></i> Export Laporan ke Excel (XLSX)</h3>
                  <p className="text-sm text-slate-600">
                    Tidak perlu mencatat nilai satu per satu. Cukup klik tombol <strong>Export Laporan (XLSX)</strong>. 
                    Anda akan mendapatkan file Excel rapi yang berisi:
                  </p>
                  <ul className="list-disc list-inside mt-3 text-sm font-bold text-slate-600 space-y-1">
                    <li>Nama Siswa & Waktu Pengerjaan</li>
                    <li>Skor Akhir & Status Kemampuan</li>
                    <li>Detail jawaban benar/salah per soal</li>
                    <li>Jurnal/Refleksi pembelajaran siswa</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
