// Hand-written Supabase Database type for the typed client. Rows reuse the
// interfaces in lib/types.ts. Keep in sync with migrations/0001 + 0002.
// (Regenerate with `supabase gen types typescript` once the CLI is linked.)

import type {
  Organization,
  Property,
  Profile,
  OrgRole,
  Membership,
  Invitation,
  Account,
  AccountBalance,
  PaymentMethod,
  AccountMovement,
  Invoice,
  AuditLogRow,
  Room,
  RoomPhoto,
  RoomInventory,
  FireExtinguisher,
  Guest,
  Revenue,
  Expense,
  Partner,
  FoundingContribution,
  PartnerWork,
  Meeting,
  Task,
  StaffHour,
  Complaint,
  CompanyDocument,
  WebCredential,
  BudgetRevenue,
  BudgetExpense,
  BudgetRent,
  BudgetRoomSetup,
  ExchangeRate,
} from '@/lib/types'

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] }
type Tbl<R, Rels extends Rel[] = []> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: Rels }

const fk = <T extends Rel>(r: T) => r
void fk

export type Database = {
  public: {
    Tables: {
      organizations: Tbl<Organization>
      properties: Tbl<Property, [{ foreignKeyName: 'properties_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] }]>
      profiles: Tbl<Profile>
      org_roles: Tbl<OrgRole, [{ foreignKeyName: 'org_roles_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] }]>
      memberships: Tbl<
        Membership,
        [
          { foreignKeyName: 'memberships_organization_id_fkey'; columns: ['organization_id']; isOneToOne: false; referencedRelation: 'organizations'; referencedColumns: ['id'] },
          { foreignKeyName: 'memberships_role_id_fkey'; columns: ['role_id']; isOneToOne: false; referencedRelation: 'org_roles'; referencedColumns: ['id'] },
          { foreignKeyName: 'memberships_profile_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ]
      >
      invitations: Tbl<Invitation, [{ foreignKeyName: 'invitations_role_id_fkey'; columns: ['role_id']; isOneToOne: false; referencedRelation: 'org_roles'; referencedColumns: ['id'] }]>
      accounts: Tbl<Account>
      payment_methods: Tbl<PaymentMethod, [{ foreignKeyName: 'payment_methods_account_id_fkey'; columns: ['account_id']; isOneToOne: false; referencedRelation: 'accounts'; referencedColumns: ['id'] }]>
      account_movements: Tbl<AccountMovement, [{ foreignKeyName: 'account_movements_account_id_fkey'; columns: ['account_id']; isOneToOne: false; referencedRelation: 'accounts'; referencedColumns: ['id'] }]>
      invoices: Tbl<Invoice, [{ foreignKeyName: 'invoices_guest_id_fkey'; columns: ['guest_id']; isOneToOne: false; referencedRelation: 'guests'; referencedColumns: ['id'] }]>
      audit_log: Tbl<AuditLogRow>
      rooms: Tbl<Room>
      room_photos: Tbl<RoomPhoto, [{ foreignKeyName: 'room_photos_room_id_fkey'; columns: ['room_id']; isOneToOne: false; referencedRelation: 'rooms'; referencedColumns: ['id'] }]>
      room_inventory: Tbl<RoomInventory, [{ foreignKeyName: 'room_inventory_room_id_fkey'; columns: ['room_id']; isOneToOne: false; referencedRelation: 'rooms'; referencedColumns: ['id'] }]>
      room_fire_extinguishers: Tbl<FireExtinguisher, [{ foreignKeyName: 'room_fire_extinguishers_room_id_fkey'; columns: ['room_id']; isOneToOne: false; referencedRelation: 'rooms'; referencedColumns: ['id'] }]>
      guests: Tbl<Guest, [{ foreignKeyName: 'guests_room_id_fkey'; columns: ['room_id']; isOneToOne: false; referencedRelation: 'rooms'; referencedColumns: ['id'] }]>
      revenue: Tbl<Revenue, [{ foreignKeyName: 'revenue_guest_id_fkey'; columns: ['guest_id']; isOneToOne: false; referencedRelation: 'guests'; referencedColumns: ['id'] }]>
      expenses: Tbl<Expense>
      shareholders: Tbl<Partner>
      founding_contributions: Tbl<FoundingContribution, [{ foreignKeyName: 'founding_contributions_shareholder_id_fkey'; columns: ['shareholder_id']; isOneToOne: false; referencedRelation: 'shareholders'; referencedColumns: ['id'] }]>
      shareholder_work: Tbl<PartnerWork, [{ foreignKeyName: 'shareholder_work_shareholder_id_fkey'; columns: ['shareholder_id']; isOneToOne: false; referencedRelation: 'shareholders'; referencedColumns: ['id'] }]>
      shareholder_meetings: Tbl<Meeting>
      todos: Tbl<Task, [{ foreignKeyName: 'todos_assignee_profile_fkey'; columns: ['assignee_user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]>
      staff_hours: Tbl<StaffHour>
      complaints: Tbl<Complaint, [{ foreignKeyName: 'complaints_room_id_fkey'; columns: ['room_id']; isOneToOne: false; referencedRelation: 'rooms'; referencedColumns: ['id'] }]>
      company_documents: Tbl<CompanyDocument>
      web_credentials: Tbl<WebCredential>
      budget_revenue: Tbl<BudgetRevenue>
      budget_expenses: Tbl<BudgetExpense>
      budget_rent: Tbl<BudgetRent>
      budget_room_setup: Tbl<BudgetRoomSetup>
      exchange_rates: Tbl<ExchangeRate>
    }
    Views: {
      account_balances_v: { Row: AccountBalance; Relationships: [] }
    }
    Functions: {
      app_create_organization: {
        Args: { p_name: string; p_property_name?: string | null; p_timezone?: string; p_currency?: string; p_settings?: Json }
        Returns: string
      }
      app_accept_invitation: { Args: { p_token: string }; Returns: string }
      app_invitation_preview: {
        Args: { p_token: string }
        Returns: { organization_name: string; role_name: string; email: string; expires_at: string; status: string }[]
      }
      app_next_invoice_seq: { Args: { p_org: string; p_year: number }; Returns: number }
      app_reset_organization_data: { Args: { p_org: string; p_tables: string[] }; Returns: undefined }
      app_has_perm: { Args: { p_org: string; p_module: string; p_action: string }; Returns: boolean }
      app_role_template: { Args: { p_role: string }; Returns: Json }
      app_is_member: { Args: { p_org: string }; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
