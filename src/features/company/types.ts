export type CompanyRole = "admin" | "collaborateur";

export interface CompanyMembershipRow {
  companyId: string;
  companyName: string;
  role: CompanyRole;
}
