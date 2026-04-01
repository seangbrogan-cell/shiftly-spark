import { useMemo, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { Employee } from '@/hooks/use-dashboard-data';
import { useUpdateEmployee } from '@/hooks/use-dashboard-data';
import { useRoleTypes } from '@/hooks/use-role-types';
import { buildRoleSortPriority } from '@/lib/roles';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Send, Check, Clock, RefreshCw, Mail, UserCheck, X } from 'lucide-react';

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

  const getFunctionErrorMessage = async (err: unknown) => {
    if (err instanceof FunctionsHttpError) {
      try {
        const payload = await err.context.json();
        if (payload && typeof payload === 'object') {
          const maybeError = (payload as { error?: unknown; message?: unknown }).error;
          const maybeMessage = (payload as { error?: unknown; message?: unknown }).message;
          if (typeof maybeError === 'string' && maybeError.trim()) return maybeError;
          if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
        }
      } catch {
        // Ignore parse issues and fall back below.
      }
    }

    if (err instanceof Error && err.message) return err.message;
    return 'Request failed. Please try again.';
  };

  const handleInvite = async (emp: Employee) => {
    setInviting(emp.id);
    try {
      const { data, error } = await supabase.functions.invoke('create-employee-account', {
        body: { employeeId: emp.id },
      });
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      toast({ title: 'Invite sent', description: `Password reset email sent to ${emp.email}` });
      startCooldown(emp.id);
    } catch (err: unknown) {
      const msg = await getFunctionErrorMessage(err);
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
      if (data?.error) throw new Error(data.error);
      if (error) throw error;
      toast({ title: 'Reset link sent', description: `Password reset email sent to ${emp.email}` });
      startCooldown(emp.id);
    } catch (err: unknown) {
      const msg = await getFunctionErrorMessage(err);
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
          <TableCell className="font-medium whitespace-nowrap text-xs md:text-sm px-2 md:px-4">{emp.name}</TableCell>
          <TableCell className="text-muted-foreground text-xs hidden md:table-cell">{emp.email}</TableCell>
          <TableCell className="hidden lg:table-cell text-muted-foreground">{emp.phone || '—'}</TableCell>
          <TableCell className="px-1 md:px-4">
            <Badge variant={emp.role !== 'Staff' ? 'default' : 'secondary'} className="text-[10px] md:text-xs px-1.5 md:px-2.5">
              {emp.role}
            </Badge>
          </TableCell>
          
          <TableCell className="text-right px-1 md:px-4">
            <div className="flex justify-end gap-0 sm:gap-1">
              {(emp as any).user_id ? (
                cooldowns[emp.id] ? (
                  <span className="inline-flex items-center gap-1 px-1 sm:px-2 text-[10px] sm:text-xs text-muted-foreground tabular-nums" title={`Resend available in ${cooldowns[emp.id]}s`}>
                    <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                    <span>{cooldowns[emp.id]}s</span>
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8"
                    onClick={() => handleResendReset(emp)}
                    disabled={resending === emp.id}
                    aria-label={`Resend reset link to ${emp.name}`}
                    title="Resend password reset link"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${resending === emp.id ? 'animate-spin' : ''}`} />
                  </Button>
                )
              ) : cooldowns[emp.id] ? (
                <span className="inline-flex items-center gap-1 px-1 sm:px-2 text-[10px] sm:text-xs text-muted-foreground tabular-nums" title={`Resend available in ${cooldowns[emp.id]}s`}>
                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  <span>{cooldowns[emp.id]}s</span>
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={() => handleInvite(emp)}
                  disabled={inviting === emp.id}
                  aria-label={`Invite ${emp.name}`}
                  title="Create account & send invite"
                >
                  <Send className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${inviting === emp.id ? 'animate-pulse' : ''}`} />
                </Button>
              )}
              {onEmail && (
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onEmail(emp)} aria-label={`Email ${emp.name}`} title="Send email">
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onEdit(emp)} aria-label={`Edit ${emp.name}`}>
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onDelete(emp)} aria-label={`Delete ${emp.name}`}>
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function EmployeeTable({ employees, shiftCounts, employerId, onEdit, onDelete, onEmail }: EmployeeTableProps) {
  const { data: dbRoles = [] } = useRoleTypes(employerId);
  const roleSortPriority = useMemo(() => buildRoleSortPriority(dbRoles), [dbRoles]);
  const updateEmployee = useUpdateEmployee();
  const { toast } = useToast();

  const { management, staff, pending } = useMemo(() => {
    const mgmt: Employee[] = [];
    const stf: Employee[] = [];
    const pnd: Employee[] = [];
    employees.forEach((e) => {
      if ((e as any).status === 'pending') {
        pnd.push(e);
      } else if (e.role === 'Staff') {
        stf.push(e);
      } else {
        mgmt.push(e);
      }
    });
    mgmt.sort((a, b) => {
      const p = roleSortPriority(a.role) - roleSortPriority(b.role);
      return p !== 0 ? p : a.name.localeCompare(b.name);
    });
    stf.sort((a, b) => a.name.localeCompare(b.name));
    pnd.sort((a, b) => a.name.localeCompare(b.name));
    return { management: mgmt, staff: stf, pending: pnd };
  }, [employees, roleSortPriority]);

  const handleApprove = async (emp: Employee) => {
    try {
      await updateEmployee.mutateAsync({ id: emp.id, status: 'active' } as any);
      toast({ title: 'Employee approved', description: `${emp.name} has been added to your team.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to approve employee.', variant: 'destructive' });
    }
  };

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
        <TableHead className="text-xs md:text-sm px-2 md:px-4">Name</TableHead>
        <TableHead className="hidden md:table-cell text-xs">Email</TableHead>
        <TableHead className="hidden lg:table-cell">Phone</TableHead>
        <TableHead className="text-xs md:text-sm px-1 md:px-4">Role</TableHead>
        <TableHead className="text-center text-xs md:text-sm px-1 md:px-4">Shifts</TableHead>
        <TableHead className="text-right text-xs md:text-sm px-1 md:px-4">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Approval ({pending.length})
          </h3>
          <div className="rounded-lg border-2 border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-100/50 dark:bg-amber-900/20">
                  <TableHead className="text-xs md:text-sm px-2 md:px-4">Name</TableHead>
                  <TableHead className="hidden md:table-cell text-xs">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="text-right text-xs md:text-sm px-1 md:px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium whitespace-nowrap text-xs md:text-sm px-2 md:px-4">
                      {emp.name}
                      <Badge variant="outline" className="ml-2 text-[10px] border-amber-400 text-amber-600 dark:text-amber-400">
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs hidden md:table-cell">{emp.email}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{emp.phone || '—'}</TableCell>
                    <TableCell className="text-right px-1 md:px-4">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleApprove(emp)}
                          disabled={updateEmployee.isPending}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => onDelete(emp)}
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {management.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Management</h3>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              {headers}
              <TableBody>
                <EmployeeRows employees={management} shiftCounts={shiftCounts} onEdit={onEdit} onDelete={onDelete} onEmail={onEmail} />
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {staff.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Staff</h3>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              {headers}
              <TableBody>
                <EmployeeRows employees={staff} shiftCounts={shiftCounts} onEdit={onEdit} onDelete={onDelete} onEmail={onEmail} />
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
