import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, LifeBuoy, Library, PlusCircle, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Button } from '../components/common/Button';

export const AuthorLayout = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/author/dashboard', icon: BookOpen },
    { label: 'My Books', path: '/author/books', icon: Library },
    { label: 'Support Tickets', path: '/author/tickets', icon: LifeBuoy },
  ];

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col text-ink-900 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-paper-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/author/dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-serif text-xl font-bold shadow-xs">
                B
              </div>
              <div>
                <span className="font-serif text-lg font-bold text-ink-950 tracking-tight block leading-tight">
                  BookLeaf <span className="text-brand font-normal italic">Publishing</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-ink-400">
                  Author Support Portal
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? 'bg-paper-100 text-brand font-semibold'
                          : 'text-ink-600 hover:text-ink-950 hover:bg-paper-100/60'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Right Action & Profile Area */}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                icon={PlusCircle}
                onClick={() => navigate('/author/tickets/new')}
                className="hidden sm:inline-flex"
              >
                Raise Support Ticket
              </Button>

              {/* Status indicator */}
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-paper-100 text-[11px] font-medium text-ink-600 border border-paper-200"
                title={connected ? 'Live real-time socket connected' : 'Connecting to real-time events...'}
              >
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-sage animate-pulse' : 'bg-amber-500'}`} />
                <span>{connected ? 'Live Sync' : 'Reconnecting'}</span>
              </div>

              {/* Author Profile */}
              <div className="flex items-center gap-2 pl-2 border-l border-paper-200">
                <div className="w-9 h-9 rounded-full bg-ink-900 text-white font-medium text-xs flex items-center justify-center shadow-xs">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-ink-900 leading-none">{user?.name}</p>
                  <p className="text-[10px] text-ink-500 leading-none mt-1">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 text-ink-400 hover:text-red-600 rounded-lg hover:bg-paper-100 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden border-t border-paper-200/80 px-4 py-2 flex items-center justify-around bg-paper-50">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium ${
                    isActive ? 'text-brand font-semibold' : 'text-ink-500'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-paper-200/80 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-ink-400">
          BookLeaf Publishing © {new Date().getFullYear()} — Author Support & Communication Portal. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
