import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  Bell,
  CheckCircle,
  AlertCircle,
  Menu,
  X,
  CreditCard,
  Building,
  UserPlus,
  FileCheck2,
  TrendingDown,
  Wrench,
  Radio,
} from 'lucide-react';
import { adminService, SearchResultItem, AdminTabKey } from '../../services/adminService';

interface AdminHeaderProps {
  onNavigateTab?: (tab: AdminTabKey, entityId?: string) => void;
  onNavigate?: (tab: AdminTabKey, entityId?: string) => void;
  onOpenQuickAction?: (actionType: string) => void;
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  onOpenMobileMenu?: () => void;
  activeTabTitle?: string;
  user?: any;
  onRefresh?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onNavigateTab,
  onNavigate,
  onOpenQuickAction,
  mobileMenuOpen = false,
  onToggleMobileMenu,
  onOpenMobileMenu,
  activeTabTitle = 'Platform Overview',
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);

  const navigateTo = (tab: AdminTabKey, entityId?: string) => {
    if (onNavigateTab) onNavigateTab(tab, entityId);
    else if (onNavigate) onNavigate(tab, entityId);
  };

  const handleToggleMenu = () => {
    if (onToggleMobileMenu) onToggleMobileMenu();
    else if (onOpenMobileMenu) onOpenMobileMenu();
  };

  const handleQuickAction = (action: string) => {
    if (onOpenQuickAction) {
      onOpenQuickAction(action);
    } else {
      // Default navigation mapping
      if (action === 'create_user') navigateTo('users_roles');
      else if (action === 'create_property') navigateTo('properties');
      else if (action === 'create_lease') navigateTo('leases');
      else if (action === 'record_payment') navigateTo('payments');
      else if (action === 'record_expense') navigateTo('expenses');
      else if (action === 'broadcast_notification') navigateTo('notifications');
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const res = adminService.searchEverything(searchQuery);
      setSearchResults(res);
      setSearchOpen(true);
    } else {
      setSearchResults([]);
      setSearchOpen(false);
    }
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
      if (quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
        setQuickMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (item: SearchResultItem) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigateTo(item.targetTab as AdminTabKey, item.id);
  };

  return (
    <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Mobile Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleMenu}
          className="md:hidden p-2 rounded-xl border-2 border-black bg-slate-100 text-slate-800 shadow-[0.5px_0.5px_0_#000] cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:block">
            Administration Portal
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{activeTabTitle}</span>
          </h2>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-xl relative" ref={searchContainerRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Global Admin Search (Landlords, Tenants, Units, Leases, Invoices, Payments, Docs...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length > 0) setSearchOpen(true);
            }}
            className="w-full pl-10 pr-10 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border-2 border-slate-300 focus:border-[#331A6F] rounded-xl outline-none transition-all font-medium placeholder:text-slate-400 shadow-[0.5px_0.5px_0_#000]"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live Search Results Dropdown */}
        {searchOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] max-h-96 overflow-y-auto z-50 p-2 divide-y divide-slate-100">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 font-medium">
                No matching records found for "{searchQuery}"
              </div>
            ) : (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Search Results ({searchResults.length})
                </div>
                {searchResults.map((item) => (
                  <button
                    key={`${item.category}-${item.id}`}
                    onClick={() => handleSelectResult(item)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-purple-50 transition-colors flex items-start justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-[#331A6F] text-white border border-black">
                          {item.category}
                        </span>
                        {item.status && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            {item.status}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-900 truncate group-hover:text-[#331A6F]">
                          {item.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-medium">{item.subtitle}</div>
                    </div>
                    <span className="text-[10px] text-[#331A6F] font-extrabold shrink-0 group-hover:underline">
                      View →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Quick Actions & Live Status */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Live System Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          <span>Live Sync</span>
        </div>

        {/* Quick Action Dropdown */}
        <div className="relative" ref={quickMenuRef}>
          <button
            onClick={() => setQuickMenuOpen(!quickMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#331A6F] text-white text-xs font-extrabold rounded-xl border-2 border-black shadow-[0.5px_0.5px_0_#000] hover:shadow-[0.5px_0.5px_0_#000] hover:-translate-y-0.5 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Admin Action</span>
          </button>

          {quickMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border-2 border-black shadow-[0.5px_0.5px_0_#000] py-2 z-50 space-y-1">
              <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Quick Platform Operations
              </div>
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  handleQuickAction('create_user');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-[#331A6F] text-left cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-purple-600" />
                <span>Create User / Assign Role</span>
              </button>
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  handleQuickAction('create_property');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-[#331A6F] text-left cursor-pointer"
              >
                <Building className="w-4 h-4 text-blue-600" />
                <span>Register Property</span>
              </button>
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  handleQuickAction('create_lease');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-[#331A6F] text-left cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>Create & Upload Lease</span>
              </button>
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  handleQuickAction('record_payment');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-[#331A6F] text-left cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>Verify Payment Slip</span>
              </button>
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  handleQuickAction('record_expense');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-[#331A6F] text-left cursor-pointer"
              >
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <span>Record Expense</span>
              </button>
              <button
                onClick={() => {
                  setQuickMenuOpen(false);
                  handleQuickAction('broadcast_notification');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-[#331A6F] text-left cursor-pointer"
              >
                <Bell className="w-4 h-4 text-indigo-600" />
                <span>Broadcast System Notice</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
