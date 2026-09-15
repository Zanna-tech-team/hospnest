import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  CheckCheck,
  ExternalLink,
  FlaskConical,
  Package,
  RefreshCw,
  Scan,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type HospitalNotificationItem,
} from "@/lib/notifications.functions";

interface NotificationCenterProps {
  hospitalId?: string | undefined;
}

export function NotificationCenter({ hospitalId }: NotificationCenterProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getNotificationsFn = useServerFn(getUserNotifications);
  const markReadFn = useServerFn(markNotificationAsRead);
  const markAllReadFn = useServerFn(markAllNotificationsAsRead);

  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "critical" | "operations">("all");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["user-live-notifications", hospitalId],
    queryFn: () => getNotificationsFn({ data: { hospitalId } }),
    refetchInterval: 10000,
  });

  // Supabase Realtime listener for immediate notifications (Prompt 40)
  useEffect(() => {
    const channel = supabase
      .channel("realtime-notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-live-notifications"] });
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, refetch]);

  const notifications = data?.notifications || [];
  const unreadList = notifications.filter((n) => !readIds.has(n.id) && !n.isRead);
  const unreadCount = unreadList.length;
  const hasCriticalUnread = unreadList.some((n) => n.severity === "critical");

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "critical") return item.severity === "critical";
    if (activeTab === "operations") return item.category === "low_stock" || item.category === "transfer";
    return true;
  });

  const handleMarkAsRead = async (id: string) => {
    setReadIds((prev) => new Set(prev).add(id));
    try {
      await markReadFn({ data: { notificationId: id } });
    } catch (e) {
      console.warn("Mark read err:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(new Set(allIds));
    try {
      await markAllReadFn();
      queryClient.invalidateQueries({ queryKey: ["user-live-notifications"] });
    } catch (e) {
      console.warn("Mark all read err:", e);
    }
  };

  const handleNotificationClick = (item: HospitalNotificationItem) => {
    handleMarkAsRead(item.id);
    setIsOpen(false);
    navigate({ to: item.routeHref });
  };

  const getCategoryIcon = (category: string, severity: string) => {
    if (severity === "critical") return <AlertOctagon className="size-4 text-destructive shrink-0" />;
    switch (category) {
      case "lab_critical":
        return <AlertTriangle className="size-4 text-rose-500 shrink-0 animate-bounce" />;
      case "lab_completed":
        return <FlaskConical className="size-4 text-teal-500 shrink-0" />;
      case "stat_imaging":
      case "radiology_critical":
        return <Scan className="size-4 text-cyan-500 shrink-0" />;
      case "low_stock":
        return <Package className="size-4 text-rose-500 shrink-0" />;
      case "transfer":
        return <ArrowRightLeft className="size-4 text-amber-500 shrink-0" />;
      default:
        return <Activity className="size-4 text-teal-500 shrink-0" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Clinical Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-xs ${
                hasCriticalUnread
                  ? "bg-destructive animate-pulse"
                  : "bg-teal-600"
              }`}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[360px] sm:w-[400px] p-0 shadow-lg border-border/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-foreground">Clinical & Operations Alerts</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] font-mono h-4.5 px-1.5 font-bold">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh Notifications"
            >
              <RefreshCw className={`size-3 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
                onClick={handleMarkAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 border-b border-border/60 px-3 py-1.5 bg-card text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-md px-2 py-0.5 font-semibold transition-colors ${
              activeTab === "all"
                ? "bg-primary/10 text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("critical")}
            className={`rounded-md px-2 py-0.5 font-semibold transition-colors ${
              activeTab === "critical"
                ? "bg-destructive/10 text-destructive font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Critical 🚨
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("operations")}
            className={`rounded-md px-2 py-0.5 font-semibold transition-colors ${
              activeTab === "operations"
                ? "bg-muted text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Operations 📦
          </button>
        </div>

        {/* Notifications List */}
        <div className="max-h-[350px] overflow-y-auto divide-y divide-border/40 scrollbar-thin">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading hospital alerts...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <CheckCheck className="size-6 text-emerald-500 mx-auto opacity-70" />
              <p className="text-xs font-semibold text-foreground">All Clear</p>
              <p className="text-[11px] text-muted-foreground">No active alerts or panic flags at this time.</p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isItemRead = readIds.has(item.id) || item.isRead;
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`group relative flex items-start gap-3 p-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                    !isItemRead ? "bg-primary/5 font-medium" : "opacity-80"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {getCategoryIcon(item.category, item.severity)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs truncate ${!isItemRead ? "font-bold text-foreground" : "text-foreground"}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                  {!isItemRead && (
                    <span className="size-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/80 px-3 py-2 bg-muted/20 text-center">
          <Link
            to="/audit"
            onClick={() => setIsOpen(false)}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center justify-center gap-1"
          >
            <span>View Full Hospital Audit Log</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
