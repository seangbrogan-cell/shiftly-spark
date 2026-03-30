import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useCreateWorkplace, type Workplace } from '@/hooks/use-workplaces';
import { useToast } from '@/hooks/use-toast';

interface WorkplaceSelectorProps {
  workplaces: Workplace[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  employerId: string;
}

export function WorkplaceSelector({ workplaces, selectedId, onSelect, employerId }: WorkplaceSelectorProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [copyFrom, setCopyFrom] = useState<string>('none');
  const createWorkplace = useCreateWorkplace();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const wp = await createWorkplace.mutateAsync({
        employerId,
        name: newName.trim(),
        copyFromWorkplaceId: copyFrom !== 'none' ? copyFrom : undefined,
      });
      onSelect(wp.id);
      setCreateOpen(false);
      setNewName('');
      setCopyFrom('none');
      toast({ title: 'Workplace created', description: `${newName.trim()} is ready.` });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedId ?? ''} onValueChange={onSelect}>
        <SelectTrigger className="h-8 w-[200px] text-sm">
          <SelectValue placeholder="Select workplace" />
        </SelectTrigger>
        <SelectContent>
          {workplaces.map((wp) => (
            <SelectItem key={wp.id} value={wp.id}>
              {wp.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setCreateOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> New Workplace
      </Button>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workplace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="wp-name">Workplace Name</Label>
              <Input
                id="wp-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Downtown Branch"
              />
            </div>
            {workplaces.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="wp-copy">Copy Shifts From</Label>
                <Select value={copyFrom} onValueChange={setCopyFrom}>
                  <SelectTrigger id="wp-copy">
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
    </div>
  );
}
