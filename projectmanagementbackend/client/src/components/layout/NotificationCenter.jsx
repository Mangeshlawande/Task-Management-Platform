import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  AtSign,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotificationStore } from '../../stores/notificationStore.js';
import { fromNow } from '../../lib/format.js';
import { Avatar, Badge, Button } from '../ui/index.js';

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  const unreadList = notifications.filter((n) => !n.read);
  const unreadCount = unreadList.length;

  const displayList = filter === 'unread' ? unreadList : notifications;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleItemClick = (item) => {
    markAsRead(item.id);
    setOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'due_today':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'mention':
        return <AtSign className="h-4 w-4 text-sky-500" />;
      case 'blocker':
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case 'assignment':
        return <ArrowRight className="h-4 w-4 text-primary" />;
      default:
        return <FolderOpen className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="View notifications"
        aria-expanded={open}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition hover:bg-muted hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary ${
          open ? 'border-primary ring-1 ring-primary' : ''
        }`}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in-50">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 z-50 w-84 sm:w-96 rounded-xl border border-border bg-card shadow-xl overflow-hidden dark:border-dark-border dark:bg-dark-card"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-dark-border">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground dark:text-dark-foreground">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    title="Mark all as read"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Mark all read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-1.5 dark:border-dark-border/60 text-xs">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-md px-2 py-1 font-medium transition ${
                  filter === 'all'
                    ? 'bg-background text-foreground shadow-2xs font-semibold dark:bg-dark-surface'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`rounded-md px-2 py-1 font-medium transition ${
                  filter === 'unread'
                    ? 'bg-background text-foreground shadow-2xs font-semibold dark:bg-dark-surface'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border/60 dark:divide-dark-border/60 scrollbar-thin">
              {displayList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm font-medium text-foreground dark:text-dark-foreground">
                    {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {filter === 'unread'
                      ? "You've caught up with all notifications."
                      : "Task assignments, mentions, and due dates will appear here."}
                  </p>
                </div>
              ) : (
                displayList.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition hover:bg-muted/50 dark:hover:bg-dark-muted/30 ${
                      !item.read ? 'bg-primary/5 dark:bg-primary/10' : ''
                    }`}
                  >
                    <div className="mt-0.5 rounded-lg border border-border bg-card p-1.5 shadow-2xs shrink-0 dark:border-dark-border dark:bg-dark-card">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-foreground dark:text-dark-foreground truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {fromNow(item.timestamp)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                      {item.projectName && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="rounded bg-muted/60 px-1.5 py-0.2 font-medium">
                            {item.projectName}
                          </span>
                        </div>
                      )}
                    </div>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 self-center" />
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-border bg-muted/20 px-4 py-2 text-center text-[11px] text-muted-foreground dark:border-dark-border">
                Click any notification to navigate directly to it
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
