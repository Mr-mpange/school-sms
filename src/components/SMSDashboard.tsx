import React, { useState, useEffect } from 'react';
import { authService } from '@/lib/auth';
import AuthForm from './AuthForm';
import DashboardLayout from './DashboardLayout';

interface Admin {
  id: string;
  email: string;
  full_name: string;
  school_name: string;
  created_at: string;
  updated_at: string;
}

interface Session {
  id: string;
  admin_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

const SMSDashboard: React.FC = () => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on component mount
    const checkAuth = async () => {
      try {
        // Initialize default admin account if it doesn't exist
        await authService.createDefaultAdmin();

        const sessionToken = localStorage.getItem('sessionToken');
        if (sessionToken) {
          const result = await authService.validateSession(sessionToken);
          if (result.valid && result.admin) {
            setAdmin(result.admin);
            setSession({} as Session); // We don't need full session data for UI
          } else {
            localStorage.removeItem('sessionToken');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('sessionToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = async () => {
    // The AuthForm will handle storing the session token
    // We need to get the admin data after successful login
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (sessionToken) {
        const result = await authService.validateSession(sessionToken);
        if (result.valid && result.admin) {
          setAdmin(result.admin);
          setSession({} as Session);
        }
      }
    } catch (error) {
      console.error('Error getting admin data after login:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      if (sessionToken) {
        await authService.logout(sessionToken);
      }
      localStorage.removeItem('sessionToken');
      setAdmin(null);
      setSession(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails on server, clear local session
      localStorage.removeItem('sessionToken');
      setAdmin(null);
      setSession(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!admin || !session) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return <DashboardLayout user={admin} onLogout={handleLogout} />;
};

export default SMSDashboard;