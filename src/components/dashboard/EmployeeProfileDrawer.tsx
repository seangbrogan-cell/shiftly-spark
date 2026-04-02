import { useState, useMemo } from 'react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useUpdateEmployee, useDeleteEmployee, type Employee } from '@/hooks/use-dashboard-data';
import { getRoleNames } from '@/lib/roles';
import { useRoleTypes } from '@/hooks/use-role-types';
import { Mail, Phone, UserCircle, Pencil, Trash2, X } from 'lucide-react';
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog';

interface EmployeeProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  employerId: string;
}

export function EmployeeProfileDrawer({ open, onOpenChange, employee, employerId }: EmployeeProfileDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: dbRoles = [] } = useRoleTypes(employerId);
  const roleNames = useMemo(() => getRoleNames(dbRoles), [dbRoles]);
  const updateEmployee = useUpdateEmployee();
  const { toast } = useToast();

  const startEditing = () => {
    if (!employee) return;
    setName(employee.name);
    setEmail(employee.email);
    setPhone(employee.phone ?? '');
    setRole(employee.role);
    setErrors({});
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (name.trim().length > 100) errs.name = 'Max 100 characters';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email';
    if (!role.trim()) errs.role = 'Role is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!employee || !validate()) return;
    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        role,
      } as any);
      toast({ title: 'Employee updated' });
      setEditing(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteSuccess = () => {
    setDeleteOpen(false);
    onOpenChange(false);
  };

  if (!employee) return null;

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => { if (!o) setEditing(false); onOpenChange(o); }} direction="right">
        <DrawerContent className="fixed inset-y-0 right-0 left-auto w-full sm:w-[400px] rounded-t-none rounded-l-[10px] h-full mt-0">
          <div className="mx-0 mt-0 h-0 w-0" /> {/* Override default drag handle */}
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between">
              <DrawerTitle>Employee Profile</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
            <DrawerDescription>View and manage employee details.</DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Avatar / Header */}
            <div className="flex items-center gap-4 py-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <UserCircle className="h-8 w-8 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                {editing ? (
                  <div className="space-y-1">
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-8 text-sm" />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-foreground truncate">{employee.name}</h3>
                    <Badge variant="secondary" className="text-xs">{employee.role}</Badge>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Details */}
            <div className="space-y-4 pt-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                {editing ? (
                  <>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </>
                ) : (
                  <p className="text-sm text-foreground">{employee.email}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </Label>
                {editing ? (
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className="h-8 text-sm" />
                ) : (
                  <p className="text-sm text-foreground">{employee.phone || '—'}</p>
                )}
              </div>

              {/* Role */}
              {editing && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <Select value={roleNames.includes(role) ? role : role} onValueChange={setRole}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleNames.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
                </div>
              )}

              {/* Employment type */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Employment Type</Label>
                <p className="text-sm text-foreground capitalize">
                  {(employee.employment_type ?? 'full_time').replace('_', ' ')}
                </p>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge variant={employee.status === 'active' ? 'default' : 'outline'} className="text-xs capitalize">
                  {employee.status}
                </Badge>
              </div>
            </div>
          </div>

          <DrawerFooter className="border-t border-border">
            {editing ? (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={cancelEditing}>Cancel</Button>
                <Button className="flex-1" onClick={handleSave} disabled={updateEmployee.isPending}>
                  {updateEmployee.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={startEditing}>
                  <Pencil className="h-4 w-4 mr-1.5" /> Edit
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                </Button>
              </div>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <DeleteEmployeeDialog
        open={deleteOpen}
        onOpenChange={(o) => { setDeleteOpen(o); if (!o && !employee) onOpenChange(false); }}
        employee={employee}
      />
    </>
  );
}
