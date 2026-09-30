-- ============================================================================
-- ZENITHSUI COLLABORATIVE DOCUMENT ENGINE - SHARING & NOTIFICATIONS SCHEMA
-- ============================================================================
-- Migration: 20260929000002_zenithsui_sharing_schema.sql
-- Architecture: Multi-tenant, granular document sharing, public links,
--               in-app notifications, and anti-recursive RLS policies.
-- Compatible with PostgreSQL 14, 15, 16, 17+
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS & PREREQUISITES
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. TABLE ALTERATIONS & COLUMN EXPANSIONS
-- ----------------------------------------------------------------------------

-- A. Alter `documents` table: Add public sharing metadata
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS public_slug VARCHAR(120) NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS public_role VARCHAR(32) NOT NULL DEFAULT 'viewer';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_documents_public_role'
    ) THEN
        ALTER TABLE documents ADD CONSTRAINT chk_documents_public_role CHECK (public_role IN ('viewer', 'editor'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_documents_public_slug'
    ) THEN
        ALTER TABLE documents ADD CONSTRAINT uq_documents_public_slug UNIQUE (public_slug);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- B. Alter `share_links` table: Add token_hash, name, permissions, export flags
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS token_hash VARCHAR(64);
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS name VARCHAR(100) NULL;
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS allow_export BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS allow_duplicate BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE share_links ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ NULL;

-- Populate token_hash from token if existing rows have null token_hash
UPDATE share_links
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

UPDATE share_links
SET token_hash = encode(gen_random_bytes(32), 'hex')
WHERE token_hash IS NULL;

ALTER TABLE share_links ALTER COLUMN token_hash SET NOT NULL;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_share_links_token_hash'
    ) THEN
        ALTER TABLE share_links ADD CONSTRAINT uq_share_links_token_hash UNIQUE (token_hash);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Align share_links.access_level to VARCHAR(32) with ('view', 'edit') rule
ALTER TABLE share_links ALTER COLUMN access_level DROP DEFAULT;
ALTER TABLE share_links ALTER COLUMN access_level TYPE VARCHAR(32) USING access_level::text;
UPDATE share_links SET access_level = 'view' WHERE access_level NOT IN ('view', 'edit');
ALTER TABLE share_links ALTER COLUMN access_level SET DEFAULT 'view';

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_share_links_access_level'
    ) THEN
        ALTER TABLE share_links ADD CONSTRAINT chk_share_links_access_level CHECK (access_level IN ('view', 'edit'));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- C. Modernize `document_members`: Support user_id sync, remove commenter roles
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_members' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE document_members ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
        UPDATE document_members SET user_id = profile_id WHERE user_id IS NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'document_members' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE document_members ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Normalize role column on document_members to VARCHAR(32) ('owner', 'editor', 'viewer')
ALTER TABLE document_members ALTER COLUMN role DROP DEFAULT;
ALTER TABLE document_members ALTER COLUMN role TYPE VARCHAR(32) USING role::text;
UPDATE document_members SET role = 'owner' WHERE role = 'manager';
UPDATE document_members SET role = 'viewer' WHERE role = 'commenter';
ALTER TABLE document_members ALTER COLUMN role SET DEFAULT 'editor';

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_document_members_role'
    ) THEN
        ALTER TABLE document_members ADD CONSTRAINT chk_document_members_role CHECK (role IN ('owner', 'editor', 'viewer'));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Synchronize user_id and profile_id bi-directionally
CREATE OR REPLACE FUNCTION sync_document_members_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.user_id IS NULL AND NEW.profile_id IS NOT NULL THEN
        NEW.user_id := NEW.profile_id;
    ELSIF NEW.profile_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.profile_id := NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_document_members_user_profile ON document_members;
CREATE TRIGGER trg_sync_document_members_user_profile
BEFORE INSERT OR UPDATE ON document_members
FOR EACH ROW EXECUTE FUNCTION sync_document_members_user_profile();

-- D. Modernize `workspace_members`: Support user_id alias
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'workspace_members' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE workspace_members ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
        UPDATE workspace_members SET user_id = profile_id WHERE user_id IS NULL;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION sync_workspace_members_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.user_id IS NULL AND NEW.profile_id IS NOT NULL THEN
        NEW.user_id := NEW.profile_id;
    ELSIF NEW.profile_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.profile_id := NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_workspace_members_user_profile ON workspace_members;
CREATE TRIGGER trg_sync_workspace_members_user_profile
BEFORE INSERT OR UPDATE ON workspace_members
FOR EACH ROW EXECUTE FUNCTION sync_workspace_members_user_profile();

-- ----------------------------------------------------------------------------
-- 3. NEW TABLES
-- ----------------------------------------------------------------------------

-- 1. DOCUMENT INVITATIONS
-- Direct invitations issued to collaborator email addresses
CREATE TABLE IF NOT EXISTS document_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('editor', 'viewer')),
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL
);

-- 2. NOTIFICATIONS
-- In-app collaborative and security activity alerts
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_id UUID NULL REFERENCES documents(id) ON DELETE CASCADE,
    actor_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('invite_received', 'access_changed', 'access_removed', 'invite_accepted', 'link_expiring')),
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- 3. NOTIFICATION PREFERENCES
-- Per-user channels & event dispatch settings
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    email_invite_received BOOLEAN NOT NULL DEFAULT TRUE,
    email_access_changed BOOLEAN NOT NULL DEFAULT TRUE,
    email_access_removed BOOLEAN NOT NULL DEFAULT TRUE,
    email_invite_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    email_link_expiring BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_invite_received BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_access_changed BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_access_removed BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_invite_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_link_expiring BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

-- ----------------------------------------------------------------------------
-- 4. INDEXES
-- ----------------------------------------------------------------------------

-- Indexes on document_invitations
CREATE INDEX IF NOT EXISTS idx_document_invitations_doc_id ON document_invitations(document_id);
CREATE INDEX IF NOT EXISTS idx_document_invitations_email ON document_invitations(lower(email));
CREATE INDEX IF NOT EXISTS idx_document_invitations_token_hash ON document_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_document_invitations_invited_by ON document_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_document_invitations_pending ON document_invitations(document_id, email)
    WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- Indexes on notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_all ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_doc_id ON notifications(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON notifications(actor_id) WHERE actor_id IS NOT NULL;

-- Indexes on share_links & documents
CREATE INDEX IF NOT EXISTS idx_share_links_token_hash ON share_links(token_hash);
CREATE INDEX IF NOT EXISTS idx_share_links_active_valid ON share_links(document_id)
    WHERE is_active = TRUE AND deleted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_public_slug ON documents(public_slug)
    WHERE public_slug IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_public_active ON documents(is_public)
    WHERE is_public = TRUE AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 5. TRIGGERS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE TRIGGER trg_notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-provision default notification preferences for newly registered profiles
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_default_notification_preferences ON profiles;
CREATE TRIGGER trg_profiles_default_notification_preferences
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Seed existing profiles with notification preferences
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. FUNCTIONS & STORED PROCEDURES (SECURITY DEFINER, search_path = public)
-- ----------------------------------------------------------------------------

-- Helper: Retrieve authenticated user email without RLS recursion
CREATE OR REPLACE FUNCTION get_auth_user_email()
RETURNS VARCHAR LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT email FROM profiles WHERE id = auth.uid();
$$;

-- Function 1: get_document_effective_role
-- Evaluates precedence:
-- (1) Document creator or Workspace Owner -> 'owner'
-- (2) Direct document_members record -> role ('owner', 'editor', 'viewer')
-- (3) Workspace admin/editor/member -> 'editor' or 'viewer'
-- (4) Share link matching p_token_hash (valid, not expired, not revoked, use_count < max_uses) -> 'editor' or 'viewer'
-- (5) Public document (is_public = TRUE) -> public_role
-- (6) Else NULL
CREATE OR REPLACE FUNCTION get_document_effective_role(
    p_document_id UUID,
    p_user_id UUID,
    p_token_hash VARCHAR DEFAULT NULL
)
RETURNS VARCHAR LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_doc RECORD;
    v_doc_role VARCHAR;
    v_ws_role VARCHAR;
    v_share_link RECORD;
BEGIN
    IF p_document_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Lookup document and parent workspace owner
    SELECT d.id, d.workspace_id, d.created_by, d.is_public, d.public_role, w.owner_id
    INTO v_doc
    FROM documents d
    JOIN workspaces w ON w.id = d.workspace_id AND w.deleted_at IS NULL
    WHERE d.id = p_document_id AND d.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- (1) Document creator or Workspace Owner -> 'owner'
    IF p_user_id IS NOT NULL THEN
        IF v_doc.created_by = p_user_id OR v_doc.owner_id = p_user_id THEN
            RETURN 'owner';
        END IF;
    END IF;

    -- (2) Direct document_members record -> role ('owner', 'editor', 'viewer')
    IF p_user_id IS NOT NULL THEN
        SELECT role::text INTO v_doc_role
        FROM document_members
        WHERE document_id = p_document_id
          AND (profile_id = p_user_id OR user_id = p_user_id)
        LIMIT 1;

        IF FOUND AND v_doc_role IS NOT NULL THEN
            IF v_doc_role = 'manager' THEN
                RETURN 'owner';
            ELSIF v_doc_role IN ('owner', 'editor', 'viewer') THEN
                RETURN v_doc_role;
            END IF;
        END IF;
    END IF;

    -- (3) Workspace admin/editor/member -> 'editor' or 'viewer'
    IF p_user_id IS NOT NULL THEN
        SELECT role::text INTO v_ws_role
        FROM workspace_members
        WHERE workspace_id = v_doc.workspace_id
          AND (profile_id = p_user_id OR user_id = p_user_id)
        LIMIT 1;

        IF FOUND AND v_ws_role IS NOT NULL THEN
            IF v_ws_role IN ('owner', 'admin', 'editor', 'member') THEN
                RETURN 'editor';
            ELSIF v_ws_role = 'viewer' THEN
                RETURN 'viewer';
            END IF;
        END IF;
    END IF;

    -- (4) Share link matching p_token_hash (valid, not expired, not revoked, use_count < max_uses) -> 'editor' or 'viewer'
    IF p_token_hash IS NOT NULL AND trim(p_token_hash) <> '' THEN
        SELECT access_level, expires_at, max_uses, use_count, is_active, revoked_at
        INTO v_share_link
        FROM share_links
        WHERE document_id = p_document_id
          AND (token_hash = p_token_hash OR token = p_token_hash)
          AND deleted_at IS NULL
          AND is_active = TRUE
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > clock_timestamp())
          AND (max_uses IS NULL OR use_count < max_uses)
        LIMIT 1;

        IF FOUND THEN
            IF v_share_link.access_level = 'edit' THEN
                RETURN 'editor';
            ELSE
                RETURN 'viewer';
            END IF;
        END IF;
    END IF;

    -- (5) Public document (is_public = TRUE) -> public_role
    IF v_doc.is_public = TRUE THEN
        IF v_doc.public_role IN ('viewer', 'editor') THEN
            RETURN v_doc.public_role;
        ELSE
            RETURN 'viewer';
        END IF;
    END IF;

    -- (6) Else NULL
    RETURN NULL;
END;
$$;

-- Function 2: has_document_permission
-- Maps:
-- 'view' -> role IN ('viewer', 'editor', 'owner')
-- 'edit' -> role IN ('editor', 'owner')
-- 'manage' -> role = 'owner'
CREATE OR REPLACE FUNCTION has_document_permission(
    p_document_id UUID,
    p_user_id UUID,
    p_required_permission VARCHAR,
    p_token_hash VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    v_role := get_document_effective_role(p_document_id, p_user_id, p_token_hash);

    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;

    IF p_required_permission = 'view' THEN
        RETURN v_role IN ('viewer', 'editor', 'owner');
    ELSIF p_required_permission = 'edit' THEN
        RETURN v_role IN ('editor', 'owner');
    ELSIF p_required_permission = 'manage' THEN
        RETURN v_role = 'owner';
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- Function 3: accept_document_invitation
-- Atomic transaction: checks expiration/revocation, inserts or updates document_members,
-- marks accepted_at = clock_timestamp(), returns JSON with document_id and role.
CREATE OR REPLACE FUNCTION accept_document_invitation(
    p_token_hash VARCHAR,
    p_user_id UUID
)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_invitation RECORD;
    v_profile RECORD;
    v_result JSONB;
BEGIN
    IF p_token_hash IS NULL OR trim(p_token_hash) = '' THEN
        RAISE EXCEPTION 'Invitation token hash is required' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID is required' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    SELECT id, email INTO v_profile FROM profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found: %', p_user_id USING ERRCODE = 'data_exception';
    END IF;

    -- Lock invitation row for atomic resolution
    SELECT id, document_id, email, role, invited_by, expires_at, accepted_at, revoked_at
    INTO v_invitation
    FROM document_invitations
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found or invalid' USING ERRCODE = 'data_exception';
    END IF;

    IF v_invitation.revoked_at IS NOT NULL THEN
        RAISE EXCEPTION 'Invitation has been revoked' USING ERRCODE = 'check_violation';
    END IF;

    IF v_invitation.accepted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Invitation has already been accepted' USING ERRCODE = 'check_violation';
    END IF;

    IF v_invitation.expires_at <= clock_timestamp() THEN
        RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = 'check_violation';
    END IF;

    -- Upsert membership in document_members
    INSERT INTO document_members (
        document_id,
        profile_id,
        user_id,
        role,
        invited_by,
        created_at,
        updated_at
    ) VALUES (
        v_invitation.document_id,
        p_user_id,
        p_user_id,
        v_invitation.role,
        v_invitation.invited_by,
        clock_timestamp(),
        clock_timestamp()
    )
    ON CONFLICT (document_id, profile_id) DO UPDATE SET
        role = EXCLUDED.role,
        user_id = EXCLUDED.user_id,
        invited_by = EXCLUDED.invited_by,
        updated_at = clock_timestamp();

    -- Mark invitation as accepted
    UPDATE document_invitations
    SET accepted_at = clock_timestamp()
    WHERE id = v_invitation.id;

    -- Notify the inviter that invitation has been accepted
    PERFORM dispatch_sharing_notification(
        v_invitation.invited_by,
        v_invitation.document_id,
        p_user_id,
        'invite_accepted',
        jsonb_build_object(
            'role', v_invitation.role,
            'user_email', v_profile.email,
            'accepted_at', clock_timestamp()
        )
    );

    -- Record activity log entry
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
        d.workspace_id,
        v_invitation.document_id,
        p_user_id,
        'member.joined'::activity_action,
        'document_member',
        p_user_id,
        jsonb_build_object(
            'role', v_invitation.role,
            'invited_by', v_invitation.invited_by,
            'invitation_id', v_invitation.id
        )
    FROM documents d
    WHERE d.id = v_invitation.document_id;

    v_result := jsonb_build_object(
        'document_id', v_invitation.document_id,
        'role', v_invitation.role,
        'accepted_at', clock_timestamp()
    );

    RETURN v_result;
END;
$$;

-- Function 4: rotate_document_share_link
-- Updates existing share link with new token_hash, resets use_count, and logs audit
CREATE OR REPLACE FUNCTION rotate_document_share_link(
    p_link_id UUID,
    p_actor_id UUID,
    p_new_token_hash VARCHAR
)
RETURNS UUID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_link RECORD;
BEGIN
    IF p_link_id IS NULL THEN
        RAISE EXCEPTION 'Share link ID is required' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF p_new_token_hash IS NULL OR trim(p_new_token_hash) = '' THEN
        RAISE EXCEPTION 'New token hash is required' USING ERRCODE = 'invalid_parameter_value';
    END IF;

    SELECT id, document_id, is_active, revoked_at
    INTO v_link
    FROM share_links
    WHERE id = p_link_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Share link not found: %', p_link_id USING ERRCODE = 'data_exception';
    END IF;

    -- Validate actor has edit/manage permissions on document
    IF NOT has_document_permission(v_link.document_id, p_actor_id, 'edit') THEN
        RAISE EXCEPTION 'Insufficient permissions to rotate share link' USING ERRCODE = 'insufficient_privilege';
    END IF;

    UPDATE share_links
    SET token_hash = p_new_token_hash,
        token = p_new_token_hash,
        use_count = 0,
        revoked_at = NULL,
        is_active = TRUE,
        updated_at = clock_timestamp()
    WHERE id = p_link_id;

    -- Record activity log entry
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
        d.workspace_id,
        v_link.document_id,
        p_actor_id,
        'share.updated'::activity_action,
        'share_link',
        p_link_id,
        jsonb_build_object(
            'action', 'rotated',
            'rotated_at', clock_timestamp()
        )
    FROM documents d
    WHERE d.id = v_link.document_id;

    RETURN p_link_id;
END;
$$;

-- Function 5: dispatch_sharing_notification
-- Respects in-app notification preferences and writes to notifications table
CREATE OR REPLACE FUNCTION dispatch_sharing_notification(
    p_user_id UUID,
    p_document_id UUID,
    p_actor_id UUID,
    p_type VARCHAR,
    p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_pref RECORD;
    v_in_app_enabled BOOLEAN := TRUE;
    v_notif_id UUID;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Avoid notifying oneself
    IF p_actor_id IS NOT NULL AND p_user_id = p_actor_id THEN
        RETURN NULL;
    END IF;

    -- Validate notification type
    IF p_type NOT IN ('invite_received', 'access_changed', 'access_removed', 'invite_accepted', 'link_expiring') THEN
        RAISE EXCEPTION 'Invalid notification type: %', p_type USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Check notification preferences if present
    SELECT * INTO v_pref FROM notification_preferences WHERE user_id = p_user_id;
    IF FOUND THEN
        IF p_type = 'invite_received' THEN
            v_in_app_enabled := v_pref.in_app_invite_received;
        ELSIF p_type = 'access_changed' THEN
            v_in_app_enabled := v_pref.in_app_access_changed;
        ELSIF p_type = 'access_removed' THEN
            v_in_app_enabled := v_pref.in_app_access_removed;
        ELSIF p_type = 'invite_accepted' THEN
            v_in_app_enabled := v_pref.in_app_invite_accepted;
        ELSIF p_type = 'link_expiring' THEN
            v_in_app_enabled := v_pref.in_app_link_expiring;
        END IF;
    END IF;

    IF NOT v_in_app_enabled THEN
        RETURN NULL;
    END IF;

    INSERT INTO notifications (
        user_id,
        document_id,
        actor_id,
        type,
        data,
        is_read,
        created_at
    ) VALUES (
        p_user_id,
        p_document_id,
        p_actor_id,
        p_type,
        coalesce(p_data, '{}'::jsonb),
        FALSE,
        clock_timestamp()
    )
    RETURNING id INTO v_notif_id;

    RETURN v_notif_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

-- A. Table: document_invitations
ALTER TABLE document_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_invitations_select" ON document_invitations;
CREATE POLICY "document_invitations_select"
ON document_invitations
FOR SELECT
TO authenticated
USING (
    invited_by = auth.uid()
    OR has_document_permission(document_id, auth.uid(), 'edit')
    OR lower(email) = lower(coalesce(get_auth_user_email(), auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS "document_invitations_insert" ON document_invitations;
CREATE POLICY "document_invitations_insert"
ON document_invitations
FOR INSERT
TO authenticated
WITH CHECK (
    invited_by = auth.uid()
    AND has_document_permission(document_id, auth.uid(), 'edit')
);

DROP POLICY IF EXISTS "document_invitations_update" ON document_invitations;
CREATE POLICY "document_invitations_update"
ON document_invitations
FOR UPDATE
TO authenticated
USING (
    has_document_permission(document_id, auth.uid(), 'edit')
)
WITH CHECK (
    has_document_permission(document_id, auth.uid(), 'edit')
);

DROP POLICY IF EXISTS "document_invitations_delete" ON document_invitations;
CREATE POLICY "document_invitations_delete"
ON document_invitations
FOR DELETE
TO authenticated
USING (
    has_document_permission(document_id, auth.uid(), 'edit')
);

-- B. Table: notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select"
ON notifications
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
    actor_id = auth.uid() OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update"
ON notifications
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete"
ON notifications
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
);

-- C. Table: notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_preferences_select" ON notification_preferences;
CREATE POLICY "notification_preferences_select"
ON notification_preferences
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "notification_preferences_insert" ON notification_preferences;
CREATE POLICY "notification_preferences_insert"
ON notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "notification_preferences_update" ON notification_preferences;
CREATE POLICY "notification_preferences_update"
ON notification_preferences
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);

DROP POLICY IF EXISTS "notification_preferences_delete" ON notification_preferences;
CREATE POLICY "notification_preferences_delete"
ON notification_preferences
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
);

-- ----------------------------------------------------------------------------
-- 8. ACTIVE RECORD VIEW UPDATE
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS view_active_documents CASCADE;
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
    d.is_public,
    d.public_slug,
    d.public_role,
    d.published_at,
    d.created_by,
    d.last_modified_by,
    d.created_at,
    d.updated_at
FROM documents d
INNER JOIN workspaces w ON d.workspace_id = w.id AND w.deleted_at IS NULL
LEFT JOIN projects p ON d.project_id = p.id AND p.deleted_at IS NULL
WHERE d.deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 9. PERMISSIONS GRANTS
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION get_document_effective_role(UUID, UUID, VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_document_permission(UUID, UUID, VARCHAR, VARCHAR) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION accept_document_invitation(VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION rotate_document_share_link(UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION dispatch_sharing_notification(UUID, UUID, UUID, VARCHAR, JSONB) TO authenticated, service_role;

COMMIT;
