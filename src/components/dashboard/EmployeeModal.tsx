import { useState } from 'react';
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
  const roleNames = getRoleNames(dbRoles);
  const [name, setName] = useState(employee?.name ?? '');
  const [email, setEmail] = useState(employee?.email ?? '');
  const [phone, setPhone] = useState(employee?.phone ?? '');
  const [role, setRole] = useState(employee?.role ?? 'Staff');
  const [customRole, setCustomRole] = useState(!roleNames.includes(employee?.role ?? 'Staff') ? (employee?.role ?? '') : '');
  const [availability, setAvailability] = useState<string[]>(
    (employee as any)?.availability ?? [...DAYS_OF_WEEK]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  // Reset form when employee changes
  const resetForm = () => {
    setName(employee?.name ?? '');
    setEmail(employee?.email ?? '');
    setPhone(employee?.phone ?? '');
    setRole(employee?.role ?? 'Staff');
    setCustomRole(!roleNames.includes(employee?.role ?? 'Staff') ? (employee?.role ?? '') : '');
    setAvailability((employee as any)?.availability ?? [...DAYS_OF_WEEK]);
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format';
    if (!role.trim()) errs.role = 'Role is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        } as any);
        toast({ title: 'Employee updated' });
      } else {
        await createEmployee.mutateAsync({
          employer_id: employerId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          role,
          availability,
        } as any);
        toast({ title: 'Employee added' });
      }
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
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
          <div className="space-y-2">
            <Label>Availability</Label>
            <div className="flex flex-wrap gap-3">
              {DAYS_OF_WEEK.map((day) => (
                <label key={day} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={availability.includes(day)}
                    onCheckedChange={(checked) => {
                      setAvailability(prev =>
                        checked ? [...prev, day] : prev.filter(d => d !== day)
                      );
                    }}
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={createEmployee.isPending || updateEmployee.isPending}>
              {isEdit ? 'Save Changes' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
