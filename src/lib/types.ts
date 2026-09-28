export type Role = "owner" | "manager" | "staff";
export type MemberStatus = "active" | "left";

export type Business = {
  id: string;
  name: string;
  brand_color: string;
  logo_url: string | null;
  contact_email: string | null;
  slug: string;
  tagline: string | null;
  about: string | null;
  phone: string | null;
  address: string | null;
  website_published: boolean;
  custom_domain: string | null;
  leave_year_start_month: number;
  created_at: string;
};

export type Member = {
  id: string;
  business_id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  role: Role;
  status: MemberStatus;
  created_at: string;
};

export type EmploymentType = "full_time" | "part_time" | "zero_hours" | "casual" | "contractor";

export type StaffProfile = {
  member_id: string;
  business_id: string;
  job_title: string | null;
  employment_type: EmploymentType | null;
  start_date: string | null;
  phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  holiday_allowance_days: number | null;
  updated_at: string;
};

export type Policy = {
  id: string;
  business_id: string;
  title: string;
  body: string;
  version: number;
  category: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type PolicySignature = {
  id: string;
  business_id: string;
  policy_id: string;
  policy_version: number;
  member_id: string;
  signed_name: string;
  signed_at: string;
};
