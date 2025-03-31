import React, { useState } from 'react';
import {
  Card,
  Title1,
  Input,
  Button,
  Text,
  MessageBar,
  MessageBarBody,
  Spinner
} from '@fluentui/react-components';
import { Mail, Lock, User, Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useThemeStore } from '../store/themeStore';

const Auth = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const createProfile = async (userId: string, username: string) => {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: username || email.split('@')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        full_name: '', // Add this line
        total_distance: 0,
        total_elevation: 0,
        ride_count: 0,
        avatar_url: '' // Add this line
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw profileError;
    }
  };

  const verifyProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      // Create profile if it doesn't exist
      await createProfile(userId, username);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isSignUp) {
        // Simplified sign-up without metadata
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          setSuccess('Please check your email for the confirmation link to complete your registration.');
          setEmail('');
          setPassword('');
          setUsername('');
        }
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (signInData.user) {
          // Ensure profile exists on signin
          await verifyProfile(signInData.user.id);
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 dark:bg-gray-900">
      {/* Add theme toggle button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-3 rounded-full bg-white/30 dark:bg-gray-800/30 backdrop-blur-[4px] shadow-lg transition-transform hover:scale-105"
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5 text-yellow-500" />
        ) : (
          <Moon className="h-5 w-5 text-gray-600" />
        )}
      </button>

      <Card className="w-full max-w-md p-8 depth-3">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex flex-col items-center space-y-4 mb-6">
              <div className="p-3 rounded-full">
                <img
                  src="/pwa-512x512.png"
                  alt="Logo"
                  className="w-18 h-18"
                />
              </div>
              <Title1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">
                Welcome to Pedal
              </Title1>
              <Text className="text-subtle">
                {isSignUp ? 'Create your account' : 'Sign in to your account'}
              </Text>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleAuth}>
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Username
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full"
                  placeholder="Choose a username"
                  required={isSignUp}
                  minLength={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
                placeholder="Enter your password"
                minLength={6}
              />
            </div>

            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}

            {success && (
              <MessageBar intent="success">
                <MessageBarBody>{success}</MessageBarBody>
              </MessageBar>
            )}

            <Button
              appearance="primary"
              type="submit"
              disabled={loading}
              className="w-full py-6 transition-all hover:opacity-90 active:scale-95"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner size="tiny" />
                  <span>Please wait...</span>
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </Button>
          </form>

          <div className="text-center pt-4">
            <Button
              appearance="subtle"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="w-full transition-all hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Auth;