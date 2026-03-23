import { useMemo } from 'react';
import type { Employee } from '@/hooks/use-dashboard-data';
import { useRoleTypes } from '@/hooks/use-role-types';
import { buildRoleSortPriority } from '@/lib/roles';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';

interface EmployeeTableProps {
  employees: Employee[];
  shiftCounts: Record<string, number>;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

function EmployeeRows({ employees, shiftCounts, onEdit, onDelete }: EmployeeTableProps) {
  return (
    <>
      {employees.map((emp) => (
        <TableRow key={emp.id}>
          <TableCell className="font-medium">{emp.name}</TableCell>
          <TableCell className="text-muted-foreground">{emp.email}</TableCell>
          <TableCell className="hidden md:table-cell text-muted-foreground">{emp.phone || '—'}</TableCell>
          <TableCell>
            <Badge variant={emp.role !== 'Staff' ? 'default' : 'secondary'}>
              {emp.role}
            </Badge>
          </TableCell>
          <TableCell className="text-center">{shiftCounts[emp.id] || 0}</TableCell>
          <TableCell className="text-right">
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(emp)} aria-label={`Edit ${emp.name}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(emp)} aria-label={`Delete ${emp.name}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function EmployeeTable({ employees, shiftCounts, onEdit, onDelete }: EmployeeTableProps) {
  const { management, staff } = useMemo(() => {
    const mgmt: Employee[] = [];
    const stf: Employee[] = [];
    employees.forEach((e) => {
      if (e.role === 'Staff') stf.push(e);
      else mgmt.push(e);
    });
    return { management: mgmt, staff: stf };
  }, [employees]);

  if (employees.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">No employees yet. Add your first team member to get started.</p>
      </div>
    );
  }

  const headers = (
    <TableHeader>
      <TableRow className="bg-muted/50">
        <TableHead>Name</TableHead>
        <TableHead>Email</TableHead>
        <TableHead className="hidden md:table-cell">Phone</TableHead>
        <TableHead>Role</TableHead>
        <TableHead className="text-center">Shifts</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="space-y-6">
      {management.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Management</h3>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              {headers}
              <TableBody>
                <EmployeeRows employees={management} shiftCounts={shiftCounts} onEdit={onEdit} onDelete={onDelete} />
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {staff.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Staff</h3>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              {headers}
              <TableBody>
                <EmployeeRows employees={staff} shiftCounts={shiftCounts} onEdit={onEdit} onDelete={onDelete} />
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
