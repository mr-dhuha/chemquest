-- 1. Create teachers table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT DEFAULT 'teacher',
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Turn off RLS for simplicity on teachers (Only App queries this)
ALTER TABLE public.teachers DISABLE ROW LEVEL SECURITY;

-- 3. Trigger to insert into teachers on new auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.teachers (id, email, role, is_approved)
  VALUES (
    NEW.id, 
    NEW.email, 
    CASE WHEN NEW.email = 'mrdhuhaofficial@gmail.com' THEN 'admin' ELSE 'teacher' END,
    CASE WHEN NEW.email = 'mrdhuhaofficial@gmail.com' THEN TRUE ELSE FALSE END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill existing users (if any) into the teachers table
INSERT INTO public.teachers (id, email, role, is_approved)
SELECT id, email, 
  CASE WHEN email = 'mrdhuhaofficial@gmail.com' THEN 'admin' ELSE 'teacher' END,
  TRUE -- Approve existing users automatically so they aren't locked out
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. RPC Functions for Super Admin
-- Approve a teacher
CREATE OR REPLACE FUNCTION admin_approve_teacher(target_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.teachers SET is_approved = TRUE WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete a teacher
CREATE OR REPLACE FUNCTION admin_delete_teacher(target_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Deleting from auth.users will cascade to public.teachers
  DELETE FROM auth.users WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset a teacher's password (using crypt with bcrypt salt as GoTrue uses)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION admin_reset_password(target_id UUID, new_password TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
