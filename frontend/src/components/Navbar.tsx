import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, FileText, Upload, Sparkles } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#F4F8F8]/90 backdrop-blur-xl border-b border-[#D0E2E2]/60 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Brand Logo / Wordmark */}
        <Link to="/" className="flex items-center space-x-3 group">
          <span className="font-display font-extrabold text-xl tracking-tight text-[#183D40] group-hover:text-[#235D62] transition-colors">
            Scriptly <span className="text-[#235D62] font-medium text-base">HTR</span>
          </span>
          <span className="hidden sm:inline-block font-mono text-[10px] font-bold uppercase tracking-wider text-[#235D62] bg-[#EBF3F3] px-2.5 py-0.5 rounded-full border border-[#D0E2E2]">
            AI Engine
          </span>
        </Link>

        {/* Navigation Items */}
        <nav className="flex items-center space-x-1.5 sm:space-x-4 shrink-0">
          {currentUser ? (
            <>
              <Link 
                to="/dashboard" 
                className="flex items-center space-x-1.5 text-xs font-bold text-[#235D62] hover:text-[#183D40] transition-colors px-2.5 sm:px-3 py-2 rounded-xl hover:bg-[#EBF3F3] whitespace-nowrap"
              >
                <FileText className="w-4 h-4 text-[#235D62]" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              <Link 
                to="/upload" 
                className="flex items-center space-x-1.5 text-xs font-bold bg-[#235D62] hover:bg-[#1C4E52] text-white px-3 sm:px-4 py-2 rounded-full transition-all shadow-md hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload Note</span>
                <span className="sm:hidden">Upload</span>
              </Link>

              <div className="flex items-center space-x-1 sm:space-x-2 pl-1.5 sm:pl-2 border-l border-[#D0E2E2]">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#78C0BD]/30 border border-[#78C0BD] flex items-center justify-center text-xs font-bold text-[#183D40] font-mono shadow-inner shrink-0">
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="text-[#5A7E81] hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className="text-xs font-bold text-[#183D40] hover:text-[#235D62] transition-colors px-2 sm:px-3 py-2 whitespace-nowrap"
              >
                Log In
              </Link>
              <Link 
                to="/register" 
                className="text-xs font-bold bg-[#235D62] hover:bg-[#1C4E52] text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Get Started</span>
                <Sparkles className="w-3.5 h-3.5 text-[#78C0BD]" />
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
