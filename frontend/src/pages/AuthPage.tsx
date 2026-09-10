import React, { useState, useEffect } from "react";
import {
  Building2,
  User,
  KeyRound,
  Mail,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Ticket,
  Check,
  RefreshCw,
  Sparkles,
  Building,
  ShieldAlert,
  ShieldCheck,
  MailCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { supabase } from "../services/supabase";
import notifyLogo from "../assets/images/logo.png";
import cartoonImage from "../assets/images/cartoon.png";

export type AuthMode =
  | "LOGIN"
  | "SIGNUP"
  | "FORGOT_PASSWORD"
  | "RESET_PASSWORD"
  | "CHECK_EMAIL";
export type UserRoleType = "LANDLORD" | "TENANT";

interface AuthPageProps {
  initialMode?: AuthMode;
  initialRole?: UserRoleType;
  unauthorizedNotice?: string | null;
  onGoHome: () => void;
  onAuthSuccess?: (role: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = "SIGNUP",
  initialRole = "LANDLORD",
  unauthorizedNotice = null,
  onGoHome,
  onAuthSuccess,
}) => {
  const {
    login,
    registerLandlord,
    registerTenant,
    forgotPassword,
    setNewPassword: submitNewPassword,
    resendVerification,
    refreshUser,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRoleType>(initialRole);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole]);

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Tenant Specific
  const [username, setUsername] = useState("");
  const [invitationToken, setInvitationToken] = useState("");
  const [tokenValidationState, setTokenValidationState] = useState<{
    valid?: boolean;
    property_name?: string;
    unit_number?: string;
    landlord_name?: string;
    monthly_rent?: number;
    checking?: boolean;
    error?: string;
  }>({});

  // Forgot / Reset Password Flow. The recovery session comes from the emailed
  // link (Supabase parses it out of the URL hash before this page ever
  // renders) - there is no token to show or type in here.
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetSentInfo, setResetSentInfo] = useState<{
    message?: string;
    token?: string;
  } | null>(null);

  // Status & Notifications
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    unauthorizedNotice,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (unauthorizedNotice) {
      setErrorMessage(unauthorizedNotice);
    }
  }, [unauthorizedNotice]);

  // A password-reset link signs the user in just long enough to set a new
  // password. That session is what authorises the change, so its presence is
  // what the reset form checks.
  // Set when sign-up succeeds but Supabase is waiting on the emailed link.
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setHasRecoverySession(true);
    });

    // Automatically verify direct token_hash recovery links from production reset email
    const searchParams = new URLSearchParams(window.location.search);
    const tokenHash = searchParams.get("token_hash") || searchParams.get("token");
    const recoveryType = searchParams.get("type");

    if (tokenHash && (recoveryType === "recovery" || !recoveryType || mode === "RESET_PASSWORD")) {
      supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      }).then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error verifying recovery token:", error);
          setErrorMessage("This password reset link is invalid or has expired. Please request a new one.");
        } else if (data?.session) {
          setHasRecoverySession(true);
        }
      });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session)
        setHasRecoverySession(Boolean(session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [mode]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    clearError();
  };

  // Live invitation token verification for Tenant
  useEffect(() => {
    if (
      mode === "SIGNUP" &&
      selectedRole === "TENANT" &&
      invitationToken.trim().length >= 4
    ) {
      const timer = setTimeout(async () => {
        try {
          setTokenValidationState({ checking: true });
          const res = await api.invitations.validateToken(
            invitationToken.trim(),
          );
          if (res && res.valid) {
            setTokenValidationState({
              valid: true,
              property_name: res.property_name,
              unit_number: res.unit_number,
              landlord_name: res.landlord_name,
              monthly_rent: res.monthly_rent,
              checking: false,
            });
          } else {
            setTokenValidationState({
              valid: false,
              checking: false,
              error: "Invalid invitation token.",
            });
          }
        } catch (err: any) {
          setTokenValidationState({
            valid: false,
            checking: false,
            error: err.data?.detail || "Invitation token not verified.",
          });
        }
      }, 400);

      return () => clearTimeout(timer);
    } else {
      setTokenValidationState({});
    }
  }, [invitationToken, mode, selectedRole]);


  // 1. Submit Login Form
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email or username.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    if (loading) return; // a second click while the first is in flight

    try {
      setLoading(true);
      const user = await login(cleanEmail, password);
      setSuccessMessage(
        `Welcome back, ${user.first_name}! Opening your dashboard...`,
      );
      onAuthSuccess?.(user.role);
    } catch (err: any) {
      const msg =
        typeof err.message === "string"
          ? err.message
          : typeof err.data?.detail === "string"
            ? err.data.detail
            : "Invalid email or password.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Sign Up Form
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Tenant: Enter invitation code and proceed to onboarding
    if (selectedRole === "TENANT") {
      const cleanToken = invitationToken.trim();
      if (!cleanToken) {
        setErrorMessage("Please enter your invitation code from your landlord.");
        return;
      }
      window.location.href = `/accept-invitation?token=${encodeURIComponent(cleanToken)}`;
      return;
    }

    // Landlord validations
    if (!fullName.trim()) {
      setErrorMessage("Full name is required.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("A valid email address is required.");
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage("Phone number is required.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (loading) return; // a second click while the first is in flight

    const [firstName, ...restName] = fullName.trim().split(/\s+/);
    const lastName = restName.join(" ");

    try {
      setLoading(true);
      const result = await registerLandlord({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phoneNumber.trim(),
        password,
      });
      if (result.status === "CONFIRM_EMAIL") {
        setPendingEmail(result.email);
        setMode("CHECK_EMAIL");
      } else {
        setSuccessMessage(
          "Landlord account created. Opening your dashboard...",
        );
        onAuthSuccess?.(result.profile.role);
      }
    } catch (err: any) {
      const msg =
        typeof err.message === "string"
          ? err.message
          : typeof err.data?.detail === "string"
            ? err.data.detail
            : "Registration could not be completed.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend the confirmation email from the "check your email" screen.
  const handleResendConfirmation = async () => {
    if (resendState !== "idle" || !pendingEmail) return;
    setResendState("sending");
    setErrorMessage(null);
    try {
      await resendVerification(pendingEmail);
      setResendState("sent");
      // Let them try again after a while rather than locking the button forever.
      setTimeout(() => setResendState("idle"), 20000);
    } catch (err: any) {
      setResendState("idle");
      setErrorMessage(
        err?.message || "Could not resend the email. Please try again shortly.",
      );
    }
  };

  // 3. Submit Forgot Password
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid registered email.");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      const res = await forgotPassword(cleanEmail);
      // The reset link is emailed. It is deliberately never returned here, so
      // the form cannot be used to take over an account from someone else's
      // address - it stays on this screen and tells the user to check email.
      setResetSentInfo({ message: res.message });
      setSuccessMessage(res.message);
    } catch (err: any) {
      const msg =
        typeof err.message === "string"
          ? err.message
          : typeof err.data?.detail === "string"
            ? err.data.detail
            : "Unable to process reset request.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // 4. Submit Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Supabase puts a short-lived recovery session in place when the emailed
    // link is opened, so there is no token to submit - only the new password.
    if (!hasRecoverySession) {
      setErrorMessage(
        "This password reset link has expired or was already used. Please request a new one.",
      );
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    if (loading) return;

    try {
      setLoading(true);
      await submitNewPassword(newPassword);
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      // Setting a new password does not end the recovery session Supabase
      // put in place when the emailed link was opened - it simply becomes
      // this user's normal session. So there is no need to send them back to
      // the sign-in form: load their profile on that same session and go
      // straight to their dashboard, exactly like a normal sign-in would.
      const profile = await refreshUser();
      if (profile) {
        setSuccessMessage(`Password updated. Opening your dashboard...`);
        onAuthSuccess?.(profile.role);
      } else {
        // No usable session came back (link had already expired, say) -
        // the password did change, so send them to sign in with it normally.
        setSuccessMessage(
          "Password updated. Please sign in with your new password.",
        );
        setTimeout(() => setMode("LOGIN"), 1500);
      }
    } catch (err: any) {
      const msg =
        typeof err.message === "string"
          ? err.message
          : typeof err.data?.detail === "string"
            ? err.data.detail
            : "Failed to reset password.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // The "check your email" screen is a single, centered message rather than
  // the two-column form layout - it has nothing to put beside a mascot, and
  // stretching it across the same width as the forms would leave it looking
  // lost in empty space.
  const isCheckEmail = mode === "CHECK_EMAIL";

  return (
    <div className="min-h-screen bg-notify-grid text-black font-sans py-6 sm:py-10 px-4 sm:px-6 lg:px-8 relative flex flex-col justify-center items-center">
      <div className={`w-full z-10 ${isCheckEmail ? "max-w-md" : "max-w-6xl"}`}>
        {/* Navigation Bar / Return to Site */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onGoHome}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/10 text-black transition-all cursor-pointer"
            aria-label="Return to Home"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="flex items-center">
            <img
              src={notifyLogo}
              alt="Notify"
              className="h-10 w-auto object-contain transition-transform duration-150 hover:scale-105"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>

        {/* Two-Side Page Layout: Left side has the form, Right side has the cartoon mascot.
            The check-email screen skips this entirely and centers on its own. */}
        <div
          className={
            isCheckEmail
              ? ""
              : "grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
          }
        >
          {/* ===================== LEFT SIDE: AUTHENTICATION FORM ===================== */}
          <div className="flex flex-col order-1 justify-center">
            <div className="py-2 sm:py-4 px-1 sm:px-3 flex-1 flex flex-col justify-center">
              <div>
                {/* Mode & Title Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="inline-block px-3 py-1 rounded-[10px] bg-[#F5DC00] text-black text-xs font-black uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000]">
                      {mode === "LOGIN" && "Sign In"}
                      {mode === "SIGNUP" && `Register as ${selectedRole}`}
                      {mode === "FORGOT_PASSWORD" && "Account Recovery"}
                      {mode === "RESET_PASSWORD" && "New Password"}
                      {mode === "CHECK_EMAIL" && "Almost There"}
                    </span>
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      Kigali Commercial Property Suite
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black uppercase tracking-tight">
                    {mode === "LOGIN" && "Access Your Portal"}
                    {mode === "SIGNUP" && "Create Your Account"}
                    {mode === "FORGOT_PASSWORD" && "Reset Your Password"}
                    {mode === "RESET_PASSWORD" && "Set New Password"}
                    {mode === "CHECK_EMAIL" && "Check Your Email"}
                  </h1>

                  <p className="text-sm sm:text-base text-slate-700 font-medium mt-1.5">
                    {mode === "LOGIN"}
                    {mode === "SIGNUP" && selectedRole === "LANDLORD"}
                    {mode === "FORGOT_PASSWORD" &&
                      "Enter your registered email address and we will send you a password reset link."}
                    {mode === "RESET_PASSWORD" &&
                      "Choose a new password for your account."}
                    {mode === "CHECK_EMAIL"}
                  </p>
                </div>

                {/* Notifications */}
                {errorMessage && (
                  <div className="mb-5 p-3.5 rounded-[16px] bg-red-100 border-2 border-black shadow-[0.5px_0.5px_0_#DC2626] flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 stroke-[2.5] flex-shrink-0" />
                    <div className="text-sm font-bold text-black flex-1">
                      {errorMessage}
                    </div>
                  </div>
                )}

                {successMessage && (
                  <div className="mb-5 p-3.5 rounded-[16px] bg-green-100 border-2 border-black shadow-[0.5px_0.5px_0_#16A34A] flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-700 stroke-[2.5] flex-shrink-0" />
                    <div className="text-sm font-bold text-black flex-1">
                      {successMessage}
                    </div>
                  </div>
                )}

                {/* ---------------- CONFIRM YOUR EMAIL ---------------- */}
                {mode === "CHECK_EMAIL" && (
                  <div className="space-y-5">
                    {/* The envelope, with the role the account was created as.
                        Showing it here is deliberate: it is the moment someone
                        would notice if they had picked the wrong one. */}
                    <div className="relative p-6 sm:p-7 rounded-[20px] bg-white border-2 border-black shadow-[3px_3px_0_#331A6F] text-center overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-[#F5DC00]/40" />
                      <div className="absolute -bottom-12 -left-8 w-24 h-24 rounded-full bg-[#331A6F]/10" />

                      <div className="relative">
                        <div className="mx-auto w-16 h-16 rounded-[18px] bg-[#331A6F] border-2 border-black shadow-[2px_2px_0_#000000] flex items-center justify-center mb-4">
                          <MailCheck className="w-8 h-8 text-white stroke-[2.2]" />
                        </div>

                        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-black">
                          Confirmation link sent
                        </h2>

                        <p className="mt-2 text-sm font-semibold text-slate-600 leading-relaxed">
                          We sent it to
                        </p>
                        <p className="mt-1 text-sm sm:text-base font-black text-[#331A6F] break-all">
                          {pendingEmail}
                        </p>

                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-emerald-50 border-2 border-black shadow-[0.5px_0.5px_0_#000000]">
                          {selectedRole === "LANDLORD" ? (
                            <Building2 className="w-4 h-4 text-[#331A6F]" />
                          ) : (
                            <User className="w-4 h-4 text-[#331A6F]" />
                          )}
                          <span className="text-xs font-black uppercase tracking-wider text-black">
                            {selectedRole} account
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resendState !== "idle"}
                      className="w-full py-3 px-6 rounded-[16px] bg-white text-black font-black text-sm uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:bg-amber-50 disabled:opacity-60 disabled:pointer-events-none transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      {resendState === "sending" && (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      )}
                      {resendState === "sent" && (
                        <Check className="w-4 h-4 text-emerald-600" />
                      )}
                      <span>
                        {resendState === "idle" && "Resend the email"}
                        {resendState === "sending" && "Sending..."}
                        {resendState === "sent" && "Sent - check your inbox"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => switchMode("LOGIN")}
                      className="w-full py-3.5 px-6 rounded-[16px] bg-[#331A6F] text-white font-black text-sm uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      <span>I have confirmed - sign me in</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* -------------------- SIGN IN FORM -------------------- */}
                {mode === "LOGIN" && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-black mb-1.5">
                        Email Address or Username
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. landlord@notify.test or tenant@notify.test"
                          disabled={loading}
                          className="w-full px-4 py-3 rounded-[14px] bg-white text-black font-bold text-sm sm:text-base border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                        />
                        <Mail className="absolute right-4 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-black">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => switchMode("FORGOT_PASSWORD")}
                          className="text-xs font-black text-[#331A6F] hover:underline uppercase tracking-wide cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          disabled={loading}
                          className="w-full px-4 py-3 rounded-[14px] bg-white text-black font-bold text-sm sm:text-base border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-3.5 text-slate-600 hover:text-black focus:outline-none"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>


                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-[16px] bg-[#331A6F] text-white font-black text-sm sm:text-base uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying Credentials...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Dashboard</span>
                          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                        </>
                      )}
                    </button>

                    {/* Simple caption at the end of the form (no buttons) */}
                    <div className="pt-4 text-center border-t-2 border-slate-100 mt-5">
                      <p className="text-sm font-semibold text-slate-700">
                        Don't have an account yet?{" "}
                        <button
                          type="button"
                          onClick={() => switchMode("SIGNUP")}
                          className="font-black text-[#331A6F] underline hover:text-black transition-colors cursor-pointer ml-1 inline-flex items-center gap-1"
                        >
                          <span>Create Account</span>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {/* -------------------- SIGN UP FORM -------------------- */}
                {mode === "SIGNUP" && (
                  <form onSubmit={handleSignUpSubmit} className="space-y-4">
                    {/* Role Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole("LANDLORD")}
                        className={`p-3 rounded-[16px] text-left border-2 border-black transition-all cursor-pointer flex items-center justify-between ${
                          selectedRole === "LANDLORD"
                            ? "bg-[#331A6F] text-white shadow-[0.5px_0.5px_0_#000000] translate-x-[0.5px] translate-y-[0.5px]"
                            : "bg-white text-black hover:bg-slate-50 shadow-[0.5px_0.5px_0_#000000]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Building2 className="w-5 h-5 flex-shrink-0" />
                          <div>
                            <div className="font-black text-sm uppercase tracking-tight">
                              Landlord
                            </div>
                            <div className="text-xs opacity-80">
                              Property & Mall Owner
                            </div>
                          </div>
                        </div>
                        {selectedRole === "LANDLORD" && (
                          <Check className="w-4 h-4 stroke-[3] text-[#FFE600]" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole("TENANT")}
                        className={`p-3 rounded-[16px] text-left border-2 border-black transition-all cursor-pointer flex items-center justify-between ${
                          selectedRole === "TENANT"
                            ? "bg-[#FFE600] text-black shadow-[0.5px_0.5px_0_#000000] translate-x-[0.5px] translate-y-[0.5px]"
                            : "bg-white text-black hover:bg-slate-50 shadow-[0.5px_0.5px_0_#000000]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <User className="w-5 h-5 flex-shrink-0" />
                          <div>
                            <div className="font-black text-sm uppercase tracking-tight">
                              Tenant
                            </div>
                            <div className="text-xs opacity-80">
                              Commercial Unit Tenant
                            </div>
                          </div>
                        </div>
                        {selectedRole === "TENANT" && (
                          <Check className="w-4 h-4 stroke-[3] text-black" />
                        )}
                      </button>
                    </div>

                    {/* Tenant specific: Invitation Token */}
                    {selectedRole === "TENANT" && (
                      <div className="p-3.5 rounded-[16px] bg-amber-50 border-2 border-black shadow-[0.5px_0.5px_0_#000000] space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black uppercase tracking-wider text-black flex items-center gap-1.5">
                            <Ticket className="w-4 h-4 text-[#331A6F]" />
                            <span>Invitation Code from Landlord *</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          required
                          value={invitationToken}
                          onChange={(e) =>
                            setInvitationToken(e.target.value.toUpperCase())
                          }
                          placeholder="e.g. INV-KGL-2026"
                          disabled={loading}
                          className="w-full px-3.5 py-2.5 rounded-[12px] bg-white text-black font-black text-sm tracking-wider uppercase border-2 border-black focus:outline-none shadow-[0.5px_0.5px_0_#000000]"
                        />
                        {tokenValidationState.valid && (
                          <div className="text-xs font-bold text-green-900 flex items-center gap-1.5 pt-0.5">
                            <CheckCircle2 className="w-4 h-4 text-green-700 flex-shrink-0" />
                            <span>
                              Verified: {tokenValidationState.property_name} (
                              {tokenValidationState.unit_number})
                            </span>
                          </div>
                        )}
                        {tokenValidationState.error && (
                          <p className="text-xs font-bold text-red-600">
                            {tokenValidationState.error}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Landlord Registration Fields: Full Name, Email, Phone, District, Password */}
                    {selectedRole === "LANDLORD" && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* Full Name */}
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Jean-Paul Mugabo"
                              disabled={loading}
                              className="w-full px-3.5 py-2.5 rounded-[12px] bg-white text-black font-bold text-sm border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                            />
                          </div>

                          {/* Email */}
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                              Email Address *
                            </label>
                            <div className="relative">
                              <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="landlord@kigali.rw"
                                disabled={loading}
                                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white text-black font-bold text-sm border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                              />
                              <Mail className="absolute right-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                          </div>

                          {/* Phone Number */}
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                              Phone Number (MTN / Airtel) *
                            </label>
                            <div className="relative">
                              <input
                                type="tel"
                                required
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+250 788 123 456"
                                disabled={loading}
                                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white text-black font-bold text-sm border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                              />
                              <Phone className="absolute right-3.5 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                          </div>

                          {/* Region (Landlord) */}
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                              Primary District (default)
                            </label>
                            <div className="px-3.5 py-2.5 rounded-[12px] bg-slate-100 border-2 border-black text-xs font-bold text-black flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              <span>Kigali Commercial Districts</span>
                            </div>
                          </div>

                          {/* Password */}
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                              Password (8+ chars) *
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                disabled={loading}
                                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white text-black font-bold text-sm border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-3 text-slate-600 hover:text-black"
                                tabIndex={-1}
                              >
                                {showPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Confirm Password */}
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                              Confirm Password *
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                disabled={loading}
                                className="w-full px-3.5 py-2.5 rounded-[12px] bg-white text-black font-bold text-sm border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                                className="absolute right-3.5 top-3 text-slate-600 hover:text-black"
                                tabIndex={-1}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Password Match Feedback */}
                        {password && confirmPassword && (
                          <p
                            className={`text-xs font-extrabold flex items-center gap-1.5 ${
                              password === confirmPassword
                                ? "text-green-700"
                                : "text-red-600"
                            }`}
                          >
                            {password === confirmPassword ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Passwords match successfully.</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-4 h-4" />
                                <span>Passwords do not match yet.</span>
                              </>
                            )}
                          </p>
                        )}
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full mt-2 py-3.5 px-6 rounded-[16px] font-black text-sm sm:text-base uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        selectedRole === "LANDLORD"
                          ? "bg-[#331A6F] text-white"
                          : "bg-[#FFE600] text-black"
                      }`}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>
                            {selectedRole === "LANDLORD"
                              ? "Creating Account..."
                              : "Opening Invitation..."}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>
                            {selectedRole === "LANDLORD"
                              ? "Create Landlord Account"
                              : "Continue with Invitation"}
                          </span>
                          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                        </>
                      )}
                    </button>

                    {/* Simple caption at the end of the form (no buttons) */}
                    <div className="pt-4 text-center border-t-2 border-slate-100 mt-5">
                      <p className="text-sm font-semibold text-slate-700">
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => switchMode("LOGIN")}
                          className="font-black text-[#331A6F] underline hover:text-black transition-colors cursor-pointer ml-1 inline-flex items-center gap-1"
                        >
                          <span>Sign In</span>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {/* -------------------- FORGOT PASSWORD FORM -------------------- */}
                {mode === "FORGOT_PASSWORD" && (
                  <form
                    onSubmit={handleForgotPasswordSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-black mb-1.5">
                        Your Registered Email Address
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. landlord@notify.test"
                          disabled={loading}
                          className="w-full px-4 py-3 rounded-[14px] bg-white text-black font-bold text-sm sm:text-base border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                        />
                        <Mail className="absolute right-4 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed">
                      We will email you a secure reset link, valid for 1 hour
                      and usable once.
                    </p>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-[16px] bg-[#331A6F] text-white font-black text-sm sm:text-base uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending Reset Link...</span>
                        </>
                      ) : (
                        <>
                          <span>Email Me A Reset Link</span>
                          <KeyRound className="w-5 h-5" />
                        </>
                      )}
                    </button>

                    {/* Simple caption at the end of the form */}
                    <div className="pt-4 text-center border-t-2 border-slate-100 mt-5">
                      <p className="text-sm font-semibold text-slate-700">
                        Remember your password?{" "}
                        <button
                          type="button"
                          onClick={() => switchMode("LOGIN")}
                          className="font-black text-[#331A6F] underline hover:text-black transition-colors cursor-pointer ml-1 inline-flex items-center gap-1"
                        >
                          <span>Return to Sign In</span>
                        </button>
                      </p>
                    </div>
                  </form>
                )}

                {/* -------------------- RESET PASSWORD FORM -------------------- */}
                {mode === "RESET_PASSWORD" && (
                  <form
                    onSubmit={handleResetPasswordSubmit}
                    className="space-y-4"
                  >
                    {/* The token travels in the emailed link, so there is
                        nothing to type here - just confirm we received it. */}
                    {hasRecoverySession ? (
                      <div className="p-3.5 rounded-[16px] bg-emerald-50 border-2 border-black shadow-[0.5px_0.5px_0_#000000] flex items-start gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm font-bold text-black leading-relaxed">
                          Reset link verified. Choose your new password below.
                        </span>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-[16px] bg-amber-50 border-2 border-black shadow-[0.5px_0.5px_0_#000000]">
                        <span className="text-xs sm:text-sm font-bold text-black leading-relaxed block">
                          This page needs the reset link from your email. Open
                          the link in your inbox, or{" "}
                          <button
                            type="button"
                            onClick={() => switchMode("FORGOT_PASSWORD")}
                            className="font-black text-[#331A6F] underline hover:text-black transition-colors cursor-pointer"
                          >
                            request a new one
                          </button>
                          .
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                          New Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          disabled={loading}
                          className="w-full px-3.5 py-2.5 rounded-[12px] bg-white text-black font-bold text-sm border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                          Confirm New Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmNewPassword}
                          onChange={(e) =>
                            setConfirmNewPassword(e.target.value)
                          }
                          placeholder="Re-type new password"
                          disabled={loading}
                          className="w-full px-3.5 py-2.5 rounded-[12px] bg-white text-black font-bold text-sm border-2 border-black placeholder:text-slate-400 focus:outline-none focus:bg-amber-50 shadow-[0.5px_0.5px_0_#000000] disabled:bg-slate-100 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-6 rounded-[16px] bg-[#FFE600] text-black font-black text-sm sm:text-base uppercase tracking-wider border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Saving New Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Save Password & Sign In</span>
                          <Check className="w-5 h-5 stroke-[3]" />
                        </>
                      )}
                    </button>

                    <div className="pt-4 text-center border-t-2 border-slate-100 mt-5">
                      <p className="text-sm font-semibold text-slate-700">
                        Remember your password?{" "}
                        <button
                          type="button"
                          onClick={() => switchMode("LOGIN")}
                          className="font-black text-[#331A6F] underline hover:text-black transition-colors cursor-pointer ml-1 inline-flex items-center gap-1"
                        >
                          <span>Back to Sign In</span>
                        </button>
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* ===================== RIGHT SIDE: CARTOON MASCOT ===================== */}
          {!isCheckEmail && (
            <div className="hidden lg:flex flex-col order-2 items-center justify-center py-4 sm:py-8">
              <img
                src={cartoonImage}
                alt="Notify Mascot"
                className="w-full max-w-sm sm:max-w-md lg:max-w-[480px] h-auto object-contain filter drop-shadow-[0_20px_40px_rgba(51,26,111,0.18)] transition-transform duration-300 hover:scale-105"
                loading="eager"
                decoding="async"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
