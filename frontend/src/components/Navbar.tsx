import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowRight, Building, Sparkles, Building2, User, LogOut } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from './LanguageSelector';
import notifyLogo from '../assets/images/logo.png';

interface NavbarProps {
  onOpenGetStarted: (source?: string, mode?: 'LOGIN' | 'SIGNUP') => void;
  onOpenSupport: () => void;
  onOpenPricing: () => void;
  onGoHome?: () => void;
  onGoToDashboard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenGetStarted,
  onOpenSupport,
  onOpenPricing,
  onGoHome,
  onGoToDashboard,
}) => {
  const { t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onGoHome) {
      onGoHome();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToFeatures = () => {
    setMobileMenuOpen(false);
    if (onGoHome) {
      onGoHome();
    }
    setTimeout(() => {
      const element = document.getElementById('features');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <header
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${isScrolled ? 'py-5 sm:py-6 bg-[#F4F4F0]/90 backdrop-blur-md shadow-sm border-b border-black/10' : 'py-7 sm:py-8 bg-[#F4F4F0]/85 backdrop-blur-sm'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <a
            href="#"
            onClick={handleLogoClick}
            className="flex items-center gap-3 group focus:outline-none cursor-pointer"
            aria-label="Notify — Official Rental & Property Management System Rwanda"
            title="Notify — Official Rental & Property Management System Rwanda"
          >
            <img
              src={notifyLogo}
              alt="Notify"
              className="h-14 sm:h-16 w-auto object-contain transition-transform duration-150 group-hover:scale-105"
              loading="eager"
              decoding="async"
            />

          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={scrollToFeatures}
              className="text-base font-semibold text-black hover:text-[#331A6F] transition-colors cursor-pointer"
            >
              {t.features}
            </button>
            <button
              onClick={onOpenPricing}
              className="text-base font-semibold text-black hover:text-[#331A6F] transition-colors cursor-pointer"
            >
              {t.pricing}
            </button>
            <button
              onClick={onOpenSupport}
              className="text-base font-semibold text-black hover:text-[#331A6F] transition-colors cursor-pointer"
            >
              {t.support}
            </button>

            {/* Google Translate Icon directly next to Support tab */}
            <LanguageSelector />
          </nav>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="px-3 py-1.5 rounded-[12px] bg-slate-100 border-2 border-black text-xs font-bold text-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="truncate max-w-[120px]">{user.first_name || user.email}</span>
                  <span className="px-1.5 py-0.5 bg-[#331A6F] text-white text-[10px] uppercase font-extrabold rounded-[6px]">
                    {user.role}
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (onGoToDashboard) onGoToDashboard();
                  }}
                  className="px-4 py-2 rounded-[14px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {user.role === 'LANDLORD' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  <span>{user.role === 'LANDLORD' ? 'Landlord Dashboard' : 'Tenant Portal'}</span>
                </button>

                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  className="p-2 rounded-[14px] bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold border-2 border-black shadow-[0.5px_0.5px_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onOpenGetStarted('Navbar Sign In', 'LOGIN')}
                  className="px-4 py-2 rounded-[14px] bg-[#FFE600] hover:bg-[#F5DC00] text-black font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onOpenGetStarted('Navbar CTA', 'SIGNUP')}
                  className="px-6 py-2.5 rounded-[17px] bg-[#331A6F] text-white font-extrabold text-sm border-2 border-black shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[0.5px_0.5px_0_#000000] transition-all duration-150 cursor-pointer flex items-center gap-2"
                >
                  <span>{t.getStarted}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSelector />

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-[14px] border-2 border-black text-black bg-white shadow-[0.5px_0.5px_0_#000000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[0.5px_0.5px_0_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0.5px_0.5px_0_#000000] transition-all duration-150 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 stroke-[2.5]" /> : <Menu className="w-6 h-6 stroke-[2.5]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t-2 border-b-2 border-black mt-3 px-6 pt-4 pb-6 space-y-4 shadow-[0_6px_0_#000000]">
          <div className="flex items-center justify-between py-1 border-b-2 border-black pb-3">
            <span className="text-xs font-extrabold text-black uppercase tracking-wider">{t.navigation}</span>
            <span className="text-xs font-bold text-white bg-[#331A6F] px-3 py-1 rounded-[10px] border-2 border-black uppercase tracking-wider">
              Kigali Mall OS
            </span>
          </div>

          <button
            onClick={scrollToFeatures}
            className="w-full text-left px-4 py-3 rounded-[14px] text-black hover:bg-[#331A6F]/10 border-2 border-black font-semibold text-base flex items-center justify-between shadow-[0.5px_0.5px_0_#000000] cursor-pointer"
          >
            <span>{t.features}</span>
            <Building className="w-5 h-5 text-black stroke-[2]" />
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenPricing();
            }}
            className="w-full text-left px-4 py-3 rounded-[14px] text-black hover:bg-[#331A6F]/10 border-2 border-black font-semibold text-base flex items-center justify-between shadow-[0.5px_0.5px_0_#000000] cursor-pointer"
          >
            <span>{t.pricing}</span>
            <Sparkles className="w-5 h-5 text-black stroke-[2]" />
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenSupport();
            }}
            className="w-full text-left px-4 py-3 rounded-[14px] text-black hover:bg-[#331A6F]/10 border-2 border-black font-semibold text-base flex items-center justify-between shadow-[0.5px_0.5px_0_#000000] cursor-pointer"
          >
            <span>{t.support}</span>
            <span className="text-xs text-black font-bold uppercase">{t.faqs}</span>
          </button>

          <div className="pt-2 space-y-2">
            {isAuthenticated && user ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (onGoToDashboard) onGoToDashboard();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-[17px] bg-[#331A6F] text-white font-extrabold text-base border-2 border-black shadow-[0.5px_0.5px_0_#000000] cursor-pointer"
                >
                  {user.role === 'LANDLORD' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  <span>Open {user.role === 'LANDLORD' ? 'Landlord Dashboard' : 'Tenant Portal'}</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-[17px] bg-red-50 text-red-700 font-bold text-sm border-2 border-black cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenGetStarted('Mobile Nav Sign In', 'LOGIN');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-[17px] bg-[#FFE600] hover:bg-[#F5DC00] text-black font-extrabold text-base border-2 border-black shadow-[0.5px_0.5px_0_#000000] cursor-pointer"
                >
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenGetStarted('Mobile Nav Get Started', 'SIGNUP');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-[17px] bg-[#331A6F] text-white font-extrabold text-base border-2 border-black shadow-[0.5px_0.5px_0_#000000] cursor-pointer"
                >
                  <span>{t.getStarted}</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

