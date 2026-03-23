import type { RoleType } from '@/hooks/use-role-types';

// Fallback preset roles when no DB roles exist yet
export const DEFAULT_ROLES: string[] = [
  'Manager',
  'Shift Manager',
  'Shift Leader',
  'Team Leader',
  'Staff',
];

/** Build a sort-priority function from DB role types. Unknown roles sort last-1, 'Staff' last. */
export function buildRoleSortPriority(dbRoles: RoleType[]): (role: string) => number {
  if (dbRoles.length === 0) {
    // Fallback to defaults
    const map: Record<string, number> = {};
    DEFAULT_ROLES.forEach((r, i) => { map[r] = i; });
    return (role: string) => map[role] ?? DEFAULT_ROLES.length;
  }
  const map: Record<string, number> = {};
  dbRoles.forEach((r, i) => { map[r.name] = i; });
  return (role: string) => map[role] ?? dbRoles.length;
}

/** Get role names list from DB roles or fallback */
export function getRoleNames(dbRoles: RoleType[]): string[] {
  if (dbRoles.length === 0) return DEFAULT_ROLES;
  return dbRoles.map((r) => r.name);
}
