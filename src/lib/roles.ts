// Preset role options – listed in display/sort order
export const PRESET_ROLES: string[] = [
  'Manager',
  'Shift Manager',
  'Shift Leader',
  'Team Leader',
  'Staff',
];

// Role sort priority – lower number = higher in schedule
const ROLE_ORDER: Record<string, number> = {
  'Manager': 0,
  'Shift Manager': 1,
  'Shift Leader': 2,
  'Team Leader': 3,
  'Staff': 4,
};

/** Returns a sort-priority number: known roles by defined order, unknown roles just above Staff */
export function roleSortPriority(role: string): number {
  return ROLE_ORDER[role] ?? 3.5;
}

