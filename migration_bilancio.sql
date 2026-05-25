-- migration_bilancio.sql
-- Create bilancio table for group budget management
CREATE TABLE public.bilancio (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL,
    created_by uuid NOT NULL REFERENCES public.users(id),
    titolo text NOT NULL,
    importo numeric NOT NULL,
    tipo text NOT NULL, -- e.g., 'entrata' or 'uscita'
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bilancio ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's group_id
CREATE OR REPLACE FUNCTION public.get_my_group_id()
RETURNS uuid AS $$
    SELECT group_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Policies
CREATE POLICY "Select own group" ON public.bilancio
    FOR SELECT USING (group_id = public.get_my_group_id());

CREATE POLICY "Insert own group" ON public.bilancio
    FOR INSERT WITH CHECK (group_id = public.get_my_group_id());

CREATE POLICY "Update own group" ON public.bilancio
    FOR UPDATE USING (group_id = public.get_my_group_id()) WITH CHECK (group_id = public.get_my_group_id());

CREATE POLICY "Delete own group" ON public.bilancio
    FOR DELETE USING (group_id = public.get_my_group_id());

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_bilancio_timestamp()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bilancio_timestamp
BEFORE UPDATE ON public.bilancio
FOR EACH ROW EXECUTE FUNCTION public.update_bilancio_timestamp();
