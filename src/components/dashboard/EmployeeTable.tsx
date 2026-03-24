import { useMemo, useState } from 'react';
import type { Employee } from '@/hooks/use-dashboard-data';
import { useRoleTypes } from '@/hooks/use-role-types';
import { buildRoleSortPriority } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Send, Check, Clock, RefreshCw, Mail } from 'lucide-react';

interface EmployeeTableProps {
  employees: Employee[];
  shiftCounts: Record<string, number>;
  employerId?: string;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onEmail?: (employee: Employee) => void;
}

function EmployeeRows({ employees, shiftCounts, onEdit, onDelete, onEmail }: EmployeeTableProps) {
  const [inviting, setInviting] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const [resending, setResending] = useState<string | null>(null);

  const startCooldown = (empId: string) => {
    setCooldowns((prev) => ({ ...prev, [empId]: 60 }));
    const interval = setInterval(() => {
      setCooldowns((prev) => {
        const remaining = (prev[empId] ?? 0) - 1;
        if (remaining <= 0) {
          clearInterval(interval);
          const { [empId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [empId]: remaining };
      });
    }, 1000);
  };

  const handleInvite = async (emp: Employee) => {
    setInviting(emp.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-employee-account', {
        body: { employeeId: emp.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Invite sent', description: `Password reset email sent to ${emp.email}` });
      startCooldown(emp.id);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('wait') || msg.includes('too recently') || msg.includes('429')) {
        startCooldown(emp.id);
      }
      toast({ title: 'Invite failed', description: msg, variant: 'destructive' });
    } finally {
      setInviting(null);
    }
  };

  const handleResendReset = async (emp: Employee) => {
    setResending(emp.id);
    try {
      const { data, error } = await supabase.functions.invoke('resend-reset-link', {
        body: { employeeId: emp.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Reset link sent', description: `Password reset email sent to ${emp.email}` });
      startCooldown(emp.id);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('wait') || msg.includes('too recently') || msg.includes('429')) {
        startCooldown(emp.id);
      }
      toast({ title: 'Resend failed', description: msg, variant: 'destructive' });
    } finally {
      setResending(null);
    }
  };

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
              {(emp as any).user_id ? (
                cooldowns[emp.id] ? (
                  <span className="inline-flex items-center gap-1 px-2 text-xs text-muted-foreground tabular-nums" title={`Resend available in ${cooldowns[emp.id]}s`}>
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{cooldowns[emp.id]}s</span>
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleResendReset(emp)}
                    disabled={resending === emp.id}
                    aria-label={`Resend reset link to ${emp.name}`}
                    title="Resend password reset link"
                  >
                    <RefreshCw className={`h-4 w-4 ${resending === emp.id ? 'animate-spin' : ''}`} />
                  </Button>
                )
              ) : cooldowns[emp.id] ? (
                <span className="inline-flex items-center gap-1 px-2 text-xs text-muted-foreground tabular-nums" title={`Resend available in ${cooldowns[emp.id]}s`}>
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{cooldowns[emp.id]}s</span>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleInvite(emp)}
                  disabled={inviting === emp.id}
                  aria-label={`Invite ${emp.name}`}
                  title="Create account & send invite"
                >
                  <Send className={`h-4 w-4 ${inviting === emp.id ? 'animate-pulse' : ''}`} />
                </Button>
              )}
              {onEmail && (
                <Button variant="ghost" size="icon" onClick={() => onEmail(emp)} aria-label={`Email ${emp.name}`} title="Send email">
                  <Mail className="h-4 w-4" />
                </Button>
              )}
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

export function EmployeeTable({ employees, shiftCounts, employerId, onEdit, onDelete }: EmployeeTableProps) {
  const { data: dbRoles = [] } = useRoleTypes(employerId);
  const roleSortPriority = useMemo(() => buildRoleSortPriority(dbRoles), [dbRoles]);

  const { management, staff } = useMemo(() => {
    const mgmt: Employee[] = [];
    const stf: Employee[] = [];
    employees.forEach((e) => {
      if (e.role === 'Staff') stf.push(e);
      else mgmt.push(e);
    });
    // Sort management by role priority then name
    mgmt.sort((a, b) => {
      const p = roleSortPriority(a.role) - roleSortPriority(b.role);
      return p !== 0 ? p : a.name.localeCompare(b.name);
    });
    stf.sort((a, b) => a.name.localeCompare(b.name));
    return { management: mgmt, staff: stf };
  }, [employees, roleSortPriority]);

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
