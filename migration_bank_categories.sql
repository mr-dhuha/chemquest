-- Create bank_categories table
CREATE TABLE IF NOT EXISTS public.bank_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL DEFAULT 'private', -- 'private', 'public', 'collaborative'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, teacher_id)
);

-- Enable RLS
ALTER TABLE public.bank_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for everyone" ON public.bank_categories;
DROP POLICY IF EXISTS "Enable write access for owner" ON public.bank_categories;

-- Policy: Everyone can read all categories
CREATE POLICY "Enable read access for everyone" ON public.bank_categories FOR SELECT USING (true);

-- Policy: Owners can insert, update, delete
CREATE POLICY "Enable write access for owner" ON public.bank_categories FOR ALL USING (auth.uid() = teacher_id);

-- Migrate existing categories from question_banks
-- Insert distinct combinations of category and teacher_id into bank_categories
INSERT INTO public.bank_categories (name, teacher_id, visibility)
SELECT DISTINCT category, teacher_id, 'private'
FROM public.question_banks
WHERE category IS NOT NULL
ON CONFLICT (name, teacher_id) DO NOTHING;

-- Add bank_category_id to question_banks
ALTER TABLE public.question_banks ADD COLUMN bank_category_id UUID REFERENCES public.bank_categories(id) ON DELETE CASCADE;

-- Backfill bank_category_id
UPDATE public.question_banks q
SET bank_category_id = c.id
FROM public.bank_categories c
WHERE q.category = c.name AND q.teacher_id = c.teacher_id;

-- RPC to update visibility (for super admin or owner)
CREATE OR REPLACE FUNCTION admin_update_bank_visibility(target_id UUID, new_visibility TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.bank_categories SET visibility = new_visibility WHERE id = target_id;
END;
$$;
