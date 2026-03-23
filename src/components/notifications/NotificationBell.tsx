import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import {
  useEmployeeNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
  useRealtimeNotifications,
  type AppNotification,
} from '@/hooks/use-notifications';

interface NotificationBellProps {
  employeeId: string | undefined;
}

export function NotificationBell({ employeeId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useEmployeeNotifications(employeeId);
  const { data: unreadCount = 0 } = useUnreadCount(employeeId);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();

  // Subscribe to realtime notifications
  useRealtimeNotifications(employeeId);

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read_at) {
      markRead.mutate(n.id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 && employeeId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto py-1"
              onClick={() => markAll.mutate(employeeId)}
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
                  !n.read_at ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                  <div className={!n.read_at ? '' : 'ml-4'}>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(n.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
