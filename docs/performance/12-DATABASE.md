# ZENITHSUI — SUPABASE & DATABASE PERFORMANCE ARCHITECTURE
## 12-DATABASE.md

> **Target Standard:** Sub-10ms Indexed Queries, RLS Index Coverage, Zero Table Scans  
> **Database:** PostgreSQL 15 / Supabase, Supavisor Connection Pooler  
> **Status:** Hardened & Verified

---

## 1. Relational Schema & Index Coverage

Zenithsui's PostgreSQL schema is fully indexed across all tenant and lookup dimensions to ensure constant-time queries:

```sql
-- Core document lookups & sorting
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

-- Public sharing & access tokens
CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Academic modules
CREATE INDEX IF NOT EXISTS idx_academic_planner_user_date ON academic_planner(user_id, date);
CREATE INDEX IF NOT EXISTS idx_academic_cards_deck_due ON academic_cards(deck_id, next_review_at);
```

---

## 2. Row Level Security (RLS) Optimization

Every table enforces Row Level Security (`ENABLE ROW LEVEL SECURITY`) with policies structured to avoid recursive joins or table scans:
- User tenancy checks resolve through indexed expressions: `auth.uid() = user_id`.
- Public shares evaluate via indexed token hashes with expiry verification: `token = $1 AND expires_at > now()`.

---

## 3. Connection Pooling & Query Hygiene

- Requests from Vercel Serverless Functions connect via Supabase's transaction pooler (Supavisor port 6543) using prepared statements.
- Document graphs are persisted as single compressed JSON documents (`content` jsonb) rather than individual rows per node, eliminating $N+1$ query overhead on multi-thousand element boards.
