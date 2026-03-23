import { useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWeekPublishStatus, usePublishSchedule, useNotificationConfig } from '@/hooks/use-publish-data';
import { StatusBadge } from './StatusBadge';
import { PublishPreviewModal } from './PublishPreviewModal';
import { NotificationConfigPanel } from './NotificationConfigPanel';
import { Send, Eye, Users, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWeeklyAssignments, type AssignmentWithDetails } from '@/hooks/use-calendar-data';
import type { Employee, Shift } from '@/hooks/use-dashboard-data';

interface PublishPanelProps {
  employerId: string;
  currentWeek: Date;
  employees: Employee[];
  shifts: Shift[];
}

export function PublishPanel({ employerId, currentWeek, employees, shifts }: PublishPanelProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const { data: publishStatus } = useWeekPublishStatus(currentWeek);
  const { data: notifConfig } = useNotificationConfig(employerId);
  const { data: assignments = [] } = useWeeklyAssignments(currentWeek);
  const publishSchedule = usePublishSchedule();
  const { toast } = useToast();

  const affectedEmployeeIds = [...new Set(assignments.map((a) => a.employee_id))];
  const channels = notifConfig?.channels ?? ['in_app'];

  const handlePublish = async () => {
    try {
      const result = await publishSchedule.mutateAsync({
        employerId,
        startDate,
        endDate,
        channels,
      });
      toast({
        title: 'Schedule Published',
        description: `Notified ${result.employeeCount} employee${result.employeeCount !== 1 ? 's' : ''}.`,
      });
    } catch (err: any) {
      toast({ title: 'Error publishing', description: err.message, variant: 'destructive' });
    }
  };

  const status = publishStatus?.status ?? 'no_schedule';

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Send className="h-4 w-4" /> Publish Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StatusBadge status={status} publishedAt={publishStatus?.publishedAt ?? null} />

          <div className="text-xs text-muted-foreground">
            <p className="font-medium">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>Affects {affectedEmployeeIds.length} employee{affectedEmployeeIds.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setPreviewOpen(true)}
              disabled={status === 'no_schedule'}
            >
              <Eye className="h-3.5 w-3.5" /> Preview Before Publishing
            </Button>
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={handlePublish}
              disabled={status === 'no_schedule' || status === 'published' || publishSchedule.isPending}
            >
              <Send className="h-3.5 w-3.5" />
              {publishSchedule.isPending ? 'Publishing...' : 'Publish Schedule'}
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start gap-2 text-xs"
            onClick={() => setConfigOpen(true)}
          >
            <Settings className="h-3.5 w-3.5" /> Notification Settings
          </Button>
        </CardContent>
      </Card>

      <PublishPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        assignments={assignments}
        employees={employees}
        weekStart={weekStart}
        weekEnd={weekEnd}
        channels={channels}
        onPublish={handlePublish}
        isPublishing={publishSchedule.isPending}
      />

      <NotificationConfigPanel
        open={configOpen}
        onOpenChange={setConfigOpen}
        employerId={employerId}
      />
    </>
  );
}
