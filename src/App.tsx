import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { FluentProvider } from '@fluentui/react-components';
import { useThemeStore } from './store/themeStore';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import LiveTracker from './pages/LiveTracker';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import { supabase } from './lib/supabase';
import TestConnection from './pages/TestConnection';
import PWAPrompt from './components/PWAPrompt';
import RideDetail from './pages/RideDetail';
import RecentRides from './pages/RecentRides';   // Verify this import exists and path is correct
import AdminDashboard from './pages/AdminDashboard'; // Import AdminDashboard

function App() {
  const { theme, isDarkMode } = useThemeStore();
  const [session, setSession] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [userRole, setUserRole] = React.useState<string | null>(null);

  useEffect(() => {
    // Update document class for dark mode
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('Error fetching user:', userError);
          setUserRole('user'); // Default to 'user' if no user is found
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user role:', profileError);
          setUserRole('user'); // Default to 'user' if role fetch fails
        } else {
          setUserRole(profile?.role || 'user');
        }
      } catch (error) {
        console.error('Unexpected error fetching user role:', error);
        setUserRole('user'); // Default to 'user' in case of unexpected errors
      }
    };

    fetchUserRole();
  }, [session]);

  if (loading || userRole === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  const isAdmin = userRole === 'admin'; // Check if the user role is admin

  return (
    <FluentProvider theme={theme}>
      <PWAPrompt />
      <div className={isDarkMode ? 'dark' : ''}>
        <BrowserRouter>
          {session ? (
            <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
              {/* Conditionally render Navigation only for non-admin users */}
              {!isAdmin && (
                <div className="pb-16 md:pb-0"> {/* Add padding for mobile navigation */}
                  <Navigation />
                </div>
              )}
              <main className="container mx-auto px-4 py-4 md:py-8">
                <Routes>
                  <Route path="/" element={isAdmin ? <AdminDashboard /> : <Dashboard />} />
                  <Route path="/live" element={<LiveTracker />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/test" element={<TestConnection />} />
                  <Route path="/ride-detail/:rideId" element={<RideDetail />} />
                  <Route path="/recent-rides" element={<RecentRides />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          ) : (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
              <Routes>
                <Route path="/*" element={<Auth />} />
              </Routes>
            </div>
          )}
        </BrowserRouter>
      </div>
    </FluentProvider>
  );
}

export default App;