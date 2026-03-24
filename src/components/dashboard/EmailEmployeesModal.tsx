import { useState } from 'react';
import type { Employee } from '@/hooks/use-dashboard-data';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, X } from 'lucide-react';

interface EmailEmployeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  preselected?: Employee[];
  senderName?: string;
}

export function EmailEmployeesModal({ open, onOpenChange, employees, preselected, senderName }: EmailEmployeesModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() =>
    new Set(preselected?.map(e => e.id) ?? [])
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setSubject('');
      setBody('');
      setSelected(new Set());
    }
    onOpenChange(o);
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(employees.map(e => e.id)) : new Set());
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || selected.size === 0) return;
    setSending(true);
    const recipients = employees.filter(e => selected.has(e.id));
    let successCount = 0;
    let failCount = 0;

    for (const emp of recipients) {
      try {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'employee-message',
            recipientEmail: emp.email,
            idempotencyKey: `emp-msg-${emp.id}-${Date.now()}`,
            templateData: { subject: subject.trim(), messageBody: body.trim(), senderName: senderName || undefined },
          },
        });
        if (error) throw error;
        successCount++;
      } catch {
        failCount++;
      }
    }

    setSending(false);
    if (failCount === 0) {
      toast({ title: 'Emails sent', description: `Successfully queued ${successCount} email(s).` });
      handleOpenChange(false);
    } else {
      toast({ title: 'Some emails failed', description: `${successCount} sent, ${failCount} failed.`, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Email to Employees</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Recipients</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selected.size === employees.length && employees.length > 0}
                  onCheckedChange={(c) => toggleAll(!!c)}
                />
                <span className="text-xs text-muted-foreground">Select all</span>
              </div>
            </div>
            <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-1">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer text-sm">
                  <Checkbox checked={selected.has(emp.id)} onCheckedChange={() => toggle(emp.id)} />
                  <span className="flex-1 truncate">{emp.name}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">{emp.email}</span>
                </label>
              ))}
            </div>
            {selected.size > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{selected.size} recipient(s) selected</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="email-subject">Subject</Label>
            <Input id="email-subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Schedule Update" />
          </div>

          {/* Body */}
          <div>
            <Label htmlFor="email-body">Message</Label>
            <Textarea id="email-body" value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." rows={5} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !subject.trim() || !body.trim() || selected.size === 0}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
