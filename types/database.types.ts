export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// ─── Role type (VIEWER added) ──────────────────────────────────────────────
export type Role = 'ADMIN' | 'RESEARCHER' | 'ANNOTATOR' | 'VIEWER'

// ─── Permission keys (match seed data in migration) ───────────────────────
export type Permission =
    | 'Manage Models'
    | 'Training Access'
    | 'Dataset Labeling'
    | 'API Keys'
    | 'User Mgmt'
    | 'Deployment'

// ─── Invitation status (derived, not stored) ──────────────────────────────
export type InvitationStatus = 'pending' | 'accepted' | 'expired'

export interface Database {
    public: {
        Tables: {
            // ── EXISTING: allowed_users ────────────────────────────────────
            allowed_users: {
                Row: {
                    email: string
                    role: Role
                    created_at: string
                }
                Insert: {
                    email: string
                    role?: Role
                    created_at?: string
                }
                Update: {
                    email?: string
                    role?: Role
                    created_at?: string
                }
            }

            // ── EXISTING: profiles (extended with email, is_active, etc.) ──
            profiles: {
                Row: {
                    id: string
                    email: string | null
                    full_name: string | null
                    avatar_url: string | null
                    role: Role
                    is_active: boolean
                    last_seen_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: Role
                    is_active?: boolean
                    last_seen_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: Role
                    is_active?: boolean
                    last_seen_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }

            // ── EXISTING: user_ips ─────────────────────────────────────────
            user_ips: {
                Row: {
                    id: string
                    user_id: string
                    ip_address: string
                    last_seen: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    ip_address: string
                    last_seen?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    ip_address?: string
                    last_seen?: string
                }
            }

            // ── NEW: invitations ───────────────────────────────────────────
            invitations: {
                Row: {
                    id: string
                    email: string
                    role: Role
                    token: string
                    invited_by: string | null
                    accepted_at: string | null
                    expires_at: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    email: string
                    role?: Role
                    token?: string
                    invited_by?: string | null
                    accepted_at?: string | null
                    expires_at?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    role?: Role
                    token?: string
                    invited_by?: string | null
                    accepted_at?: string | null
                    expires_at?: string
                    created_at?: string
                }
            }

            // ── NEW: role_permissions ──────────────────────────────────────
            role_permissions: {
                Row: {
                    id: string
                    role: Role
                    permission: string
                    enabled: boolean
                    updated_at: string
                    updated_by: string | null
                }
                Insert: {
                    id?: string
                    role: Role
                    permission: string
                    enabled?: boolean
                    updated_at?: string
                    updated_by?: string | null
                }
                Update: {
                    id?: string
                    role?: Role
                    permission?: string
                    enabled?: boolean
                    updated_at?: string
                    updated_by?: string | null
                }
            }

            // ── NEW: audit_logs ────────────────────────────────────────────
            audit_logs: {
                Row: {
                    id: string
                    user_id: string | null
                    user_email: string | null
                    action: string
                    resource: string | null
                    details: Json | null
                    ip_address: string | null
                    timestamp: string          // kept as "timestamp" to match existing queries
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    user_email?: string | null
                    action: string
                    resource?: string | null
                    details?: Json | null
                    ip_address?: string | null
                    timestamp?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    user_email?: string | null
                    action?: string
                    resource?: string | null
                    details?: Json | null
                    ip_address?: string | null
                    timestamp?: string
                }
            }
        }

        Functions: {
            log_audit_event: {
                Args: {
                    p_action: string
                    p_resource?: string
                    p_details?: Json
                    p_ip?: string
                }
                Returns: void
            }
            accept_invitation_secure: {
                Args: {
                    token_str: string
                }
                Returns: Json
            }
        }
    }
}

// ─── Convenience row types (use these in components) ──────────────────────
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type InvitationRow = Database['public']['Tables']['invitations']['Row']
export type RolePermRow = Database['public']['Tables']['role_permissions']['Row']
export type AuditLogRow = Database['public']['Tables']['audit_logs']['Row']
export type AllowedUserRow = Database['public']['Tables']['allowed_users']['Row']

// ─── Extended types (with computed/joined fields) ─────────────────────────
export interface InvitationWithStatus extends InvitationRow {
    status: InvitationStatus
}

export type RolePermMatrix = Record<Role, Record<string, boolean>>

// ─── UI constants ──────────────────────────────────────────────────────────
export const ROLES: Role[] = ['ADMIN', 'RESEARCHER', 'ANNOTATOR', 'VIEWER']

export const ROLE_LABELS: Record<Role, string> = {
    ADMIN: 'Admin',
    RESEARCHER: 'Researcher',
    ANNOTATOR: 'Annotator',
    VIEWER: 'Viewer',
}

export const PERMISSIONS: Permission[] = [
    'Manage Models',
    'Training Access',
    'Dataset Labeling',
    'API Keys',
    'User Mgmt',
    'Deployment',
]

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
    'Manage Models': 'Create, edit and delete model configurations',
    'Training Access': 'Launch and monitor training jobs',
    'Dataset Labeling': 'Annotate and label dataset entries',
    'API Keys': 'Generate and revoke API credentials',
    'User Mgmt': 'Invite, remove and manage team members',
    'Deployment': 'Deploy models to production endpoints',
}
export enum View {
    DASHBOARD = 'dashboard',
    DATASETS = 'datasets',
    TRAINING = 'training',
    DEPLOYMENTS = 'deployments',
    TEAM = 'team',
    SETTINGS = 'settings',
}
