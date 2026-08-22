import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from './Navbar';
import { Loader2 } from 'lucide-react';

export const ProtectedLayout: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F8F8] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-9 h-9 text-[#235D62] animate-spin" />
          <span className="font-mono text-xs font-semibold text-[#5A7E81]">Initializing Scriptly Session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F4F8F8] text-[#183D40] flex flex-col justify-between selection:bg-[#235D62] selection:text-white">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-8 py-8">
        <Outlet />
      </main>
      
      {/* Sleek Deep Teal Protected Footer */}
      <footer className="mt-16 bg-[#143639] text-[#78C0BD] border-t border-[#1C4F53] py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#78C0BD] animate-pulse" />
            <span className="text-white font-semibold">Scriptly HTR System</span>
            <span className="text-[#326B70]">•</span>
            <span>Neural Vision AI Active</span>
          </div>
          <div className="text-slate-400">
            &copy; {new Date().getFullYear()} Scriptly AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
