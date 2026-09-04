import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ValueProposition } from './components/ValueProposition';
import { Footer } from './components/Footer';
import { ManageUnitsPage } from './pages/ManageUnitsPage';
import { CollectRentPage } from './pages/CollectRentPage';
import { StayNotifiedPage } from './pages/StayNotifiedPage';
import { SupportPage } from './pages/SupportPage';
import { PricingPage } from './pages/PricingPage';
import { AuthPage, AuthMode, UserRoleType } from './pages/AuthPage';
import { AccessDenied } from './components/AccessDenied';

// Phase 1 Dashboard & Portal Pages
import { LandlordDashboardPage } from './pages/LandlordDashboardPage';
import { TenantDashboardPage } from './pages/TenantDashboardPage';
import { SystemAdminDashboardPage } from './pages/SystemAdminDashboardPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';

export type ActivePage =
  | 'home'
  | 'auth'
  | 'landlord-dashboard'
  | 'tenant-dashboard'
  | 'admin-dashboard'
  | 'manage-units'
  | 'collect-rent'
  | 'stay-notified'
  | 'support'
  | 'pricing'
  | 'accept-invitation';

function AppContent() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState<ActivePage>('home');
  const [authMode, setAuthMode] = useState<AuthMode>('SIGNUP');
  const [authInitialRole, setAuthInitialRole] = useState<UserRoleType>('LANDLORD');
  const [unauthorizedNotice, setUnauthorizedNotice] = useState<string | null>(null);
  const [accessDeniedState, setAccessDeniedState] = useState<{
    requiredRole: 'LANDLORD' | 'TENANT' | 'SYSTEM_ADMIN';
    attemptedSection: string;
  } | null>(null);

  // Initialize and check path
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();

    if (path === '/accept-invitation' || window.location.search.includes('token=')) {
      setCurrentPage('accept-invitation');
      return;
    }

    if (path === '/landlord' || path === '/dashboard') {
      if (!isAuthenticated && !authLoading) {
        setUnauthorizedNotice('Please sign in to access the Landlord Dashboard.');
        setAuthMode('LOGIN');
        setCurrentPage('auth');
      } else if (user) {
        if (user.role === 'LANDLORD' || user.role === 'SYSTEM_ADMIN') {
          setCurrentPage('landlord-dashboard');
        } else {
          setAccessDeniedState({
            requiredRole: 'LANDLORD',
            attemptedSection: 'Landlord Dashboard',
          });
        }
      }
      return;
    }

    if (path === '/tenant') {
      if (!isAuthenticated && !authLoading) {
        setUnauthorizedNotice('Please sign in to access the Tenant Portal.');
        setAuthMode('LOGIN');
        setCurrentPage('auth');
      } else if (user) {
        if (user.role === 'TENANT' || user.role === 'SYSTEM_ADMIN') {
          setCurrentPage('tenant-dashboard');
        } else {
          setAccessDeniedState({
            requiredRole: 'TENANT',
            attemptedSection: 'Tenant Portal',
          });
        }
      }
      return;
    }

    if (path === '/login') {
      setAuthMode('LOGIN');
      setCurrentPage('auth');
      return;
    }

    if (path === '/get-started' || path === '/signup' || path === '/auth') {
      setAuthMode('SIGNUP');
      setCurrentPage('auth');
      return;
    }
  }, [isAuthenticated, user, authLoading]);

  // Handle opening auth from buttons (Navbar CTA, Hero, etc.)
  const handleOpenAuth = (source?: string, mode: AuthMode = 'SIGNUP', role: UserRoleType = 'LANDLORD') => {
    setUnauthorizedNotice(null);
    setAccessDeniedState(null);
    setAuthMode(mode);
    setAuthInitialRole(role);
    setCurrentPage('auth');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync document.title for brand recognition SEO across all views
  useEffect(() => {
    const titles: Record<ActivePage, string> = {
      'home': 'Notify App | Rental & Property Management Software Rwanda ',
      'pricing': 'Notify Pricing & Plans — Rental Management Software Kigali',
      'support': 'Notify Support & Help Center — Kigali, Rwanda',
      'manage-units': 'Notify — Units & Tenants Property Management',
      'collect-rent': 'Notify — MoMo & Bank Rent Collection Kigali',
      'stay-notified': 'Notify — Automated Rent Reminders & Alerts',
      'auth': 'Sign In to Notify — Rental & Property Management Platform',
      'landlord-dashboard': 'Notify Landlord Dashboard — Mall & Property OS',
      'tenant-dashboard': 'Notify Tenant Portal — Pay Rent & Manage Leases',
      'admin-dashboard': 'Notify System Admin Portal',
      'accept-invitation': 'Accept Tenant Invitation — Notify Rwanda',
    };
    document.title = titles[currentPage] || 'Notify App | Rental & Property Management Software Rwanda ';
  }, [currentPage]);

  const handleNavigate = (page: ActivePage) => {
    setAccessDeniedState(null);
    setUnauthorizedNotice(null);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setAccessDeniedState(null);
    setUnauthorizedNotice(null);
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Direct dashboard navigation (handles role protection)
  const handleGoToDashboard = () => {
    setAccessDeniedState(null);
    setUnauthorizedNotice(null);

    if (!user) {
      setUnauthorizedNotice('Please sign in to access your dashboard.');
      setAuthMode('LOGIN');
      setCurrentPage('auth');
      return;
    }

    if (user.role === 'LANDLORD') {
      setCurrentPage('landlord-dashboard');
    } else if (user.role === 'TENANT') {
      setCurrentPage('tenant-dashboard');
    } else if (user.role === 'SYSTEM_ADMIN') {
      setCurrentPage('admin-dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Protected route enforcement for Landlord section
  const handleAccessLandlordSection = () => {
    if (!user) {
      setUnauthorizedNotice('Please sign in with a Landlord account to access the Landlord Dashboard.');
      setAuthMode('LOGIN');
      setCurrentPage('auth');
      return;
    }
    if (user.role !== 'LANDLORD' && user.role !== 'SYSTEM_ADMIN') {
      setAccessDeniedState({
        requiredRole: 'LANDLORD',
        attemptedSection: 'Landlord Dashboard',
      });
      return;
    }
    setCurrentPage('landlord-dashboard');
  };

  // Protected route enforcement for Tenant section
  const handleAccessTenantSection = () => {
    if (!user) {
      setUnauthorizedNotice('Please sign in with a Tenant account to access the Tenant Portal.');
      setAuthMode('LOGIN');
      setCurrentPage('auth');
      return;
    }
    if (user.role !== 'TENANT' && user.role !== 'SYSTEM_ADMIN') {
      setAccessDeniedState({
        requiredRole: 'TENANT',
        attemptedSection: 'Tenant Portal',
      });
      return;
    }
    setCurrentPage('tenant-dashboard');
  };

  const handleAuthSuccess = (role: string) => {
    setUnauthorizedNotice(null);
    setAccessDeniedState(null);
    if (role === 'LANDLORD') {
      setCurrentPage('landlord-dashboard');
    } else if (role === 'TENANT') {
      setCurrentPage('tenant-dashboard');
    } else if (role === 'SYSTEM_ADMIN') {
      setCurrentPage('admin-dashboard');
    } else {
      setCurrentPage('home');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    await logout();
    setAccessDeniedState(null);
    setUnauthorizedNotice(null);
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreNotify = () => {
    const featuresElement = document.getElementById('features');
    if (featuresElement) {
      featuresElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ---------------- Render Main Content ----------------
  const renderMainContent = () => {
    // 1. Access Denied (Role Mismatch)
    if (accessDeniedState) {
      return (
        <AccessDenied
          requiredRole={accessDeniedState.requiredRole}
          attemptedSection={accessDeniedState.attemptedSection}
          onGoToPermittedDashboard={handleGoToDashboard}
          onGoHome={handleGoHome}
        />
      );
    }

    // 2. Invitation Acceptance Page
    if (currentPage === 'accept-invitation') {
      return (
        <AcceptInvitationPage
          onGoToTenantHome={handleGoToDashboard}
          onGoToLanding={handleGoHome}
        />
      );
    }

    // 3. Dedicated Authentication Page (Neo-Brutalism Login / Sign Up / Forgot Password)
    if (currentPage === 'auth') {
      return (
        <AuthPage
          initialMode={authMode}
          initialRole={authInitialRole}
          unauthorizedNotice={unauthorizedNotice}
          onGoHome={handleGoHome}
          onAuthSuccess={handleAuthSuccess}
        />
      );
    }

    // 4. Protected Landlord Dashboard
    if (currentPage === 'landlord-dashboard') {
      if (!user) {
        return (
          <AuthPage
            initialMode="LOGIN"
            initialRole="LANDLORD"
            unauthorizedNotice="Authentication required: Please sign in to access the Landlord Dashboard."
            onGoHome={handleGoHome}
            onAuthSuccess={handleAuthSuccess}
          />
        );
      }
      if (user.role !== 'LANDLORD' && user.role !== 'SYSTEM_ADMIN') {
        return (
          <AccessDenied
            requiredRole="LANDLORD"
            attemptedSection="Landlord Dashboard"
            onGoToPermittedDashboard={handleGoToDashboard}
            onGoHome={handleGoHome}
          />
        );
      }
      return <LandlordDashboardPage onLogout={handleLogout} />;
    }

    // 5. Protected Tenant Portal
    if (currentPage === 'tenant-dashboard') {
      if (!user) {
        return (
          <AuthPage
            initialMode="LOGIN"
            initialRole="TENANT"
            unauthorizedNotice="Authentication required: Please sign in to access the Tenant Portal."
            onGoHome={handleGoHome}
            onAuthSuccess={handleAuthSuccess}
          />
        );
      }
      if (user.role !== 'TENANT' && user.role !== 'SYSTEM_ADMIN') {
        return (
          <AccessDenied
            requiredRole="TENANT"
            attemptedSection="Tenant Portal"
            onGoToPermittedDashboard={handleGoToDashboard}
            onGoHome={handleGoHome}
          />
        );
      }
      return <TenantDashboardPage onLogout={handleLogout} />;
    }

    // 6. Protected Admin Dashboard
    if (currentPage === 'admin-dashboard') {
      if (!user || user.role !== 'SYSTEM_ADMIN') {
        return (
          <AccessDenied
            requiredRole="SYSTEM_ADMIN"
            attemptedSection="System Administration"
            onGoToPermittedDashboard={handleGoToDashboard}
            onGoHome={handleGoHome}
          />
        );
      }
      return <SystemAdminDashboardPage onLogout={handleLogout} />;
    }

    // 7. Public Informational Pages & Landing
    return (
      <div className="min-h-screen bg-notify-grid text-black font-sans selection:bg-[#331A6F] selection:text-white flex flex-col justify-between">
        <div className="flex-1">
          {currentPage === 'manage-units' && (
            <ManageUnitsPage
              onBack={handleGoHome}
              onOpenGetStarted={() => handleOpenAuth('Manage Units CTA', 'SIGNUP', 'LANDLORD')}
            />
          )}

          {currentPage === 'collect-rent' && (
            <CollectRentPage
              onBack={handleGoHome}
              onOpenGetStarted={() => handleOpenAuth('Collect Rent CTA', 'SIGNUP', 'LANDLORD')}
            />
          )}

          {currentPage === 'stay-notified' && (
            <StayNotifiedPage
              onBack={handleGoHome}
              onOpenGetStarted={() => handleOpenAuth('Stay Notified CTA', 'SIGNUP', 'LANDLORD')}
            />
          )}

          {currentPage === 'support' && (
            <SupportPage
              onBack={handleGoHome}
              onOpenGetStarted={() => handleOpenAuth('Support CTA', 'SIGNUP', 'LANDLORD')}
            />
          )}

          {currentPage === 'pricing' && (
            <PricingPage
              onBack={handleGoHome}
              onOpenGetStarted={() => handleOpenAuth('Pricing CTA', 'SIGNUP', 'LANDLORD')}
            />
          )}

          {currentPage === 'home' && (
            <>
              <Navbar
                onOpenGetStarted={(source, mode) => handleOpenAuth(source, mode || 'SIGNUP', 'LANDLORD')}
                onOpenSupport={() => handleNavigate('support')}
                onOpenPricing={() => handleNavigate('pricing')}
                onGoHome={handleGoHome}
                onGoToDashboard={handleGoToDashboard}
              />

              <main>
                <Hero
                  onOpenGetStarted={() => handleOpenAuth('Hero CTA', 'SIGNUP', 'LANDLORD')}
                  onExploreNotify={handleExploreNotify}
                />

                <ValueProposition
                  onSelectFeature={(featureKey) => {
                    if (
                      featureKey === 'manage-units' ||
                      featureKey === 'collect-rent' ||
                      featureKey === 'stay-notified'
                    ) {
                      handleNavigate(featureKey);
                    } else {
                      handleNavigate('manage-units');
                    }
                  }}
                />
              </main>
            </>
          )}
        </div>

        <Footer />
      </div>
    );
  };

  return <>{renderMainContent()}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}
