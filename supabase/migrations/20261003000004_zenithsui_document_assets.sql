-- ---------------------------------------------------------------------------
-- Zenithsui Document & Asset Attachments Schema Upgrade
-- ---------------------------------------------------------------------------

-- 1. Allow public_url to be NULL for private document assets
ALTER TABLE assets ALTER COLUMN public_url DROP NOT NULL;

-- 2. Add document-specific columns (page count, thumbnail path)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS page_count INT NULL CHECK (page_count IS NULL OR page_count > 0);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS thumbnail_path VARCHAR(512) NULL;

-- 3. RLS Policies: Workspace members can insert and manage attachments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'assets' AND policyname = 'Insert assets'
    ) THEN
        CREATE POLICY "Insert assets" ON assets FOR INSERT TO authenticated
            WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'assets' AND policyname = 'Update assets'
    ) THEN
        CREATE POLICY "Update assets" ON assets FOR UPDATE TO authenticated
            USING (public.is_workspace_member(workspace_id, auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'assets' AND policyname = 'Delete assets'
    ) THEN
        CREATE POLICY "Delete assets" ON assets FOR DELETE TO authenticated
            USING (public.is_workspace_member(workspace_id, auth.uid()));
    END IF;
END $$;
