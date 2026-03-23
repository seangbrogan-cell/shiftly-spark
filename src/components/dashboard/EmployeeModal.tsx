import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateEmployee, useUpdateEmployee, type Employee } from '@/hooks/use-dashboard-data';

interface EmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  employerId: string;
}

export function EmployeeModal({ open, onOpenChange, employee, employerId }: EmployeeModalProps) {
  const isEdit = !!employee;
  const [name, setName] = useState(employee?.name ?? '');
  const [email, setEmail] = useState(employee?.email ?? '');
  const [phone, setPhone] = useState(employee?.phone ?? '');
  const [role, setRole] = useState(employee?.role ?? 'Staff');
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
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format';
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
        });
        toast({ title: 'Employee updated' });
      } else {
        await createEmployee.mutateAsync({
          employer_id: employerId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          role,
        });
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
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
              </SelectContent>
            </Select>
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
