import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Pencil, Check, X, Trash2, Building2, Plus } from 'lucide-react';
import { useCreateWorkplace, useUpdateWorkplace, useDeleteWorkplace, useToggleFullScheduleVisible, type Workplace } from '@/hooks/use-workplaces';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WorkplaceManagerProps {
  workplaces: Workplace[];
  employerId: string;
}

export function WorkplaceManager({ workplaces }: WorkplaceManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingWp, setDeletingWp] = useState<Workplace | null>(null);
  const updateWorkplace = useUpdateWorkplace();
  const deleteWorkplace = useDeleteWorkplace();
  const toggleVisible = useToggleFullScheduleVisible();
  const { toast } = useToast();

  const startEdit = (wp: Workplace) => {
    setEditingId(wp.id);
    setEditName(wp.name);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      await updateWorkplace.mutateAsync({ id: editingId, name: editName.trim() });
      setEditingId(null);
      toast({ title: 'Workplace updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deletingWp) return;
    try {
      await deleteWorkplace.mutateAsync(deletingWp.id);
      setDeletingWp(null);
      toast({ title: 'Workplace deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" /> Workplaces
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {workplaces.map((wp) => (
          <div key={wp.id} className="flex items-center gap-2 rounded-md border border-border p-2">
            {editingId === wp.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm flex-1"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveEdit}>
                  <Check className="h-3.5 w-3.5 text-success" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm flex-1 truncate">{wp.name}</span>
                <div className="flex items-center gap-1.5" title="Allow employees to view full schedule">
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">Full schedule</span>
                  <Switch
                    checked={wp.full_schedule_visible}
                    onCheckedChange={(checked) => toggleVisible.mutate({ id: wp.id, visible: checked })}
                    className="scale-75"
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(wp)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {workplaces.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingWp(wp)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </>
            )}
          </div>
        ))}

        <AlertDialog open={!!deletingWp} onOpenChange={(o) => !o && setDeletingWp(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deletingWp?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this workplace and all its shifts and schedule assignments. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
