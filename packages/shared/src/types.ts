import type { Role, UserStatus } from './enums';

/** The user shape the API exposes — never includes hashes/tokens. */
export interface PublicUser {
  id: string;
  phone: string;
  name: string | null;
  roles: Role[];
  status: UserStatus;
  language: string;
  /**
   * Effective fine-grained permission keys for staff (`['*']` = super admin).
   * Empty for customers/couriers, who are gated by `roles` alone. Populated on
   * login and `/me`; drives dashboard UI gating (server still re-checks).
   */
  perms: string[];
}
