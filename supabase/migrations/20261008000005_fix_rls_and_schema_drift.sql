-- ============================================================================
-- ZENITHSUI MIGRATION: Fix RLS Policies, Document Permissioning & Search Indexing
-- Migration ID: 20261008000005_fix_rls_and_schema_drift
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DOCUMENTS TABLE: Complete CRUD Policies & Enforce Role Verification
-- ----------------------------------------------------------------------------

-- Allow authenticated members to create new documents in their workspaces
DROP POLICY IF EXISTS "Members can insert documents" ON documents;
CREATE POLICY "Members can insert documents" ON documents FOR INSERT TO authenticated
    WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid()) OR
        created_by = auth.uid()
    );

-- Replace permissive UPDATE policy with role-checked policy (prevents viewers from editing)
DROP POLICY IF EXISTS "Members can update documents" ON documents;
DROP POLICY IF EXISTS "Editors and owners can update documents" ON documents;
CREATE POLICY "Editors and owners can update documents" ON documents FOR UPDATE TO authenticated
    USING (public.has_document_permission(id, auth.uid(), 'edit'))
    WITH CHECK (public.has_document_permission(id, auth.uid(), 'edit'));

-- Allow editors/owners to delete documents
DROP POLICY IF EXISTS "Editors and owners can delete documents" ON documents;
CREATE POLICY "Editors and owners can delete documents" ON documents FOR DELETE TO authenticated
    USING (public.has_document_permission(id, auth.uid(), 'edit'));

-- ----------------------------------------------------------------------------
-- 2. PROJECTS TABLE: Full CRUD Policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Members can insert projects" ON projects;
CREATE POLICY "Members can insert projects" ON projects FOR INSERT TO authenticated
    WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can update projects" ON projects;
CREATE POLICY "Members can update projects" ON projects FOR UPDATE TO authenticated
    USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "Members can delete projects" ON projects;
CREATE POLICY "Members can delete projects" ON projects FOR DELETE TO authenticated
    USING (public.is_workspace_member(workspace_id, auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. WORKSPACES & MEMBERS: Creation and Collaboration Policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces" ON workspaces FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Manage document members" ON document_members;
CREATE POLICY "Manage document members" ON document_members FOR ALL TO authenticated
    USING (
        public.has_document_permission(document_id, auth.uid(), 'manage') OR
        public.has_document_permission(document_id, auth.uid(), 'edit')
    );

-- ----------------------------------------------------------------------------
-- 4. DOCUMENT VERSIONS: Allow Editors to Snapshot Versions
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Insert document versions" ON document_versions;
CREATE POLICY "Insert document versions" ON document_versions FOR INSERT TO authenticated
    WITH CHECK (public.has_document_permission(document_id, auth.uid(), 'edit'));

-- ----------------------------------------------------------------------------
-- 5. SEARCH INDEXING: Aggregate Text from Sticky, Document, Arrow, Frame, Embed
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.extract_document_text(p_doc_json JSONB)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE AS $$
DECLARE
    v_text TEXT := '';
BEGIN
    IF p_doc_json IS NULL OR NOT (p_doc_json ? 'nodes') THEN
        RETURN '';
    END IF;

    SELECT string_agg(
        coalesce(elem->>'text', '') || ' ' ||
        coalesce(elem->>'name', '') || ' ' ||
        coalesce(elem->>'title', '') || ' ' ||
        coalesce(elem->>'label', '') || ' ' ||
        coalesce(elem->>'textContent', ''),
        ' '
    )
    INTO v_text
    FROM jsonb_each(p_doc_json->'nodes') AS kv(key, elem)
    WHERE elem->>'type' IN ('text', 'sticky', 'document', 'arrow', 'frame', 'embed');

    RETURN coalesce(trim(v_text), '');
END;
$$;

COMMIT;
