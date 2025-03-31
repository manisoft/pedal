import React, { useEffect, useState } from 'react';
import {
  Card,
  Title2,
  Body1,
  Button,
  Spinner,
  Text
} from '@fluentui/react-components';
import { Play, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { LocationRegular, MountainTrail20Regular, EarthLeaf20Regular, BookNumber20Regular } from '@fluentui/react-icons';
import { getOrCreateProfile } from '../lib/supabase';  // Add this import

interface RideSummary {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  distance: number;
  elevation_gain: number;
  average_speed: number;
  max_speed: number;
  route_data: any;
}

const formatDuration = (start: string, end: string) => {
  const duration = new Date(end).getTime() - new Date(start).getTime();
  const hours = Math.floor(duration / 3600000);
  const minutes = Math.floor((duration % 3600000) / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const EMISSION_FACTOR = 200; // g CO₂/km for car emissions

const Dashboard = () => {
  const navigate = useNavigate();
  const [recentRides, setRecentRides] = useState<RideSummary[]>([]);
  const [username, setUsername] = useState('');
  const [weeklyStats, setWeeklyStats] = useState({
    totalDistance: 0,
    totalElevation: 0,
    totalRides: 0,
    co2Saved: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch or create the profile
        const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0] || 'user');
        if (profile) {
          setUsername(profile.username);
        }

        // Fetch recent rides
        const { data: rides } = await supabase
          .from('rides')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_live', false)
          .order('start_time', { ascending: false })
          .limit(5);

        setRecentRides(rides || []);

        // Calculate weekly stats
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const { data: weekRides } = await supabase
          .from('rides')
          .select('distance, elevation_gain')
          .eq('user_id', user.id)
          .eq('is_live', false)
          .gte('start_time', oneWeekAgo.toISOString());

        if (weekRides) {
          const stats = weekRides.reduce((acc, ride) => ({
            totalDistance: acc.totalDistance + (ride.distance || 0),
            totalElevation: acc.totalElevation + (ride.elevation_gain || 0),
            totalRides: acc.totalRides + 1,
            co2Saved: acc.co2Saved + ((ride.distance / 1000) * EMISSION_FACTOR)
          }), {
            totalDistance: 0,
            totalElevation: 0,
            totalRides: 0,
            co2Saved: 0
          });

          setWeeklyStats(stats);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-24 md:pb-0"> {/* Added padding-bottom for mobile */}
      <section className="relative bg-card/5 px-4 py-8 md:py-12 md:px-8 mica">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="text-2xl md:text-3xl font-semibold">Welcome Back{username ? `, ${username}` : ''}!</div>
              <div className="text-subtle">Here's your cycling activity overview</div>
            </div>
            <Button
              appearance="primary"
              icon={<Play />}
              onClick={() => navigate('/live')}
              className="hover-lift click-animation backdrop-blur-[4px] bg-white/30 dark:bg-gray-800/30"
            >
              Start Ride
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Distance', value: `${(weeklyStats.totalDistance / 1000).toFixed(1)} km`, icon: <LocationRegular /> },
          { label: 'Elevation Gain', value: `${Math.round(weeklyStats.totalElevation)} m`, icon: <MountainTrail20Regular /> },
          { label: 'CO₂ Saved', value: `${(weeklyStats.co2Saved / 1000).toFixed(1)} kg`, icon: <EarthLeaf20Regular /> },
          { label: 'Total Rides', value: weeklyStats.totalRides, icon: <BookNumber20Regular /> }
        ].map((stat, index) => (
          <Card key={index} className="p-4 hover-lift depth-1 text-default"
            style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex flex-col gap-2">
              <div className="p-2 bg-brand/10 rounded-lg w-fit">
                {React.cloneElement(stat.icon as any, { className: "text-brand h-5 w-5" })}
              </div>
              <div className="text-2xl font-semibold">{stat.value}</div>
              <Text className="text-subtle">{stat.label}</Text>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Rides */}
      <Card className="p-6 depth-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-brand" />
            <Title2>Recent Rides</Title2>
          </div>
          <Button
            appearance="subtle"
            icon={<ArrowRight />}
            onClick={() => navigate('/recent-rides')}
          >
            View All
          </Button>
        </div>
        <div className="space-y-4">
          {recentRides.map((ride, index) => (
            <div
              key={ride.id}
              className="border rounded-lg p-4 hover-lift click-animation cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => navigate(`/ride-detail/${ride.id}`)} // Navigate to RideDetail page
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {ride.title || format(new Date(ride.start_time), 'MMMM d, yyyy')}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-2">
                    <div>
                      <Body1 className="text-gray-600">Distance</Body1>
                      <div className="font-semibold">{(ride.distance / 1000).toFixed(1)} km</div>
                    </div>
                    <div>
                      <Body1 className="text-gray-600">Duration</Body1>
                      <div className="font-semibold">{formatDuration(ride.start_time, ride.end_time)}</div>
                    </div>
                    <div>
                      <Body1 className="text-gray-600">Avg Speed</Body1>
                      <div className="font-semibold">{ride.average_speed.toFixed(1)} km/h</div>
                    </div>
                    <div>
                      <Body1 className="text-gray-600">Max Speed</Body1>
                      <div className="font-semibold">{ride.max_speed.toFixed(1)} km/h</div>
                    </div>
                    <div>
                      <Body1 className="text-gray-600">Elevation</Body1>
                      <div className="font-semibold">{Math.round(ride.elevation_gain)} m</div>
                    </div>
                    <div>
                      <Body1 className="text-gray-600">CO₂ Saved</Body1>
                      <div className="font-semibold">
                        {((ride.distance / 1000) * EMISSION_FACTOR / 1000).toFixed(1)} kg
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-48 h-32">
                  <MapContainer
                    bounds={getRouteBounds(ride.route_data)}
                    className="h-full w-full rounded-lg"
                    zoomControl={false}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {ride.route_data && (
                      <Polyline
                        positions={getRoutePositions(ride.route_data)}
                        color="#007FFF"
                        weight={3}
                      />
                    )}
                  </MapContainer>
                </div>
              </div>
            </div>
          ))}
          {recentRides.length === 0 && (
            <div className="text-center py-12 text-subtle">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <Text>No rides recorded yet. Start your first ride!</Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const getRoutePositions = (routeData: any) => {
  if (!routeData || !routeData.geometry || !routeData.geometry.coordinates) {
    return [];
  }
  return routeData.geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng]);
};

const getRouteBounds = (routeData: any) => {
  if (!routeData || !routeData.geometry || !routeData.geometry.coordinates) {
    return [[0, 0], [0, 0]];
  }
  const positions = getRoutePositions(routeData);
  const lats = positions.map(([lat]) => lat);
  const lngs = positions.map(([, lng]) => lng);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  ];
};

export default Dashboard;