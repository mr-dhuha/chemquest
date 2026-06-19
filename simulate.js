import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env
const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) {
    envVars[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Supabase URL or Key not found in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function simulate() {
  console.log("Mencari sesi kuis yang sedang LIVE...");
  const { data: sessions, error } = await supabase.from('sessions').select('*').eq('pin', '9XJM9M').limit(1);
  
  if (error || !sessions || sessions.length === 0) {
    console.log("❌ Tidak ada arena yang sedang LIVE. Silakan buka gerbang arena terlebih dahulu dari Dashboard Guru.");
    process.exit(1);
  }

  const session = sessions[0];
  console.log(`✅ Arena ditemukan! PIN: ${session.pin}`);

  // Hitung jumlah soal untuk sesi ini
  const { data: questions } = await supabase.from('questions').select('id').eq('session_id', session.id);
  const totalQuestions = questions ? questions.length : 10;
  console.log(`Jumlah Soal: ${totalQuestions}`);

  console.log("Membuat 3 Pemain Simulasi (Bot)...");
  const bots = [
    { name: 'Bot Kencang', avatar: '🏎️', score: 0, progress: 0 },
    { name: 'Bot Santai', avatar: '🐢', score: 0, progress: 0 },
    { name: 'Bot Hoki', avatar: '🎲', score: 0, progress: 0 }
  ];

  const players = [];

  for (const bot of bots) {
    const { data: player, error: pErr } = await supabase.from('players').insert({
      session_id: session.id,
      name: bot.name,
      avatar: bot.avatar,
      score: 0,
      progress: 0,
      categoryScores: {},
      refleksi: ""
    }).select().single();
    
    if (player) {
      players.push(player);
      console.log(`Pemain ${player.name} (${player.avatar}) bergabung!`);
    }
  }

  console.log("🏁 Simulasi Balapan Dimulai!");

  // Loop setiap 1 detik untuk mengupdate score dan progress secara acak
  const interval = setInterval(async () => {
    let allFinished = true;

    for (let i = 0; i < players.length; i++) {
      let p = players[i];
      if (p.progress < 100) {
        allFinished = false;
        
        // Random progress step
        const progressIncrement = Math.floor(Math.random() * (100 / totalQuestions)) + 5;
        p.progress = Math.min(100, p.progress + progressIncrement);
        
        // 70% chance to answer correctly (get 10 points)
        if (Math.random() > 0.3) {
          p.score += 10;
        }

        await supabase.from('players').update({
          score: p.score,
          progress: p.progress
        }).eq('id', p.id);

        console.log(`${p.avatar} ${p.name} -> Progress: ${p.progress}%, Score: ${p.score}`);
      }
    }

    if (allFinished) {
      console.log("🏁 Semua bot telah mencapai garis finish! Menghentikan simulasi.");
      clearInterval(interval);
      process.exit(0);
    }
  }, 1500);
}

simulate();
