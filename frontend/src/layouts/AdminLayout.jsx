import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Inbox,
  BarChart3,
  Users,
  ExternalLink,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Ticket Queue', path: '/admin/tickets', icon: Inbox },
    { label: 'Operations Dashboard', path: '/admin/dashboard', icon: BarChart3 },
    { label: 'Authors Directory', path: '/admin/authors', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col text-ink-900 font-sans">
      {/* Admin Ops Top Navigation */}
      <header className="bg-ink-950 text-white border-b border-ink-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Logo & Ops Badge */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/admin/tickets')}>
              <div className="w-10 h-10 rounded-xl bg-ink-800 border border-ink-700 text-brand-light flex items-center justify-center font-serif text-xl font-bold">
                B
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-serif text-base font-bold text-white tracking-tight leading-none">
                    BookLeaf Operations
                  </span>
                  <span className="bg-brand/80 text-[10px] font-semibold uppercase px-2 py-0.5 rounded tracking-wider text-white">
                    Admin
                  </span>
                </div>
                <span className="text-[11px] text-ink-400 font-medium block mt-1 leading-none">
                  Support Triage & AI Dispatch
                </span>
              </div>
            </div>

            {/* Ops Nav Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide uppercase transition ${
                        isActive
                          ? 'bg-ink-800 text-white border border-ink-700 shadow-xs'
                          : 'text-ink-300 hover:text-white hover:bg-ink-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-brand-light" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Right Tools & Admin Profile */}
            <div className="flex items-center gap-3">
              {/* Swagger Docs link */}
              <a
                href="http://localhost:5000/api/docs"
                target="_blank"
                rel="noreferrer"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-300 hover:text-white bg-ink-900 border border-ink-800 hover:border-ink-700 transition"
              >
                <span>Swagger Docs</span>
                <ExternalLink className="w-3 h-3 text-ink-400" />
              </a>

              {/* Socket Status */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink-900 text-[11px] text-ink-300 border border-ink-800"
                title={connected ? 'Connected to live admin socket room' : 'Connecting to socket server...'}
              >
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="hidden sm:inline">{connected ? 'Live Sync' : 'Reconnecting'}</span>
              </div>

              {/* Admin Profile */}
              <div className="flex items-center gap-2 pl-2 border-l border-ink-800">
                <div className="w-8 h-8 rounded-full bg-brand text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-white leading-none">{user?.name}</p>
                  <p className="text-[10px] text-ink-400 leading-none mt-1">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 text-ink-400 hover:text-red-400 rounded-lg hover:bg-ink-900 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
