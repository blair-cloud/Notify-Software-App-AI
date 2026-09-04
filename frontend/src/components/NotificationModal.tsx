import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Wrench,
  AlertCircle,
  FileText,
  CreditCard,
  MessageSquare,
  Clock,
  Shield,
  Smartphone,
  Mail,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Settings,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Notification } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification?: (id: string) => void;
  onSelectEntity?: (entityType: string, entityId: string) => void;
  onOpenPreferences?: () => void;
  onRunReminderCheck?: () => void;
  isProcessingReminders?: boolean;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onSelectEntity,
  onOpenPreferences,
  onRunReminderCheck,
  isProcessingReminders = false,
}) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'LEASE_EXPIRY' | 'PAYMENT' | 'MAINTENANCE' | 'COMPLAINT'>('ALL');

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read && n.status !== 'READ';
    if (filter === 'LEASE_EXPIRY') return n.category === 'LEASE_EXPIRY' || n.type?.startsWith('LEASE_EXPIRY') || n.entity_type === 'LEASE';
    if (filter === 'PAYMENT') return n.category === 'PAYMENT' || n.entity_type === 'PAYMENT' || n.entity_type === 'INVOICE';
    if (filter === 'MAINTENANCE') return n.entity_type === 'MAINTENANCE' || n.category === 'MAINTENANCE';
    if (filter === 'COMPLAINT') return n.entity_type === 'COMPLAINT' || n.category === 'COMPLAINT';
    return true;
  });

  const getEntityIcon = (type?: string, cat?: string) => {
    if (cat === 'LEASE_EXPIRY' || type?.startsWith('LEASE_EXPIRY') || type === 'LEASE') {
      return <Calendar className="w-4 h-4 text-purple-600" />;
    }
    if (type === 'MAINTENANCE' || cat === 'MAINTENANCE') {
      return <Wrench className="w-4 h-4 text-amber-600" />;
    }
    if (type === 'COMPLAINT' || cat === 'COMPLAINT') {
      return <AlertCircle className="w-4 h-4 text-rose-600" />;
    }
    if (type === 'INVOICE' || cat === 'INVOICE') {
      return <FileText className="w-4 h-4 text-indigo-600" />;
    }
    if (type === 'PAYMENT' || cat === 'PAYMENT') {
      return <CreditCard className="w-4 h-4 text-emerald-600" />;
    }
    return <Bell className="w-4 h-4 text-[#331A6F]" />;
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-2.5 h-2.5" /> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            LOW
          </span>
        );
      default:
        return null;
    }
  };

  const getChannelBadge = (channel?: string) => {
    switch (channel?.toUpperCase()) {
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Smartphone className="w-2.5 h-2.5" /> SMS
          </span>
        );
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
          </span>
        );
      case 'EMAIL':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Mail className="w-2.5 h-2.5" /> Email
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Shield className="w-2.5 h-2.5" /> In-App
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-poppins"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#331A6F] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-300/30">
              <Bell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight font-poppins">{t.notificationCenter}</h3>
              <p className="text-xs text-purple-200 font-medium">Automated Lease Expirations & System Alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenPreferences && (
              <button
                onClick={onOpenPreferences}
                title="Notification Preferences"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20 flex items-center gap-1.5 text-xs font-semibold px-2.5"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Preferences</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action & Status Toolbar */}
        <div className="px-6 py-2.5 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-purple-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#331A6F]" />
            <span>Automated 30d, 14d, 7d, 3d, 2d, 1d & today milestones</span>
          </div>
          {onRunReminderCheck && (
            <button
              onClick={onRunReminderCheck}
              disabled={isProcessingReminders}
              className="px-3 py-1 bg-[#331A6F] text-white text-xs font-bold rounded-lg hover:bg-[#251352] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Clock className="w-3 h-3" />
              <span>{isProcessingReminders ? 'Checking Leases...' : 'Run Reminder Check'}</span>
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-[#331A6F] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-[#331A6F] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t.unread} ({notifications.filter((n) => !n.is_read && n.status !== 'READ').length})
            </button>
            <button
              onClick={() => setFilter('LEASE_EXPIRY')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === 'LEASE_EXPIRY'
                  ? 'bg-[#331A6F] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Lease Expirations
            </button>
            <button
              onClick={() => setFilter('PAYMENT')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === 'PAYMENT'
                  ? 'bg-[#331A6F] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setFilter('MAINTENANCE')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === 'MAINTENANCE'
                  ? 'bg-[#331A6F] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t.maintenance}
            </button>
            <button
              onClick={() => setFilter('COMPLAINT')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                filter === 'COMPLAINT'
                  ? 'bg-[#331A6F] text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t.complaints}
            </button>
          </div>

          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1 text-xs font-bold text-[#331A6F] hover:underline cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{t.markAllAsRead}</span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto divide-y divide-slate-100 p-3 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">{t.noNotifications}</p>
              <p className="text-xs text-slate-400 mt-1">You're completely up to date.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const isUnread = !item.is_read && item.status !== 'READ';
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl transition-all flex gap-3.5 items-start mb-2 ${
                    isUnread
                      ? 'bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200 shadow-sm'
                      : 'hover:bg-slate-50 border border-slate-100 bg-white'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isUnread ? 'bg-purple-100 border-purple-200' : 'bg-slate-100 border-slate-200'
                    }`}
                  >
                    {getEntityIcon(item.entity_type, item.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 leading-tight">
                          {item.title || item.subject || 'Notification'}
                        </span>
                        {getPriorityBadge(item.priority)}
                        {getChannelBadge(item.channel)}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isUnread && (
                          <button
                            onClick={() => onMarkAsRead(item.id)}
                            title="Mark as read"
                            className="p-1 text-purple-700 hover:text-purple-900 text-xs font-semibold cursor-pointer"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteNotification && (
                          <button
                            onClick={() => onDeleteNotification(item.id)}
                            title="Dismiss notification"
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed break-words mb-2.5">
                      {item.body || item.message}
                    </p>

                    {/* Action buttons if available */}
                    {item.action_label && (
                      <div className="mb-2">
                        <button
                          onClick={() => {
                            if (isUnread) onMarkAsRead(item.id);
                            if (item.entity_type && item.entity_id && onSelectEntity) {
                              onSelectEntity(item.entity_type, item.entity_id);
                            }
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#331A6F] hover:bg-[#251352] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                        >
                          <span>{item.action_label}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {item.recipient_phone && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          To: {item.recipient_phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {notifications.filter((n) => !n.is_read && n.status !== 'READ').length} unread alerts
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

