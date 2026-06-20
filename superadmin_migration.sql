-- 1. Tambahkan kolom untuk kontrol hak akses Bank Soal Global
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS can_access_all_banks BOOLEAN DEFAULT TRUE;

-- 2. Tambahkan kolom untuk melacak kapan guru terakhir login
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- 3. Tambahkan kolom kepemilikan di tabel question_banks
ALTER TABLE public.question_banks ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Buat tabel Activity Logs untuk memantau semua aktivitas guru
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Matikan RLS untuk tabel log agar bisa diakses mudah dari Frontend (Hanya untuk keperluan prototipe ini)
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;

-- 6. RPC Function untuk Toggle Akses Bank Soal (Dipanggil oleh Super Admin)
CREATE OR REPLACE FUNCTION admin_toggle_bank_access(target_id UUID, new_status BOOLEAN)
RETURNS VOID AS $$
BEGIN
  UPDATE public.teachers SET can_access_all_banks = new_status WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
