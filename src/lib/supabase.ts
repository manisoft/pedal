import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
  total_distance: number;
  total_elevation: number;
  ride_count: number;
}

export const getProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await createProfile(userId, userData.user.email?.split('@')[0] || 'user');
          // Fetch the newly created profile
          const { data: newProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          return newProfile;
        }
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error in getProfile:', error);
    throw error;
  }
};

export const updateProfile = async (userId: string, updates: Partial<Database['public']['Tables']['profiles']['Update']>) => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
};

export const createProfile = async (userId: string, username: string) => {
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingProfile) {
    return existingProfile;
  }

  const newProfile = {
    id: userId,
    username,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    total_distance: 0,
    total_elevation: 0,
    ride_count: 0,
    full_name: '',
    avatar_url: ''
  };

  const { error } = await supabase
    .from('profiles')
    .insert([newProfile]);

  if (error) throw error;

  return newProfile;
};

export const startRide = async (userId: string, initialData: Partial<Database['public']['Tables']['rides']['Insert']>) => {
  const { data, error } = await supabase
    .from('rides')
    .insert({
      user_id: userId,
      is_live: true,
      route_data: initialData.route_data, // Use route_data for the ride
      ...initialData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateRide = async (rideId: string, updates: Partial<Database['public']['Tables']['rides']['Update']>) => {
  const { error } = await supabase
    .from('rides')
    .update(updates)
    .eq('id', rideId);

  if (error) throw error;
};

export const endRide = async (rideId: string, finalData: Partial<Database['public']['Tables']['rides']['Update']>) => {
  const { error } = await supabase
    .from('rides')
    .update({
      is_live: false,
      end_time: new Date().toISOString(),
      ...finalData,
    })
    .eq('id', rideId);

  if (error) throw error;
};

export const updateUserEmail = async (email: string) => {
  const { data, error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
  return data;
};

export const updateUserPassword = async (password: string) => {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
};

export const deleteUserAccount = async () => {
  const { error } = await supabase.rpc('delete_user_account');
  if (error) throw error;
};

export const getOrCreateProfile = async (userId: string, username: string) => {
  // Fetch the profile without triggering recursion
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  // If profile exists, return it
  if (existingProfile) return existingProfile;

  // If no profile exists, create one
  const newProfile = {
    id: userId,
    username: username,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    total_distance: 0,
    total_elevation: 0,
    ride_count: 0,
    full_name: '',
    avatar_url: ''
  };

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert([newProfile])
    .select()
    .single();

  if (createError) throw createError;

  return createdProfile;
};