// Shared shift color definitions
// Each color has Tailwind classes for bg, border, text, and dot

export interface ShiftColorDef {
  key: string;
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}

export const SHIFT_COLOR_OPTIONS: ShiftColorDef[] = [
  { key: 'purple', label: 'Purple', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  { key: 'green', label: 'Green', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { key: 'blue', label: 'Blue', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  { key: 'amber', label: 'Amber', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  { key: 'rose', label: 'Rose', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  { key: 'cyan', label: 'Cyan', bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
  { key: 'orange', label: 'Orange', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  { key: 'slate', label: 'Slate', bg: 'bg-slate-50 dark:bg-slate-950/40', border: 'border-slate-200 dark:border-slate-800', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' },
];

const COLOR_MAP = Object.fromEntries(SHIFT_COLOR_OPTIONS.map((c) => [c.key, c]));

// Default colors per period when no custom color is set
const PERIOD_DEFAULTS: Record<string, string> = {
  morning: 'purple',
  afternoon: 'green',
  evening: 'blue',
  allday: 'slate',
};

function getStartHour(startTime: string | null): number {
  if (!startTime) return -1;
  const d = new Date(startTime);
  return d.getHours() + d.getMinutes() / 60;
}

function getPeriod(isAllDay: boolean, startTime: string | null): string {
  if (isAllDay || !startTime) return 'allday';
  const h = getStartHour(startTime);
  if (h >= 6 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

export function getShiftColor(shift: { color?: string | null; is_all_day?: boolean; start_time?: string | null }): ShiftColorDef {
  // Use custom color if set
  if (shift.color && COLOR_MAP[shift.color]) {
    return COLOR_MAP[shift.color];
  }
  // Default by period
  const period = getPeriod(shift.is_all_day ?? false, shift.start_time ?? null);
  return COLOR_MAP[PERIOD_DEFAULTS[period]] ?? SHIFT_COLOR_OPTIONS[0];
}
