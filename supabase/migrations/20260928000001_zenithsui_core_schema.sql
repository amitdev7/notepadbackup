-- ============================================================================
-- ZENITHSUI COLLABORATIVE DOCUMENT ENGINE - POSTGRESQL PRODUCTION DDL SCHEMA
-- ============================================================================
-- Architecture: Multi-tenant, optimistic concurrency, soft-delete safe,
--               JSONB canvas graph with GIN FTS and TOAST-optimized snapshotting.
-- Compatible with PostgreSQL 14, 15, 16, 17+
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE workspace_role AS ENUM (
        'owner',
        'admin',
        'member',
        'viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE document_role AS ENUM (
        'manager',
        'editor',
        'commenter',
        'viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE share_access_level AS ENUM (
        'view',
        'comment',
        'edit'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_action AS ENUM (
        'workspace.created',
        'workspace.updated',
        'workspace.deleted',
        'member.invited',
        'member.joined',
        'member.role_updated',
        'member.removed',
        'project.created',
        'project.updated',
        'project.deleted',
        'document.created',
        'document.updated',
        'document.renamed',
        'document.archived',
        'document.restored',
        'document.deleted',
        'version.created',
        'version.restored',
        'share.created',
        'share.updated',
        'share.revoked',
        'asset.uploaded',
        'asset.deleted'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE device_client_type AS ENUM (
        'web',
        'desktop_mac',
        'desktop_windows',
        'desktop_linux',
        'mobile_ios',
        'mobile_android',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CORE HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function: Automatically update updated_at timestamp on row mutation
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$;

-- Function: Immutable text extraction from Zenithsui document_json nodes for FTS
CREATE OR REPLACE FUNCTION extract_document_text(doc jsonb)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT coalesce(string_agg(elem->>'text', ' ' ORDER BY elem->>'text'), '')
    FROM jsonb_each(coalesce(doc->'nodes', '{}'::jsonb)) AS kv(k, elem)
    WHERE elem->>'type' = 'text' AND elem->>'text' IS NOT NULL;
$$;

-- ----------------------------------------------------------------------------
-- 3. TABLES (11 Core Entities)
-- ----------------------------------------------------------------------------

-- 1. PROFILES
-- Stores user identities, display names, and app-level preferences
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    preferences JSONB NOT NULL DEFAULT '{"theme": "internet-blue", "paper": "subtle", "font": "hand", "grid": true, "contextRow": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL
);

-- 2. WORKSPACES
-- Top-level multi-tenant container for projects, documents, and billing
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    avatar_url TEXT,
    tier VARCHAR(32) NOT NULL DEFAULT 'free',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL
);

-- 3. WORKSPACE MEMBERS
-- Access control join table between workspaces and users
CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role workspace_role NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (workspace_id, profile_id)
);

-- 4. PROJECTS
-- Organizational folders / spaces within a workspace
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL
);

-- 5. DOCUMENTS
-- Core Zenithsui drawing document containing the full canvas graph
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'untitled scribbles',
    document_json JSONB NOT NULL DEFAULT '{"nodes": {}, "order": [], "look": {"theme": "internet-blue", "paper": "subtle", "font": "hand", "grid": true}}'::jsonb,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
    revision BIGINT NOT NULL DEFAULT 1 CHECK (revision >= 1),
    thumbnail_url TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    last_modified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL
);

-- 6. DOCUMENT MEMBERS
-- Granular document-level permission overrides
CREATE TABLE IF NOT EXISTS document_members (
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role document_role NOT NULL DEFAULT 'editor',
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (document_id, profile_id)
);

-- 7. SHARE LINKS
-- Public or password-protected external links for viewing/editing
CREATE TABLE IF NOT EXISTS share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    access_level share_access_level NOT NULL DEFAULT 'view',
    password_hash VARCHAR(255) NULL,
    expires_at TIMESTAMPTZ NULL,
    max_uses INT NULL CHECK (max_uses IS NULL OR max_uses > 0),
    use_count INT NOT NULL DEFAULT 0 CHECK (use_count >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL
);

-- 8. DOCUMENT VERSIONS
-- Immutable snapshots of canvas state for audit, milestones, and rollback
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    revision BIGINT NOT NULL CHECK (revision >= 1),
    version_number INT NOT NULL CHECK (version_number >= 1),
    name VARCHAR(120) NULL,
    description TEXT NULL,
    snapshot_json JSONB NOT NULL,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version >= 1),
    is_named BOOLEAN NOT NULL DEFAULT FALSE,
    node_count INT NOT NULL DEFAULT 0 CHECK (node_count >= 0),
    thumbnail_url TEXT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_document_versions_doc_ver UNIQUE (document_id, version_number)
);

-- 9. ASSETS
-- Metadata for uploaded canvas media (images, pasted screenshots, exports)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
    mime_type VARCHAR(100) NOT NULL,
    storage_key VARCHAR(512) NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    width INT NULL CHECK (width IS NULL OR width > 0),
    height INT NULL CHECK (height IS NULL OR height > 0),
    sha256_hash CHAR(64) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    deleted_at TIMESTAMPTZ NULL
);

-- 10. ACTIVITY LOG
-- Comprehensive audit trail for workspace and document actions
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action activity_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 11. DEVICES
-- Session registry for active clients, presence, and security tracking
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(128) NOT NULL,
    device_name VARCHAR(120) NOT NULL DEFAULT 'Web Browser',
    client_type device_client_type NOT NULL DEFAULT 'web',
    push_token TEXT NULL,
    last_ip_address INET NULL,
    user_agent TEXT NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_devices_profile_fingerprint UNIQUE (profile_id, device_fingerprint)
);

-- ----------------------------------------------------------------------------
-- 4. PERFORMANCE & CONCURRENCY INDEXES
-- ----------------------------------------------------------------------------

-- Foreign Key Indexes (Eliminate sequential table lock scans on deletes/joins)
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_profile_id ON workspace_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_invited_by ON workspace_members(invited_by) WHERE invited_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_last_modified_by ON documents(last_modified_by) WHERE last_modified_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_members_profile_id ON document_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_share_links_document_id ON share_links(document_id);
CREATE INDEX IF NOT EXISTS idx_share_links_created_by ON share_links(created_by);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_by ON document_versions(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_workspace_id ON assets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_assets_document_id ON assets(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_uploaded_by ON assets(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_assets_sha256 ON assets(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id_created ON activity_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_document_id_created ON activity_log(document_id, created_at DESC) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_log_actor_id_created ON activity_log(actor_id, created_at DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_devices_profile_last_active ON devices(profile_id, last_active_at DESC);

-- Soft Delete Partial Unique & Filter Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspaces_slug_active ON workspaces (slug) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_workspace_name_active ON projects (workspace_id, name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_workspace_active_recents ON documents (workspace_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_project_active_recents ON documents (project_id, updated_at DESC) WHERE deleted_at IS NULL AND project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_share_links_active_token ON share_links (token) WHERE deleted_at IS NULL AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_assets_workspace_active ON assets (workspace_id, created_at DESC) WHERE deleted_at IS NULL;

-- JSONB Path GIN Indexes (Fast containment queries on canvas objects)
CREATE INDEX IF NOT EXISTS idx_documents_json_path ON documents USING gin (document_json jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_document_versions_snapshot_path ON document_versions USING gin (snapshot_json jsonb_path_ops);

-- Canvas Full-Text Search Index (Extracted text from TextNodes)
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents USING gin (to_tsvector('english', extract_document_text(document_json))) WHERE deleted_at IS NULL;

-- Look Theme Expression Index (Quick analytics/filtering by Zenithsui palette)
CREATE INDEX IF NOT EXISTS idx_documents_look_theme ON documents (((document_json->'look'->>'theme'))) WHERE deleted_at IS NULL;

-- Document Version History Indexes (Fast lookup for history panel & named milestones)
CREATE INDEX IF NOT EXISTS idx_document_versions_timeline ON document_versions (document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_named ON document_versions (document_id, version_number DESC) WHERE is_named = TRUE;

-- ----------------------------------------------------------------------------
-- 5. TRIGGERS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_workspaces_updated_at
BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_workspace_members_updated_at
BEFORE UPDATE ON workspace_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_projects_updated_at
BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_document_members_updated_at
BEFORE UPDATE ON document_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_share_links_updated_at
BEFORE UPDATE ON share_links FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_devices_updated_at
BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Concurrency Trigger: Ensure document revision strictly increments on updates
CREATE OR REPLACE FUNCTION enforce_document_revision()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.revision <= OLD.revision THEN
        RAISE EXCEPTION 'Concurrency conflict: revision must strictly increase (old=%, new=%)', OLD.revision, NEW.revision
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_documents_revision_guard
BEFORE UPDATE OF document_json, title ON documents
FOR EACH ROW EXECUTE FUNCTION enforce_document_revision();

-- ----------------------------------------------------------------------------
-- 6. STORED PROCEDURES & WORKFLOW HELPERS
-- ----------------------------------------------------------------------------

-- Create a safe document snapshot version
CREATE OR REPLACE FUNCTION create_document_snapshot(
    p_document_id UUID,
    p_actor_id UUID,
    p_name VARCHAR(120) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_is_named BOOLEAN DEFAULT FALSE
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_doc RECORD;
    v_next_ver INT;
    v_node_count INT;
    v_new_version_id UUID;
BEGIN
    SELECT id, document_json, revision, schema_version, thumbnail_url
    INTO v_doc
    FROM documents
    WHERE id = p_document_id AND deleted_at IS NULL
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document not found or inactive: %', p_document_id;
    END IF;

    SELECT coalesce(max(version_number), 0) + 1
    INTO v_next_ver
    FROM document_versions
    WHERE document_id = p_document_id;

    SELECT count(*)
    INTO v_node_count
    FROM jsonb_object_keys(coalesce(v_doc.document_json->'nodes', '{}'::jsonb));

    INSERT INTO document_versions (
        document_id,
        revision,
        version_number,
        name,
        description,
        snapshot_json,
        schema_version,
        is_named,
        node_count,
        thumbnail_url,
        created_by,
        created_at
    ) VALUES (
        v_doc.id,
        v_doc.revision,
        v_next_ver,
        p_name,
        p_description,
        v_doc.document_json,
        v_doc.schema_version,
        p_is_named,
        v_node_count,
        v_doc.thumbnail_url,
        p_actor_id,
        clock_timestamp()
    )
    RETURNING id INTO v_new_version_id;

    INSERT INTO activity_log (
        workspace_id,
        document_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata
    )
    SELECT
        workspace_id,
        p_document_id,
        p_actor_id,
        'version.created'::activity_action,
        'version',
        v_new_version_id,
        jsonb_build_object(
            'version_number', v_next_ver,
            'revision', v_doc.revision,
            'is_named', p_is_named,
            'name', p_name
        )
    FROM documents
    WHERE id = p_document_id;

    RETURN v_new_version_id;
END;
$$;

-- Rollback / Restore document to a prior version safely (forward-stepping)
CREATE OR REPLACE FUNCTION restore_document_version(
    p_document_id UUID,
    p_version_id UUID,
    p_actor_id UUID
)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
    v_ver RECORD;
    v_new_revision BIGINT;
BEGIN
    SELECT snapshot_json, schema_version, version_number
    INTO v_ver
    FROM document_versions
    WHERE id = p_version_id AND document_id = p_document_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Version snapshot % not found for document %', p_version_id, p_document_id;
    END IF;

    UPDATE documents
    SET document_json = v_ver.snapshot_json,
        schema_version = v_ver.schema_version,
        revision = revision + 1,
        last_modified_by = p_actor_id,
        updated_at = clock_timestamp()
    WHERE id = p_document_id AND deleted_at IS NULL
    RETURNING revision INTO v_new_revision;

    PERFORM create_document_snapshot(
        p_document_id,
        p_actor_id,
        format('Restored to Version %s', v_ver.version_number)::varchar(120),
        format('Restored from snapshot id %s', p_version_id),
        TRUE
    );

    INSERT INTO activity_log (
        workspace_id,
        document_id,
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata
    )
    SELECT
        workspace_id,
        p_document_id,
        p_actor_id,
        'version.restored'::activity_action,
        'document',
        p_document_id,
        jsonb_build_object(
            'restored_from_version_id', p_version_id,
            'restored_from_version_number', v_ver.version_number,
            'new_revision', v_new_revision
        )
    FROM documents
    WHERE id = p_document_id;

    RETURN v_new_revision;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. ACTIVE RECORD VIEWS (Safe hierarchical soft deletion filtering)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW view_active_documents AS
SELECT
    d.id,
    d.workspace_id,
    w.name AS workspace_name,
    w.slug AS workspace_slug,
    d.project_id,
    p.name AS project_name,
    d.title,
    d.document_json,
    d.schema_version,
    d.revision,
    d.thumbnail_url,
    d.is_archived,
    d.is_template,
    d.created_by,
    d.last_modified_by,
    d.created_at,
    d.updated_at
FROM documents d
INNER JOIN workspaces w ON d.workspace_id = w.id AND w.deleted_at IS NULL
LEFT JOIN projects p ON d.project_id = p.id AND p.deleted_at IS NULL
WHERE d.deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) & SECURITY DEFINER HELPERS
-- ----------------------------------------------------------------------------

-- Enable Row Level Security on all 11 tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Security Definer Helpers (Eliminates recursive RLS evaluation)
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = p_workspace_id AND profile_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.has_document_access(p_document_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM documents d
        LEFT JOIN document_members dm ON dm.document_id = d.id AND dm.profile_id = p_user_id
        LEFT JOIN workspace_members wm ON wm.workspace_id = d.workspace_id AND wm.profile_id = p_user_id
        WHERE d.id = p_document_id AND (d.created_by = p_user_id OR dm.id IS NOT NULL OR wm.id IS NOT NULL)
    );
$$;

CREATE OR REPLACE FUNCTION public.verify_share_link(p_token_hash TEXT)
RETURNS TABLE (document_id UUID, access_level share_access_level) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT document_id, access_level FROM share_links
    WHERE token = p_token_hash AND is_active = TRUE AND (expires_at IS NULL OR expires_at > clock_timestamp());
$$;

-- RLS Policies: Profiles
CREATE POLICY "Users can view all member profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies: Workspaces
CREATE POLICY "Members can view workspaces" ON workspaces FOR SELECT TO authenticated
    USING (public.is_workspace_member(id, auth.uid()) OR owner_id = auth.uid());
CREATE POLICY "Owners can update workspace" ON workspaces FOR UPDATE TO authenticated
    USING (owner_id = auth.uid());

-- RLS Policies: Workspace Members
CREATE POLICY "Members can view workspace members" ON workspace_members FOR SELECT TO authenticated
    USING (public.is_workspace_member(workspace_id, auth.uid()));

-- RLS Policies: Projects
CREATE POLICY "Members can view projects" ON projects FOR SELECT TO authenticated
    USING (public.is_workspace_member(workspace_id, auth.uid()));

-- RLS Policies: Documents
CREATE POLICY "Members can view documents" ON documents FOR SELECT TO authenticated
    USING (public.has_document_access(id, auth.uid()));
CREATE POLICY "Members can update documents" ON documents FOR UPDATE TO authenticated
    USING (public.has_document_access(id, auth.uid()));

-- RLS Policies: Document Members
CREATE POLICY "View document members" ON document_members FOR SELECT TO authenticated
    USING (public.has_document_access(document_id, auth.uid()));

-- RLS Policies: Share Links
CREATE POLICY "View active share links" ON share_links FOR SELECT TO public USING (true);
CREATE POLICY "Manage share links" ON share_links FOR ALL TO authenticated
    USING (public.has_document_access(document_id, auth.uid()));

-- RLS Policies: Document Versions
CREATE POLICY "View document versions" ON document_versions FOR SELECT TO authenticated
    USING (public.has_document_access(document_id, auth.uid()));

-- RLS Policies: Assets
CREATE POLICY "View assets" ON assets FOR SELECT TO authenticated
    USING (public.is_workspace_member(workspace_id, auth.uid()));

-- RLS Policies: Activity Log
CREATE POLICY "View activity log" ON activity_log FOR SELECT TO authenticated
    USING (public.is_workspace_member(workspace_id, auth.uid()));

-- RLS Policies: Devices
CREATE POLICY "Users manage own devices" ON devices FOR ALL TO authenticated
    USING (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 9. USER ONBOARDING TRIGGER
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_workspace_id UUID;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

    -- Create personal workspace
    INSERT INTO public.workspaces (name, slug, owner_id)
    VALUES (
        format('%s''s Workspace', coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))),
        format('ws-%s', substr(NEW.id::text, 1, 8)),
        NEW.id
    )
    RETURNING id INTO v_workspace_id;

    -- Add owner membership
    INSERT INTO public.workspace_members (workspace_id, profile_id, role)
    VALUES (v_workspace_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$;

-- Wire onboarding trigger to auth.users (if supabase auth schema exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

COMMIT;
