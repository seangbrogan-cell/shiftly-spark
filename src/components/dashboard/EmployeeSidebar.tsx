import type { Employee } from '@/hooks/use-dashboard-data';
import { Users, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EmployeeSidebarProps {
  employees: Employee[];
  shiftCounts: Record<string, number>;
}

export function EmployeeSidebar({ employees, shiftCounts }: EmployeeSidebarProps) {
  return (
    <aside className="hidden lg:block w-72 shrink-0 border-r border-border bg-card overflow-y-auto">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Team ({employees.length})</h2>
        </div>
      </div>
      <div className="p-3">
        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3">No employees yet.</p>
        ) : (
          <ul className="space-y-1">
            {employees.map((emp) => (
              <li key={emp.id} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light">
                  <UserCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.role}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {shiftCounts[emp.id] || 0}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
