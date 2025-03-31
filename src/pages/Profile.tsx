import React, { useState, useEffect } from 'react';
import {
  Card,
  Title2,
  Input,
  Button,
  Avatar,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  Label,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogActions,
  Select,
  TabList,
  Tab,
  makeStyles,
  Title3
} from '@fluentui/react-components';
import { LogOut, Save, User, Bike } from 'lucide-react';
import { supabase, updateUserEmail, updateUserPassword, getProfile } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useVersionStore } from '../store/versionStore'; // Import version store
import { PasswordReset48Regular } from '@fluentui/react-icons';

// Add bike types
const BIKE_TYPES = [
  'Road Bike',
  'Mountain Bike',
  'Gravel Bike',
  'City Bike',
  'Hybrid Bike',
  'BMX',
  'Electric Bike',
  'Folding Bike',
  'Other'
] as const;

interface BikeInfo {
  brand: string;
  model: string;
  type: typeof BIKE_TYPES[number];
  tireSize: string;
  year?: string;
}

interface ProfileFormData extends ProfileData {
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  avatar_url: string;
}

interface ProfileData {
  username: string;
  full_name: string;
  height: number;
  weight: number;
  bikeInfo: BikeInfo;
}

const useStyles = makeStyles({
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem',
    paddingBottom: '5rem', // Add padding for mobile menu
    '@media (min-width: 768px)': {
      paddingTop: '5rem', // Add padding for desktop header
      paddingBottom: '1rem',
    },
  },
  header: {
    marginBottom: '2rem',
    padding: '1.5rem',
    background: 'var(--colorNeutralBackground1)',
    borderRadius: 'var(--borderRadiusLarge)',
    boxShadow: 'var(--shadow2)',
  },
  formSection: {
    display: 'grid',
    gap: '1.5rem',
    marginTop: '2rem',
  },
  fields: {
    display: 'grid',
    gap: '1.5rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '2rem',
    padding: '1rem',
    borderTop: '1px solid var(--colorNeutralStroke1)',
  },
  avatarUpload: {
    position: 'relative',
    cursor: 'pointer',
    '&:hover .avatar-overlay': {
      opacity: 1,
    },
  },
  avatarOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    borderRadius: '50%',
    opacity: 0,
    transition: 'opacity 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  bikeCard: {
    padding: '1.5rem',
    background: 'var(--colorNeutralBackground1)',
    borderRadius: 'var(--borderRadiusLarge)',
    border: '1px solid var(--colorNeutralStroke1)',
    // Removed hover animation
  },
  personalCard: {
    padding: '1.5rem',
    background: 'var(--colorNeutralBackground1)',
    borderRadius: 'var(--borderRadiusLarge)',
    border: '1px solid var(--colorNeutralStroke1)',
  },
  bikeSection: {
    marginBottom: '1.5rem',
    '&:last-child': {
      marginBottom: 0,
    },
  },
  bikeFields: {
    display: 'grid',
    gap: '1.5rem',
    gridTemplateColumns: '1fr',
    '@media (min-width: 768px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  },
  profileInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
    marginTop: '24px',
    borderTop: `1px solid var(--colorNeutralStroke1)`,
    color: 'var(--colorNeutralForeground3)',
  },
});

const Profile = () => {
  const styles = useStyles();
  const navigate = useNavigate();
  const { version } = useVersionStore(); // Get app version
  const [activeTab, setActiveTab] = useState('personal');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    email: '',
    full_name: '',
    avatar_url: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    height: 0,
    weight: 0,
    bikeInfo: {
      brand: '',
      model: '',
      type: 'Road Bike',
      tireSize: '',
    },
  });
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [genericError, setGenericError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const ensureProfile = async (userId: string) => {
    try {
      const profile = await getProfile(userId);
      setProfile(profile);
    } catch (error) {
      console.error('Error ensuring profile:', error);
      setError('Failed to load profile. Please try refreshing the page.');
    }
  };

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserEmail(user.email || '');
          await ensureProfile(user.id);
        }

        await fetchAchievements();
      } catch (error) {
        console.error('Error initializing profile:', error);
        setError('Failed to initialize profile');
      } finally {
        setLoading(false);
      }
    };

    initializeProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        username: profile.username || '',
        email: userEmail || '',
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || '',
        height: profile.height || '', // Changed from 0 to empty string
        weight: profile.weight || '', // Changed from 0 to empty string
        bikeInfo: profile.bike_info || {
          brand: '',
          model: '',
          type: 'Road Bike',
          tireSize: '',
          year: ''
        },
      }));
    }
  }, [profile, userEmail]);

  const fetchAchievements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setUpdating(true);
      setError('');
      setSuccess('');
      setGenericError('');

      // Prepare update data
      const updates = {
        username: formData.username,
        full_name: formData.full_name,
        avatar_url: formData.avatar_url,
        height: formData.height ? Number(formData.height) : null,
        weight: formData.weight ? Number(formData.weight) : null,
        bike_info: formData.bikeInfo,
        updated_at: new Date().toISOString(),
      };

      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (profileError) {
        if (profileError.code === '23505' || profileError.message.includes('duplicate')) {
          // Handle duplicate username error using modal
          setGenericError('This username is already taken. Please choose another.');
          setIsModalOpen(true);
        } else {
          // Handle generic errors
          setGenericError('An unexpected error occurred. Please try again.');
          setIsModalOpen(true);
        }
        throw profileError;
      }

      // Update email if changed
      if (formData.email !== userEmail) {
        await updateUserEmail(formData.email);
      }

      setSuccess('Profile updated successfully!');
      await ensureProfile(profile.id);

    } catch (error: any) {
      console.error('Error updating profile:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordUpdate = async () => {
    try {
      setUpdating(true);
      setError('');

      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      await updateUserPassword(formData.newPassword);
      setShowPasswordDialog(false);
      setSuccess('Password updated successfully!');

      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

    } catch (error: any) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !profile) return;

      setUploadingAvatar(true);

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      await updateProfile(profile.id, {
        avatar_url: publicUrl
      });

      setFormData(prev => ({
        ...prev,
        avatar_url: publicUrl
      }));

      setSuccess('Avatar updated successfully!');
    } catch (error: any) {
      setError('Failed to upload avatar: ' + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    window.location.reload(); // Refresh the profile page
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner size="large" /></div>;
  if (error) return <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>;

  return (
    <div className="space-y-6 animate-fadeIn pb-20 md:pb-0"> {/* Added padding-bottom for mobile */}
      <section className="relative bg-card/5 px-4 py-8 md:py-12 md:px-8 mica">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="text-2xl md:text-3xl font-semibold">Your Profile</div>
              <div className="text-subtle">Manage your account and preferences</div>
            </div>
            <Button
              appearance="subtle"
              icon={<LogOut />}
              onClick={handleSignOut}
              className="block md:hidden" // Hidden on desktop (md+), visible on mobile
            >
              Sign Out
            </Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <Card className="p-6 depth-2">
          {success && (
            <MessageBar intent="success" className="mb-4">
              <MessageBarBody>{success}</MessageBarBody>
            </MessageBar>
          )}

          {error && (
            <MessageBar intent="error" className="mb-4">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
          )}

          <Card className={styles.header}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar
                  image={{ src: formData.avatar_url }}
                  name={formData.full_name || formData.username}
                  size={72}
                  className="ring-4 ring-brand/10"
                />
                <div className={styles.profileInfo}>
                  <Title2>{formData.full_name || formData.username}</Title2>
                  <Text className="text-subtle text-sm">{formData.email}</Text>
                </div>
              </div>
            </div>
          </Card>

          <TabList
            selectedValue={activeTab}
            onTabSelect={(_, data) => setActiveTab(data.value as string)}
            className="mb-4"
          >
            <Tab icon={<User />} value="personal">Personal Info</Tab>
            <Tab icon={<Bike />} value="bike">Bike Details</Tab>
          </TabList>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {activeTab === 'personal' ? (
              <Card className={styles.personalCard}>
                <Title3 className="mb-6">Profile Information</Title3> {/* Added title */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label required>Username</Label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter username"
                      className="w-full"
                    />
                    {error && <Text className="error-text" appearance="error">{error}</Text>}
                  </div>
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Enter your full name"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label>Profile Image URL</Label>
                    <Input
                      value={formData.avatar_url}
                      onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                      placeholder="Enter profile image URL"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label required>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter your email"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      placeholder="Enter height in cm"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label>Weight</Label>
                    <Input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="Enter weight in kg"
                      className="w-full"
                    />
                  </div>
                </div>
              </Card>
            ) : (
              <Card className={styles.bikeCard}>
                <Title3 className="mb-6">Bike Information</Title3>
                <div className={styles.bikeFields}>
                  <div className={styles.field}>
                    <Label required>Bike Type</Label>
                    <Select
                      value={formData.bikeInfo.type}
                      onChange={(e, data) => setFormData({
                        ...formData,
                        bikeInfo: { ...formData.bikeInfo, type: data.value as typeof BIKE_TYPES[number] }
                      })}
                    >
                      {BIKE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </Select>
                  </div>

                  <div className={styles.field}>
                    <Label>Brand</Label> {/* Removed required indicator */}
                    <Input
                      value={formData.bikeInfo.brand}
                      onChange={(e) => setFormData({
                        ...formData,
                        bikeInfo: { ...formData.bikeInfo, brand: e.target.value }
                      })}
                      placeholder="Enter bike brand"
                      className="w-full"
                    />
                  </div>

                  <div className={styles.field}>
                    <Label>Model</Label>
                    <Input
                      value={formData.bikeInfo.model}
                      onChange={(e) => setFormData({
                        ...formData,
                        bikeInfo: { ...formData.bikeInfo, model: e.target.value }
                      })}
                      placeholder="Enter model name"
                      className="w-full"
                    />
                  </div>

                  <div className={styles.field}>
                    <Label>Tire Size (inches)</Label>
                    <Input
                      value={formData.bikeInfo.tireSize}
                      onChange={(e) => setFormData({
                        ...formData,
                        bikeInfo: { ...formData.bikeInfo, tireSize: e.target.value }
                      })}
                      className="w-full"
                    />
                  </div>

                  <div className={styles.field}>
                    <Label>Year</Label>
                    <Input
                      value={formData.bikeInfo.year}
                      onChange={(e) => setFormData({
                        ...formData,
                        bikeInfo: { ...formData.bikeInfo, year: e.target.value }
                      })}
                      placeholder="e.g. 2023"
                      className="w-full"
                    />
                  </div>
                </div>
              </Card>
            )}

            <div className="flex justify-between items-center">
              <Button
                type="submit"
                appearance="primary"
                icon={<Save />}
                disabled={updating}
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                appearance="subtle"
                icon={<PasswordReset48Regular />}
                onClick={() => setShowPasswordDialog(true)}
              >
                Change Password
              </Button>
            </div>

            <Dialog open={showPasswordDialog} onOpenChange={(_, { open }) => setShowPasswordDialog(open)}>
              <DialogSurface>
                <DialogBody>
                  <DialogTitle>Change Password</DialogTitle>
                  <div className="space-y-4 py-4">
                    <Input
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      placeholder="Current Password"
                    />
                    <Input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="New Password"
                    />
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Confirm New Password"
                    />
                  </div>
                  <DialogActions>
                    <Button appearance="secondary" onClick={() => setShowPasswordDialog(false)}>
                      Cancel
                    </Button>
                    <Button appearance="primary" onClick={handlePasswordUpdate} disabled={updating}>
                      Update Password
                    </Button>
                  </DialogActions>
                </DialogBody>
              </DialogSurface>
            </Dialog>

            <footer className={styles.footer}>
              <Text size={100}>Version {version}</Text>
            </footer>
          </form>
        </Card>
      </div>

      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={(_, { open }) => setIsModalOpen(open)}>
          <DialogSurface>
            <DialogTitle>Error</DialogTitle>
            <DialogBody>{genericError}</DialogBody>
            <DialogActions>
              <Button appearance="primary" onClick={handleModalClose}>
                OK
              </Button>
            </DialogActions>
          </DialogSurface>
        </Dialog>
      )}
    </div>
  );
};

export default Profile;