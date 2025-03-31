import { Link, useLocation } from 'react-router-dom';
import {
  TabList,
  Tab,
  Title1,
  Button,
  useId,
  Text
} from '@fluentui/react-components';
import {
  Bike,
  Activity,
  Trophy,
  User,
  LogOut,
  Sun,
  Moon,
  Crosshair  // Add Crosshair icon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { useVersionStore } from '../store/versionStore';
import { FontSizes } from '@fluentui/react';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { version } = useVersionStore();
  const tabListId = useId();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleLocateMe = () => {
    // Dispatch a custom event that LiveTracker will listen for
    const event = new CustomEvent('locateMe');
    window.dispatchEvent(event);
  };

  const NavLink = ({ to, icon: Icon, label }) => (
    <Link
      to={to}
      className={`flex flex-col items-center p-2 rounded-lg transition-all duration-300 transform hover:scale-105
        ${location.pathname === to
          ? 'text-brand-600 dark:text-brand-400'
          : 'text-gray-600 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-300'}`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-xs mt-1">{label}</span>
    </Link>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <header className="hidden md:block bg-white/30 dark:bg-gray-900/30 backdrop-blur-[4px] border-b border-gray-200/30 dark:border-gray-800/30 fixed top-0 left-0 right-0 z-50 overflow-hidden">
        <div className="container mx-auto px-4 overflow-hidden">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Title1 className="text-2xl md:text-3xl font-bold text-brand-600 dark:text-brand-400 animate-fade-in">
                Pedal
              </Title1>
              <Text className="text-subtle" style={{ fontSize: 9 }}>v{version}</Text>
            </div>
            <TabList
              selectedValue={location.pathname}
              id={tabListId}
              className="flex-1 mx-8"
            >
              <Tab icon={<Bike />} value="/">
                <Link to="/">Dashboard</Link>
              </Tab>
              <Tab icon={<Activity />} value="/live">
                <Link to="/live">Live Track</Link>
              </Tab>
              <Tab icon={<Trophy />} value="/leaderboard">
                <Link to="/leaderboard">Leaderboard</Link>
              </Tab>
              <Tab icon={<User />} value="/profile">
                <Link to="/profile">Profile</Link>
              </Tab>
            </TabList>
            <div className="flex items-center gap-2">
              <Button
                icon={isDarkMode ? <Sun /> : <Moon />}
                onClick={toggleTheme}
                appearance="subtle"
                className="p-2 transition-transform hover:scale-105"
              />
              <Button
                icon={<LogOut />}
                onClick={handleSignOut}
                appearance="subtle"
                className="transition-transform hover:scale-105"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/30 dark:bg-gray-900/30 backdrop-blur-[4px] border-t border-gray-200/30 dark:border-gray-800/30 z-[450] overflow-hidden">
        <div className="flex justify-around items-center py-2 px-4">
          <NavLink to="/" icon={Bike} label="Dashboard" />
          <NavLink to="/live" icon={Activity} label="Track" />
          <NavLink to="/leaderboard" icon={Trophy} label="Leaders" />
          <NavLink to="/profile" icon={User} label="Profile" />
        </div>
      </nav>

      {/* Mobile Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="md:hidden fixed top-4 right-4 p-2 rounded-full bg-white/30 dark:bg-gray-800/30 backdrop-blur-[4px] shadow-lg z-50 transition-transform hover:scale-105"
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5 text-yellow-500" />
        ) : (
          <Moon className="h-5 w-5 text-gray-600" />
        )}
      </button>
    </>
  );
};

export default Navigation;