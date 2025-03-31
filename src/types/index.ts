export interface User {
  id: string;
  email: string;
  name: string;
  profile_image?: string;
}

export interface Ride {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  distance: number;
  elevation_gain: number;
  average_speed: number;
  max_speed: number;
  route_data: GeoJSON.Feature;
  is_live: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  profile_image?: string;
  total_distance: number;
  total_elevation: number;
  ride_count: number;
  rank: number;
}