import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNotificationConfig, useUpsertNotificationConfig } from '@/hooks/use-publish-data';
import { useToast } from '@/hooks/use-toast';

interface NotificationConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employerId: string;
}

export function NotificationConfigPanel({ open, onOpenChange, employerId }: NotificationConfigPanelProps) {
  const { data: config } = useNotificationConfig(employerId);
  const upsert = useUpsertNotificationConfig();
  const { toast } = useToast();

  const [onPublish, setOnPublish] = useState(true);
  const [onChange, setOnChange] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(false);
  const [weeklyReminder, setWeeklyReminder] = useState(false);
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);

  useEffect(() => {
    if (config) {
      setOnPublish(config.on_publish);
      setOnChange(config.on_change);
      setDailyReminder(config.daily_reminder);
      setWeeklyReminder(config.weekly_reminder);
      setInApp(config.channels.includes('in_app'));
      setEmail(config.channels.includes('email'));
    }
  }, [config]);

  const handleSave = async () => {
    const channels: string[] = [];
    if (inApp) channels.push('in_app');
    if (email) channels.push('email');

    try {
      await upsert.mutateAsync({
        employer_id: employerId,
        on_publish: onPublish,
        on_change: onChange,
        daily_reminder: dailyReminder,
        weekly_reminder: weeklyReminder,
        channels,
      });
      toast({ title: 'Settings saved' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Triggers</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="on-publish" checked={onPublish} onCheckedChange={(v) => setOnPublish(!!v)} />
                <Label htmlFor="on-publish" className="text-sm">On Schedule Publish</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="on-change" checked={onChange} onCheckedChange={(v) => setOnChange(!!v)} />
                <Label htmlFor="on-change" className="text-sm">On Schedule Change</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="daily" checked={dailyReminder} onCheckedChange={(v) => setDailyReminder(!!v)} />
                <Label htmlFor="daily" className="text-sm">Daily Reminder</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="weekly" checked={weeklyReminder} onCheckedChange={(v) => setWeeklyReminder(!!v)} />
                <Label htmlFor="weekly" className="text-sm">Weekly Reminder</Label>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Channels</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox id="ch-inapp" checked={inApp} onCheckedChange={(v) => setInApp(!!v)} />
                <Label htmlFor="ch-inapp" className="text-sm">In-App</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ch-email" checked={email} onCheckedChange={(v) => setEmail(!!v)} />
                <Label htmlFor="ch-email" className="text-sm">Email</Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
