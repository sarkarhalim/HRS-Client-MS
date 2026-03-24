
import React, { useState, useEffect } from 'react';
import { NAVIGATION_ITEMS } from '../constants';
import { LayoutGrid, Users, CreditCard, Banknote } from 'lucide-react';

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
    <div className="flex h-screen bg-slate-50 overflow-hidden relative pb-16 lg:pb-0">
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden lg:flex inset-y-0 left-0 z-50 relative bg-slate-900 flex-col shadow-2xl transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'w-64' : 'w-20'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-30">
          <div className="flex items-center gap-1 sm:gap-4 flex-1 min-w-0">
            {/* Custom UI Back/Forward Buttons (Desktop Only) */}
            <div className="hidden lg:flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
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

            <h2 className="hidden lg:block ml-2 text-sm md:text-lg font-bold text-slate-800 truncate">
              {NAVIGATION_ITEMS.find(i => i.id === activeTab)?.label || 'Overview'}
            </h2>
            
            {/* Mobile Header Title */}
            <h1 className="lg:hidden font-bold text-lg tracking-tight truncate text-slate-900">
              {agencyName.split(' ')[0]} <span className="text-blue-600 font-normal">{agencyName.split(' ').slice(1).join(' ')}</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0 relative">
            <span className="hidden sm:inline-block bg-slate-100 px-3 py-1 rounded-full text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              Authorized
            </span>
            
            {/* Desktop Profile */}
            <div className="hidden lg:flex w-8 h-8 md:w-9 md:h-9 rounded-full bg-blue-100 border border-blue-200 items-center justify-center text-blue-700 text-xs font-bold shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            
            {/* Mobile Profile Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold shadow-sm"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
            
            {/* Mobile Profile Dropdown Overlay */}
            {isMobileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden lg:hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-500 truncate font-medium mt-0.5">{user.email}</p>
                  </div>
                  <div className="p-2">
                    {NAVIGATION_ITEMS.filter(item => !['dashboard', 'total-clients', 'agent-payment', 'disbursement'].includes(item.id)).map(item => (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-sm rounded-xl transition-colors flex items-center gap-3 ${activeTab === item.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50 font-medium'}`}
                      >
                        <span className="text-lg">{item.icon}</span> <span>{item.label}</span>
                      </button>
                    ))}
                    <div className="h-px bg-slate-100 my-1 mx-2"></div>
                    <button 
                      onClick={onLogout}
                      className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-3 font-medium"
                    >
                      <span className="text-lg">🚪</span> <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-between items-center z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {[
          { id: 'dashboard', label: 'DASHBOARD', icon: LayoutGrid },
          { id: 'total-clients', label: 'CLIENTS', icon: Users },
          { id: 'agent-payment', label: 'PAYMENTS', icon: CreditCard },
          { id: 'disbursement', label: 'DISBURSEMENT', icon: Banknote },
        ].map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-full py-2 mx-1 rounded-2xl transition-all ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[9px] font-bold tracking-wider`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

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
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 0.5rem);
        }
      `}</style>
    </div>
  );
};

export default Layout;
