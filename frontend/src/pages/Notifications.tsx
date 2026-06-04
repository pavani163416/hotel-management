import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CheckCircle, CheckSquare, CalendarCheck, CreditCard, AlertCircle, Inbox, UserCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useBooking } from "@/context/BookingContext";
import { AuthModal } from "@/components/AuthModal";
import socket from "@/services/socket";
import { getNotifications, markNotificationRead } from "@/services/api";
import { toast } from "sonner";

type NotificationItem = {
  _id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useBooking();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const fetchNotifs = () => {
    if (!user?.email) return;
    setLoading(true);
    const scope = { role: "customer", userId: user.email };
    getNotifications(scope)
      .then((res) => {
        setNotifications(res?.data || []);
      })
      .catch((err) => {
        console.error("Failed to fetch notifications:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!user?.email) {
      setNotifications([]);
      return;
    }

    fetchNotifs();

    const scope = { role: "customer", userId: user.email };
    socket.emit("registerNotifications", scope);

    const onNotification = (data: NotificationItem) => {
      setNotifications((prev) => [data, ...prev.filter((n) => n._id !== data._id)].slice(0, 100));
    };

    socket.on("notification", onNotification);

    return () => {
      socket.off("notification", onNotification);
    };
  }, [user?.email]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      toast.success("Notification marked as read");
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n._id);
    if (unreadIds.length === 0) return;

    try {
      await Promise.all(unreadIds.map((id) => markNotificationRead(id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getNotifIcon = (message: string, type: string) => {
    const text = message.toLowerCase();
    if (text.includes("confirm") || text.includes("success")) {
      return <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
    }
    if (text.includes("fail") || text.includes("cancel")) {
      return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
    }
    if (type === "booking") {
      return <CalendarCheck className="w-5 h-5 text-accent shrink-0" />;
    }
    return <Bell className="w-5 h-5 text-muted-foreground shrink-0" />;
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  if (!user) {
    return (
      <Layout>
        <div className="container py-20 max-w-xl text-center flex flex-col items-center">
          <div className="grid place-items-center w-24 h-24 rounded-full bg-accent/10 text-accent mb-6">
            <Bell className="w-10 h-10 animate-bounce" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-4">Notifications</h1>
          <p className="text-muted-foreground mb-8">
            Please sign in to access your notification center and view active stay alerts, payment status updates, and confirmations.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => openAuth("signin")}
              className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-base"
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth("signup")}
              className="px-6 py-2.5 text-sm font-semibold rounded-lg border border-border hover:bg-accent/5 transition-base"
            >
              Create Account
            </button>
          </div>
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode={authMode} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-10 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Bell className="w-8 h-8 text-accent shrink-0" />
              Notifications
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Stay updated on your booking status changes and payment gateway notifications.
            </p>
          </div>
          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-base"
            >
              <CheckSquare className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-base ${
              filter === "all" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/5"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-base ${
              filter === "unread" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/5"
            }`}
          >
            Unread ({notifications.filter((n) => !n.isRead).length})
          </button>
        </div>

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-16 px-6 text-center max-w-md mx-auto flex flex-col items-center">
            <div className="grid place-items-center w-16 h-16 rounded-full bg-accent/5 text-accent/50 mb-4">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-lg text-primary">All caught up!</h3>
            <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
              {filter === "unread" ? "You have no unread notifications at the moment." : "You haven't received any notifications yet."}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {filteredNotifications.map((n) => (
              <div
                key={n._id}
                className={`flex items-start gap-4 p-5 transition-base hover:bg-accent/5 ${
                  !n.isRead ? "bg-accent/5 border-l-2 border-accent" : ""
                }`}
              >
                {getNotifIcon(n.message, n.type)}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${!n.isRead ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    {n.message}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded">
                      {n.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </div>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => handleMarkRead(n._id)}
                    className="text-xs font-semibold text-accent hover:underline shrink-0 pl-2"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NotificationsPage;
