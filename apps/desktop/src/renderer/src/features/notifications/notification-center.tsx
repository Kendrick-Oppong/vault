import { useNotificationsState, useNotificationsActions } from "@/stores/notifications/notifications.selectors";
import { Button } from "@vault/ui/components/button";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@vault/ui/lib/utils";

const typeConfig = {
  success: { icon: CheckCircle2, bgColor: "bg-green-500/10", borderColor: "border-green-500/20", textColor: "text-green-500", iconColor: "text-green-500" },
  error: { icon: AlertCircle, bgColor: "bg-destructive/10", borderColor: "border-destructive/20", textColor: "text-destructive", iconColor: "text-destructive" },
  warning: { icon: AlertTriangle, bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/20", textColor: "text-yellow-500", iconColor: "text-yellow-500" },
  info: { icon: Info, bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20", textColor: "text-blue-500", iconColor: "text-blue-500" }
};

export const NotificationCenter = () => {
  const { notifications } = useNotificationsState();
  const { remove } = useNotificationsActions();

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-[400px] pointer-events-none">
      {notifications.map((notification) => {
        const config = typeConfig[notification.type];
        const Icon = config.icon;

        return (
          <div
            key={notification.id}
            className={cn(
              "flex gap-3 p-3 rounded-lg border pointer-events-auto",
              config.bgColor,
              config.borderColor
            )}
          >
            <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", config.iconColor)} />

            <div className="flex-1 min-w-0">
              {notification.title && (
                <p className="text-sm font-medium text-foreground">
                  {notification.title}
                </p>
              )}
              {notification.message && (
                <p className={cn("text-xs mt-0.5", notification.title ? "text-muted-foreground" : "text-foreground")}>
                  {notification.message}
                </p>
              )}

              {notification.actions && notification.actions.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {notification.actions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        action.callback();
                        remove(notification.id);
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 rounded shrink-0"
              onClick={() => remove(notification.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
};
