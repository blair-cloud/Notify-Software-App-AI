import React from 'react';
import { ShieldAlert, ArrowLeft, Building2, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccessDeniedProps {
  requiredRole: 'LANDLORD' | 'TENANT' | 'SYSTEM_ADMIN';
  attemptedSection: string;
  onGoToPermittedDashboard: () => void;
  onGoHome: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  requiredRole,
  attemptedSection,
  onGoToPermittedDashboard,
  onGoHome,
}) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F4F4F0] text-black font-sans py-12 px-4 flex flex-col justify-center items-center relative">
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(#000000 1.5px, transparent 1.5px), radial-gradient(#000000 1.5px, #F4F4F0 1.5px)',
          backgroundSize: '32px 32px',
          backgroundPosition: '0 0, 16px 16px',
        }}
      />

      <div className="w-full max-w-lg bg-white rounded-[24px] border-2 border-black shadow-[0.5px_0.5px_0_#000000] p-6 sm:p-8 z-10 relative">
        <div className="w-12 h-12 rounded-[14px] bg-red-500 text-white flex items-center justify-center border-2 border-black shadow-[0.5px_0.5px_0_#000000] mb-4">
          <ShieldAlert className="w-7 h-7 stroke-[2.5]" />
        </div>

        <div className="inline-block px-3 py-1 rounded-[10px] bg-red-100 text-red-800 text-xs font-black uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] mb-2">
          403 • Authorization Restricted
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-black uppercase tracking-tight mb-2">
          Access Denied
        </h1>

        <p className="text-sm font-medium text-slate-700 mb-6">
          You attempted to navigate to <strong>{attemptedSection}</strong>, which requires{' '}
          <strong className="text-black uppercase">{requiredRole}</strong> role permissions.
          {user && (
            <>
              {' '}Your active authenticated account has the role{' '}
              <strong className="text-[#331A6F] uppercase">{user.role}</strong> ({user.email}).
            </>
          )}
        </p>

        <div className="space-y-3">
          <button
            onClick={onGoToPermittedDashboard}
            className="w-full py-3 px-4 rounded-[14px] bg-[#331A6F] text-white font-black text-sm uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {user?.role === 'LANDLORD' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
            <span>Go to My {user?.role === 'LANDLORD' ? 'Landlord' : 'Tenant'} Dashboard</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onGoHome}
              className="py-2.5 px-3 rounded-[14px] bg-white hover:bg-slate-100 text-black font-extrabold text-xs uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Notify Home</span>
            </button>

            <button
              onClick={async () => {
                await logout();
                onGoHome();
              }}
              className="py-2.5 px-3 rounded-[14px] bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
