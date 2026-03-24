import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useCreateEmployee, useUpdateEmployee, type Employee } from '@/hooks/use-dashboard-data';
import { getRoleNames } from '@/lib/roles';
import { useRoleTypes } from '@/hooks/use-role-types';
import {
  useEmployeeAvailability,
  useSaveEmployeeAvailability,
  buildDayTimeRanges,
  type DayTimeRange,
} from '@/hooks/use-employee-availability';
import { useWorkplaces } from '@/hooks/use-workplaces';
import { useEmployeeWorkplaces, useSaveEmployeeWorkplaces } from '@/hooks/use-employee-workplaces';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

interface EmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  employerId: string;
}

export function EmployeeModal({ open, onOpenChange, employee, employerId }: EmployeeModalProps) {
  const isEdit = !!employee;
  const { data: dbRoles = [] } = useRoleTypes(employerId);
  const roleNames = useMemo(() => getRoleNames(dbRoles), [dbRoles]);
  const { data: workplaces = [] } = useWorkplaces(employerId);
  const { data: empWorkplaces = [] } = useEmployeeWorkplaces(employee?.id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Staff');
  const [customRole, setCustomRole] = useState('');
  const [availability, setAvailability] = useState<string[]>([...DAYS_OF_WEEK]);
  const [dayTimeRanges, setDayTimeRanges] = useState<DayTimeRange[]>(
    DAYS_OF_WEEK.map(day => ({ day, enabled: true, start_time: '00:00', end_time: '23:59' }))
  );
  const [selectedWorkplaceIds, setSelectedWorkplaceIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const saveAvailability = useSaveEmployeeAvailability();
  const saveWorkplaces = useSaveEmployeeWorkplaces();
  const isSaving = createEmployee.isPending || updateEmployee.isPending || saveAvailability.isPending || saveWorkplaces.isPending;

  const { data: availabilityRows = [] } = useEmployeeAvailability(employee?.id);

  const initializeForm = (targetEmployee: Employee | null | undefined) => {
    const nextRole = targetEmployee?.role ?? 'Staff';
    const nextAvailability = (targetEmployee as any)?.availability ?? [...DAYS_OF_WEEK];

    setName(targetEmployee?.name ?? '');
    setEmail(targetEmployee?.email ?? '');
    setPhone(targetEmployee?.phone ?? '');
    setRole(nextRole);
    setCustomRole(!roleNames.includes(nextRole) ? nextRole : '');
    setAvailability(nextAvailability);
    setDayTimeRanges(buildDayTimeRanges(nextAvailability, targetEmployee ? availabilityRows : []));
    setSelectedWorkplaceIds(
      targetEmployee
        ? empWorkplaces.map(ew => ew.workplace_id)
        : workplaces.map(w => w.id) // new employees default to all workplaces
    );
    setErrors({});
  };

  // Always hydrate form from current modal mode (Add/Edit) when opened.
  useEffect(() => {
    if (!open) return;
    initializeForm(employee);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id, roleNames, empWorkplaces, workplaces]);

  // Sync time ranges when availability data loads
  useEffect(() => {
    if (open && employee && availabilityRows.length > 0) {
      const empAvail = (employee as any)?.availability ?? [...DAYS_OF_WEEK];
      setDayTimeRanges(buildDayTimeRanges(empAvail, availabilityRows));
    }
  }, [open, employee, availabilityRows]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format';
    if (!role.trim()) errs.role = 'Role is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const updateDayTime = (day: string, field: 'start_time' | 'end_time', value: string) => {
    setDayTimeRanges(prev => prev.map(d => d.day === day ? { ...d, [field]: value } : d));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!validate()) return;

    try {
      if (isEdit && employee) {
        await updateEmployee.mutateAsync({
          id: employee.id,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          role,
          availability,
        });
        await saveAvailability.mutateAsync({
          employeeId: employee.id,
          availability,
          dayAvailability: dayTimeRanges,
        });
        await saveWorkplaces.mutateAsync({ employeeId: employee.id, workplaceIds: selectedWorkplaceIds });
        toast({ title: 'Employee updated' });
      } else {
        const created = await createEmployee.mutateAsync({
          employer_id: employerId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          role,
          availability,
        });
        if (created?.id) {
          await saveAvailability.mutateAsync({
            employeeId: created.id,
            availability,
            dayAvailability: dayTimeRanges,
          });
          await saveWorkplaces.mutateAsync({ employeeId: created.id, workplaceIds: selectedWorkplaceIds });
        }
        toast({ title: 'Employee added' });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update employee details.' : 'Fill in the details to add a new team member.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="emp-name">Name *</Label>
            <Input id="emp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            {errors.name && <p className="text-sm text-error">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-email">Email *</Label>
            <Input id="emp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
            {errors.email && <p className="text-sm text-error">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="emp-phone">Phone</Label>
            <Input id="emp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={roleNames.includes(role) ? role : '__custom__'} onValueChange={(v) => { if (v !== '__custom__') { setRole(v); setCustomRole(''); } else { setRole(''); } }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roleNames.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
                <SelectItem value="__custom__">Custom…</SelectItem>
              </SelectContent>
            </Select>
            {(!roleNames.includes(role) || customRole) && (
              <Input
                placeholder="Enter custom role name"
                value={customRole || (roleNames.includes(role) ? '' : role)}
                onChange={(e) => { setCustomRole(e.target.value); setRole(e.target.value); }}
              />
            )}
            {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
          </div>

          {/* Availability Section */}
          <div className="space-y-3">
            <Label>Availability</Label>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const isEnabled = availability.includes(day);
                const dayRange = dayTimeRanges.find(d => d.day === day);
                const hasCustomTime = dayRange && (dayRange.start_time !== '00:00' || dayRange.end_time !== '23:59');

                return (
                  <div key={day} className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer w-16 shrink-0">
                      <Checkbox
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          setAvailability(prev =>
                            checked ? [...prev, day] : prev.filter(d => d !== day)
                          );
                        }}
                      />
                      <span className="text-sm font-medium">{day}</span>
                    </label>
                    {isEnabled && (
                      <div className="flex items-center gap-1.5 flex-1">
                        <Input
                          type="time"
                          value={dayRange?.start_time ?? '00:00'}
                          onChange={(e) => updateDayTime(day, 'start_time', e.target.value)}
                          className="h-8 text-xs w-[110px]"
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={dayRange?.end_time ?? '23:59'}
                          onChange={(e) => updateDayTime(day, 'end_time', e.target.value)}
                          className="h-8 text-xs w-[110px]"
                        />
                        {hasCustomTime && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            onClick={() => {
                              updateDayTime(day, 'start_time', '00:00');
                              updateDayTime(day, 'end_time', '23:59');
                            }}
                          >
                            All day
                          </Button>
                        )}
                      </div>
                    )}
                    {!isEnabled && (
                      <span className="text-xs text-muted-foreground">Not available</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isEdit ? 'Save Changes' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
