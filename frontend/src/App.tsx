import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
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
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { EmailVerificationBanner } from './components/EmailVerificationBanner';
import { TriangularPreloader } from './components/TriangularPreloader';

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
  | 'accept-invitation'
  | 'verify-email'
  | 'reset-password';

/** Every page now has its own URL. */
export const PAGE_PATHS: Record<ActivePage, string> = {
  'home': '/',
  'auth': '/login',
  'landlord-dashboard': '/landlord',
  'tenant-dashboard': '/tenant',
  'admin-dashboard': '/admin',
  'manage-units': '/manage-units',
  'collect-rent': '/collect-rent',
  'stay-notified': '/stay-notified',
  'support': '/support',
  'pricing': '/pricing',
  'accept-invitation': '/accept-invitation',
  'verify-email': '/verify-email',
  'reset-password': '/reset-password',
};

const PAGE_TITLES: Record<string, string> = {
  '/': 'Notify App | Rental & Property Management Software Rwanda ',
  '/pricing': 'Notify Pricing & Plans — Rental Management Software Kigali',
  '/support': 'Notify Support & Help Center — Kigali, Rwanda',
  '/manage-units': 'Notify — Units & Tenants Property Management',
  '/collect-rent': 'Notify — MoMo & Bank Rent Collection Kigali',
  '/stay-notified': 'Notify — Automated Rent Reminders & Alerts',
  '/login': 'Sign In to Notify — Rental & Property Management Platform',
  '/get-started': 'Sign In to Notify — Rental & Property Management Platform',
  '/landlord': 'Notify Landlord Dashboard — Mall & Property OS',
  '/tenant': 'Notify Tenant Portal — Pay Rent & Manage Leases',
  '/admin': 'Notify System Admin Portal',
  '/accept-invitation': 'Accept Tenant Invitation — Notify Rwanda',
  '/verify-email': 'Confirm Your Email — Notify',
  '/forgot-password': 'Reset Your Password — Notify',
  '/reset-password': 'Choose A New Password — Notify',
};

/** Where a signed-in user's dashboard lives. */
const dashboardPathForRole = (role?: string): string => {
  if (role === 'LANDLORD') return '/landlord';
  if (role === 'TENANT') return '/tenant';
  if (role === 'SYSTEM_ADMIN') return '/admin';
  return '/';
};

interface AuthRouteState {
  mode?: AuthMode;
  role?: UserRoleType;
  notice?: string;
}

/** Keeps the document title in step with the URL. */
function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const root = `/${pathname.split('/')[1] || ''}`;
    document.title =
      PAGE_TITLES[pathname] ||
      PAGE_TITLES[root] ||
      'Notify App | Rental & Property Management Software Rwanda ';
  }, [pathname]);
}

/**
 * Shared navigation helpers. These keep the exact behaviour the pages already
 * relied on (scroll to top, role-aware redirects) while changing the URL.
 */
function useAppNavigation() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const go = (path: string, state?: AuthRouteState, replace = false) => {
    navigate(path, { state, replace });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    goHome: () => go('/'),
    goToPage: (path: string) => go(path),
    openAuth: (_source?: string, mode: AuthMode = 'SIGNUP', role: UserRoleType = 'LANDLORD', notice?: string) =>
      go(mode === 'LOGIN' ? '/login' : '/get-started', { mode, role, notice }),
    goToDashboard: () => {
      if (!user) {
        go('/login', { mode: 'LOGIN', notice: 'Please sign in to access your dashboard.' });
        return;
      }
      go(dashboardPathForRole(user.role));
    },
  };
}

/**
 * Guards a dashboard route: unauthenticated users get the sign-in page, and a
 * signed-in user with the wrong role gets the existing Access Denied screen.
 * Identical rules to the previous state-based checks.
 */
function ProtectedRoute({
  allow,
  sectionName,
  requiredRole,
  children,
}: {
  allow: string[];
  sectionName: string;
  requiredRole: 'LANDLORD' | 'TENANT' | 'SYSTEM_ADMIN';
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const nav = useAppNavigation();

  // Wait for the session to restore before deciding - otherwise a refresh on a
  // dashboard URL would bounce the user to sign-in every time.
  if (isLoading) {
    return <TriangularPreloader />;
  }

  if (!user) {
    return (
      <AuthPage
        initialMode="LOGIN"
        initialRole={requiredRole === 'TENANT' ? 'TENANT' : 'LANDLORD'}
        unauthorizedNotice={`Authentication required: Please sign in to access the ${sectionName}.`}
        onGoHome={nav.goHome}
        onAuthSuccess={(role) => nav.goToPage(dashboardPathForRole(role))}
      />
    );
  }

  if (!allow.includes(user.role)) {
    return (
      <AccessDenied
        requiredRole={requiredRole}
        attemptedSection={sectionName}
        onGoToPermittedDashboard={nav.goToDashboard}
        onGoHome={nav.goHome}
      />
    );
  }

  return (
    <>
      <EmailVerificationBanner />
      {children}
    </>
  );
}

/** The public marketing shell (landing page and the informational pages). */
function PublicLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-notify-grid text-black font-roboto selection:bg-[#331A6F] selection:text-white flex flex-col justify-between">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

function HomePage() {
  const nav = useAppNavigation();
  return (
    <PublicLayout>
      <Navbar
        onOpenGetStarted={(source, mode) => nav.openAuth(source, mode || 'SIGNUP', 'LANDLORD')}
        onOpenSupport={() => nav.goToPage('/support')}
        onOpenPricing={() => nav.goToPage('/pricing')}
        onGoHome={nav.goHome}
        onGoToDashboard={nav.goToDashboard}
      />
      <main>
        <Hero
          onOpenGetStarted={() => nav.openAuth('Hero CTA', 'SIGNUP', 'LANDLORD')}
          onExploreNotify={() => {
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        <ValueProposition
          onSelectFeature={(featureKey) => {
            const known = ['manage-units', 'collect-rent', 'stay-notified'];
            nav.goToPage(`/${known.includes(featureKey) ? featureKey : 'manage-units'}`);
          }}
        />
      </main>
    </PublicLayout>
  );
}

/** One of the informational marketing pages — same Navbar as the home landing. */
function InfoPage({ Page, ctaLabel }: { Page: any; ctaLabel: string }) {
  const nav = useAppNavigation();
  return (
    <PublicLayout>
      <Navbar
        onOpenGetStarted={(source, mode) => nav.openAuth(source || ctaLabel, mode || 'SIGNUP', 'LANDLORD')}
        onOpenSupport={() => nav.goToPage('/support')}
        onOpenPricing={() => nav.goToPage('/pricing')}
        onGoHome={nav.goHome}
        onGoToDashboard={nav.goToDashboard}
      />
      <Page onBack={nav.goHome} onOpenGetStarted={() => nav.openAuth(ctaLabel, 'SIGNUP', 'LANDLORD')} />
    </PublicLayout>
  );
}

/** Sign in / sign up. The mode comes from the path, with optional route state. */
function AuthRoute({ mode }: { mode: AuthMode }) {
  const nav = useAppNavigation();
  const location = useLocation();
  const state = (location.state || {}) as AuthRouteState;

  return (
    <AuthPage
      initialMode={state.mode || mode}
      initialRole={state.role || 'LANDLORD'}
      unauthorizedNotice={state.notice || null}
      onGoHome={nav.goHome}
      onAuthSuccess={(role) => nav.goToPage(dashboardPathForRole(role))}
    />
  );
}

function AppRoutes() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  useDocumentTitle();

  // Invitation links have historically arrived with ?token= on any path. The
  // confirmation and password-reset emails also carry ?token=, so those paths
  // are excluded - otherwise following a reset link lands on the invitation
  // page instead.
  useEffect(() => {
    const ownsItsToken =
      location.pathname === '/accept-invitation' ||
      location.pathname === '/verify-email' ||
      location.pathname === '/reset-password';

    if (!ownsItsToken && new URLSearchParams(location.search).has('token')) {
      navigate(`/accept-invitation${location.search}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      {/* Public informational pages */}
      <Route path="/manage-units" element={<InfoPage Page={ManageUnitsPage} ctaLabel="Manage Units CTA" />} />
      <Route path="/collect-rent" element={<InfoPage Page={CollectRentPage} ctaLabel="Collect Rent CTA" />} />
      <Route path="/stay-notified" element={<InfoPage Page={StayNotifiedPage} ctaLabel="Stay Notified CTA" />} />
      <Route path="/support" element={<InfoPage Page={SupportPage} ctaLabel="Support CTA" />} />
      <Route path="/pricing" element={<InfoPage Page={PricingPage} ctaLabel="Pricing CTA" />} />

      {/* Authentication */}
      <Route path="/login" element={<AuthRoute mode="LOGIN" />} />
      <Route path="/get-started" element={<AuthRoute mode="SIGNUP" />} />
      <Route path="/signup" element={<Navigate to="/get-started" replace />} />
      <Route path="/auth" element={<Navigate to="/get-started" replace />} />

      <Route path="/accept-invitation" element={<AcceptInvitationRoute />} />

      {/* Links from the confirmation and password-reset emails */}
      <Route path="/verify-email" element={<VerifyEmailRoute />} />
      <Route path="/forgot-password" element={<AuthRoute mode="FORGOT_PASSWORD" />} />
      <Route path="/reset-password" element={<ResetPasswordRoute />} />

      {/* Landlord: /landlord and /landlord/<section> */}
      <Route
        path="/landlord/:tab?"
        element={
          <ProtectedRoute allow={['LANDLORD', 'SYSTEM_ADMIN']} requiredRole="LANDLORD" sectionName="Landlord Dashboard">
            <LandlordDashboardPage onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Tenant: /tenant and /tenant/<section> */}
      <Route
        path="/tenant/:tab?"
        element={
          <ProtectedRoute allow={['TENANT', 'SYSTEM_ADMIN']} requiredRole="TENANT" sectionName="Tenant Portal">
            <TenantDashboardPage onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* System admin: /admin and /admin/<section> */}
      <Route
        path="/admin/:tab?"
        element={
          <ProtectedRoute allow={['SYSTEM_ADMIN']} requiredRole="SYSTEM_ADMIN" sectionName="System Administration">
            <SystemAdminDashboardPage onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />

      {/* Legacy entry point kept working */}
      <Route path="/dashboard" element={<Navigate to={dashboardPathForRole(user?.role)} replace />} />

      {/* Unknown URL: back to the landing page rather than a blank screen */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** /verify-email - Supabase confirms the link itself; this page just reports the outcome. */
function VerifyEmailRoute() {
  const nav = useAppNavigation();
  return (
    <VerifyEmailPage
      onGoToSignIn={() => nav.goToPage('/login')}
      onGoHome={nav.goHome}
    />
  );
}

/**
 * /reset-password - where the password-reset email's link lands.
 *
 * Supabase does not put a `?token=` query param on this link: it carries the
 * recovery session in the URL *hash* (`#access_token=...&type=recovery`),
 * which the Supabase client parses automatically on load. There is nothing
 * for this route to read from the query string, so it always opens in
 * RESET_PASSWORD mode - AuthPage itself shows "open the link from your
 * email" if no recovery session has appeared by the time it renders.
 */
function ResetPasswordRoute() {
  const nav = useAppNavigation();

  return (
    <AuthPage
      initialMode="RESET_PASSWORD"
      initialRole="LANDLORD"
      unauthorizedNotice={null}
      onGoHome={nav.goHome}
      onAuthSuccess={(role) => nav.goToPage(dashboardPathForRole(role))}
    />
  );
}

function AcceptInvitationRoute() {
  const nav = useAppNavigation();
  return <AcceptInvitationPage onGoToTenantHome={nav.goToDashboard} onGoToLanding={nav.goHome} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AppRoutes />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
