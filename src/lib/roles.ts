// Preset role options – management-level roles listed first
export const PRESET_ROLES: string[] = [
  'Manager',
  'Shift Manager',
  'Supervisor',
  'Team Leader',
  'Shift Leader',
  'Staff',
];

// Roles considered "management" for sorting purposes (appear at the top of schedules)
export const MANAGEMENT_ROLES = new Set([
  'Manager',
  'Shift Manager',
  'Supervisor',
  'Team Leader',
  'Shift Leader',
]);

/** Returns a sort-priority number: management roles → 0, others → 1 */
export function roleSortPriority(role: string): number {
  return MANAGEMENT_ROLES.has(role) ? 0 : 1;
}
