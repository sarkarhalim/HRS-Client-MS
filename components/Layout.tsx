
import React, { useState, useEffect } from 'react';
import { NAVIGATION_ITEMS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: { name: string; email: string };
  onLogout: () => void;
  agencyName: string;
  onBack?: () => void;
  onForward?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, activeTab, setActiveTab, user, onLogout, agencyName,
  onBack, onForward, canGoBack, canGoForward
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // Adjust sidebar default state based on window size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center justify-between">
        <h1 className={`${(!isSidebarOpen && window.innerWidth >= 1024) ? 'lg:hidden' : 'block'} font-bold text-lg tracking-tight truncate text-white`}>
          {agencyName.split(' ')[0]} <span className="text-blue-400 font-normal">{agencyName.split(' ').slice(1).join(' ')}</span>
        </h1>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="hidden lg:block p-1 hover:bg-slate-800 rounded text-slate-400 transition-colors"
        >
          {isSidebarOpen ? '❮' : '❯'}
        </button>
      </div>

      <nav className="flex-1 mt-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {NAVIGATION_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${
              activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-xl shrink-0">{item.icon}</span>
            <span className={`${(!isSidebarOpen && window.innerWidth >= 1024) ? 'lg:hidden' : 'block'} font-medium whitespace-nowrap overflow-hidden text-ellipsis`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 overflow-hidden">
           <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
             {user.name.charAt(0).toUpperCase()}
           </div>
           {(isSidebarOpen || window.innerWidth < 1024) && (
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-medium truncate text-white">{user.name}</p>
               <p className="text-xs text-slate-500 truncate">{user.email}</p>
             </div>
           )}
        </div>
        <button 
          onClick={onLogout}
          className={`w-full flex items-center gap-4 px-3 py-2 rounded text-rose-400 hover:bg-rose-500/10 transition-colors ${(!isSidebarOpen && window.innerWidth >= 1024) ? 'justify-center' : ''}`}
        >
          <span className="shrink-0">🚪</span>
          <span className={`${(!isSidebarOpen && window.innerWidth >= 1024) ? 'lg:hidden' : 'block'}`}>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Mobile Sidebar Overlay/Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 lg:relative lg:flex bg-slate-900 flex-col shadow-2xl transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-30">
          <div className="flex items-center gap-1 sm:gap-4 flex-1 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Custom UI Back/Forward Buttons */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button 
                onClick={onBack}
                disabled={!canGoBack}
                className={`p-1.5 rounded-md transition-all active:scale-90 ${canGoBack ? 'text-slate-500 hover:text-slate-800 hover:bg-white' : 'text-slate-300 cursor-not-allowed'}`}
                title="Go Back"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={onForward}
                disabled={!canGoForward}
                className={`p-1.5 rounded-md transition-all active:scale-90 ${canGoForward ? 'text-slate-500 hover:text-slate-800 hover:bg-white' : 'text-slate-300 cursor-not-allowed'}`}
                title="Go Forward"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <h2 className="ml-2 text-sm md:text-lg font-bold text-slate-800 truncate">
              {NAVIGATION_ITEMS.find(i => i.id === activeTab)?.label || 'Overview'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <span className="hidden sm:inline-block bg-slate-100 px-3 py-1 rounded-full text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              Authorized
            </span>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default Layout;
