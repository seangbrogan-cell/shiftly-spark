import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useDeleteEmployee, type Employee } from '@/hooks/use-dashboard-data';
import { useToast } from '@/hooks/use-toast';

interface DeleteEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onDeleted?: () => void;
}

export function DeleteEmployeeDialog({ open, onOpenChange, employee, onDeleted }: DeleteEmployeeDialogProps) {
  const deleteEmployee = useDeleteEmployee();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!employee) return;
    try {
      await deleteEmployee.mutateAsync(employee.id);
      toast({ title: 'Employee deleted', description: `${employee.name} has been removed.` });
      onOpenChange(false);
      onDeleted?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {employee?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span className="font-semibold text-foreground">{employee?.name}</span>?
            This will also remove all their shift assignments. <span className="font-bold text-destructive">This action cannot be undone.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteEmployee.isPending}
          >
            {deleteEmployee.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
