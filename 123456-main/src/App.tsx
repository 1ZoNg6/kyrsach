import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useAppSettingsStore } from './store/AppSettingStore.ts';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Messages from './pages/Messages';
import Teams from './pages/Teams';
import Statistics from './pages/Statistics';
import AdminPanel from './pages/AdminPanel';
import Layout from './components/Layout';

function PrivateRoute({ children, requiredRoles = [] }: { children: React.ReactNode, requiredRoles?: string[] }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function App() {
  const { loadUser } = useAuthStore();
  const { loadSettings } = useAppSettingsStore();

  useEffect(() => {
    loadUser();
    loadSettings();
  }, [loadUser, loadSettings]);

  return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/tasks" element={
            <PrivateRoute>
              <Layout>
                <Tasks />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Layout>
                <Profile />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/settings" element={
            <PrivateRoute>
              <Layout>
                <Settings />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/messages" element={
            <PrivateRoute>
              <Layout>
                <Messages />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/teams" element={
            <PrivateRoute>
              <Layout>
                <Teams />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/statistics" element={
            <PrivateRoute requiredRoles={['admin', 'manager']}>
              <Layout>
                <Statistics />
              </Layout>
            </PrivateRoute>
          } />
          <Route path="/admin" element={
            <PrivateRoute requiredRoles={['admin']}>
              <Layout>
                <AdminPanel />
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
  );
}

export default App;