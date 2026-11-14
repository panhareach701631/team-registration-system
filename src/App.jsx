import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { useAuth } from './hooks/useAuth';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

// Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import EventReport from './pages/EventReport';
import TeamMembers from './pages/TeamMembers';
import MemberRegister from './pages/MemberRegister';
import NotFound from './pages/NotFound';

function ProtectedAdminLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-[#101C32]">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 lg:pl-64 min-w-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminLoginWrapper() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <AdminLogin />;
}

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/admin" replace />} />
              <Route path="/admin" element={<AdminLoginWrapper />} />

              <Route element={<ProtectedAdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/members" element={<TeamMembers />} />
                <Route path="/admin/events/new" element={<CreateEvent />} />
                <Route path="/admin/events/:id/edit" element={<EditEvent />} />
                <Route path="/admin/events/:id/report" element={<EventReport />} />
              </Route>

              <Route path="/register/:token" element={<MemberRegister />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
