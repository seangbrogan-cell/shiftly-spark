import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X, Trash2, Building2, Plus } from 'lucide-react';
import { useUpdateWorkplace, useDeleteWorkplace, useToggleFullScheduleVisible, useCreateWorkplace, type Workplace } from '@/hooks/use-workplaces';
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

export function WorkplaceManager({ workplaces, employerId }: WorkplaceManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingWp, setDeletingWp] = useState<Workplace | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [copyFrom, setCopyFrom] = useState<string>('none');
  const updateWorkplace = useUpdateWorkplace();
  const deleteWorkplace = useDeleteWorkplace();
  const toggleVisible = useToggleFullScheduleVisible();
  const createWorkplace = useCreateWorkplace();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createWorkplace.mutateAsync({
        employerId,
        name: newName.trim(),
        copyFromWorkplaceId: copyFrom !== 'none' ? copyFrom : undefined,
      });
      setCreateOpen(false);
      setNewName('');
      setCopyFrom('none');
      toast({ title: 'Workplace created', description: `${newName.trim()} is ready.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openCreateDialog = () => {
    setNewName('');
    setCopyFrom(workplaces.length > 0 ? workplaces[0].id : 'none');
    setCreateOpen(true);
  };

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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Workplaces
          </CardTitle>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-1.5 h-4 w-4" /> Add
          </Button>
        </div>
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

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Workplace</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="wp-mgr-name">Workplace Name</Label>
                <Input
                  id="wp-mgr-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Downtown Branch"
                />
              </div>
              {workplaces.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="wp-mgr-copy">Copy Shifts From</Label>
                  <Select value={copyFrom} onValueChange={setCopyFrom}>
                    <SelectTrigger id="wp-mgr-copy">
                      <SelectValue placeholder="Start fresh" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Start fresh (no shifts)</SelectItem>
                      {workplaces.map((wp) => (
                        <SelectItem key={wp.id} value={wp.id}>
                          Copy from {wp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || createWorkplace.isPending}>
                {createWorkplace.isPending ? 'Creating...' : 'Create Workplace'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingWp} onOpenChange={(o) => !o && setDeletingWp(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {deletingWp?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this workplace and all its shifts and schedule assignments. <span className="font-bold text-destructive">This action cannot be undone.</span>
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
