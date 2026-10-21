export type SearchGuestMode =
  | 'phone'
  | 'phone_suffix'
  | 'cccd'
  | 'passport'
  | 'doc_suffix'
  | 'email'
  | 'name';

export interface SearchGuestResult {
  id: string;
  full_name: string;
  gender: 'male' | 'female' | 'other';
  birth_year: number | null;
  nationality: string | null;
  phone: string | null;
  doc_masked: string | null;
  email: string | null;
  tags: string[] | null;
  total_stays: number;
  total_nights: number;
  last_stay_at: string | null;
  last_branch_name: string | null;
  has_blacklist: boolean;
  has_attention: boolean;
  tier: string | null;
  ord: number;
}
