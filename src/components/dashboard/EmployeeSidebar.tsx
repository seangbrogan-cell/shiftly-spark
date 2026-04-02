import { useState } from 'react';
import type { Employee } from '@/hooks/use-dashboard-data';
import { Users, UserCircle, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmployeeProfileDrawer } from './EmployeeProfileDrawer';

interface EmployeeSidebarProps {
  employees: Employee[];
  shiftCounts: Record<string, number>;
  employerId: string;
}

export function EmployeeSidebar({ employees, shiftCounts, employerId }: EmployeeSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleEmployeeClick = (emp: Employee) => {
    setSelectedEmployee(emp);
    setDrawerOpen(true);
  };

  return (
    <>
      <aside className={cn(
        'hidden lg:flex flex-col shrink-0 border-r border-border bg-card overflow-y-auto transition-all duration-200',
        collapsed ? 'w-12' : 'w-52'
      )}>
        <div className="p-3 border-b border-border flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <Users className="h-5 w-5 text-primary shrink-0" />
              <h2 className="font-semibold text-foreground truncate">Team ({employees.length})</h2>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 shrink-0', collapsed && 'mx-auto')}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <div className="p-2 flex-1">
          {employees.length === 0 ? (
            !collapsed && <p className="text-sm text-muted-foreground p-3">No employees yet.</p>
          ) : (
            <ul className="space-y-1">
              {employees.map((emp) => (
                <li
                  key={emp.id}
                  className={cn(
                    'flex items-center gap-3 rounded-md transition-colors hover:bg-muted/50 cursor-pointer',
                    collapsed ? 'justify-center px-1 py-2' : 'px-3 py-2.5'
                  )}
                  title={collapsed ? `${emp.name} – ${emp.role}` : undefined}
                  onClick={() => handleEmployeeClick(emp)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <UserCircle className="h-4 w-4 text-primary" />
                  </div>
                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.role}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <EmployeeProfileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        employee={selectedEmployee}
        employerId={employerId}
        initialEdit
      />
    </>
  );
}
