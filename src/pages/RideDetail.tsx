import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Spinner, Text, Title2, Card } from '@fluentui/react-components';
import {
    LocationRegular,
    TimerRegular,
    ArrowTrendingLines20Regular,
    TopSpeedRegular,
    MountainTrail20Regular,
    EarthLeaf20Regular
} from '@fluentui/react-icons';
import { format } from 'date-fns';
import { Wind, Droplet, Sun, Thermometer, Cloud } from 'lucide-react';

const formatDuration = (start: string, end: string) => {
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const RideDetail = () => {
    const { rideId } = useParams();
    const [ride, setRide] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRide = async () => {
            try {
                const { data, error } = await supabase
                    .from('rides')
                    .select('*')
                    .eq('id', rideId)
                    .single();

                if (error) throw error;
                setRide(data);
            } catch (error) {
                console.error('Error fetching ride details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRide();
    }, [rideId]);

    const getRoutePositions = (routeData: any) => {
        if (!routeData || !routeData.geometry || !routeData.geometry.coordinates) {
            return [];
        }
        return routeData.geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng]);
    };

    const getWindDirectionArrow = (degree: number) => {
        return {
            transform: `rotate(${degree}deg)`,
        };
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spinner size="large" />
            </div>
        );
    }

    if (!ride) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Text>Ride not found.</Text>
            </div>
        );
    }


    return (
        <div className="h-screen flex flex-col">
            {/* Map Section */}
            <div
                className="absolute top-0 left-0 right-0"
                style={{
                    height: '50vh', // 50% of the screen height
                    width: '100%', // Full width of the viewport
                    overflow: 'hidden', // Prevent horizontal scrolling
                    zIndex: 0, // Ensure it is under the menu bar
                    margin: 0, // Remove all margins
                    padding: 0, // Remove all padding
                }}
            >
                <MapContainer
                    bounds={getRoutePositions(ride.route_data)}
                    className="h-full w-full"
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

            {/* Details Section */}
            <div
                className="absolute left-0 right-0"
                style={{
                    top: '50vh',
                    height: 'auto', // Adjust height based on content
                    overflowY: 'auto', // Allow scrolling if content overflows
                    zIndex: 1, // Ensure it is above the map
                    backgroundColor: 'var(--colorNeutralBackground1)', // Match Fluent Design background
                    paddingBottom: '5rem', // Add padding to avoid overlap with the bottom menu bar
                }}
            >
                <Card className="shadow depth-2 h-full p-6">
                    <Title2 className="mb-2">{ride.title}</Title2>
                    <div className="text-subtle mb-6">
                        <div className="text-lg mb-1">{format(new Date(ride.start_time), 'EEEE, MMMM do, yyyy')}</div>
                        <div className="flex gap-4">
                            <span>Started: {format(new Date(ride.start_time), 'h:mm a')}</span>
                            <span>Ended: {format(new Date(ride.end_time), 'h:mm a')}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Distance', value: `${(ride.distance / 1000).toFixed(1)} km`, icon: <LocationRegular /> },
                            { label: 'Duration', value: formatDuration(ride.start_time, ride.end_time), icon: <TimerRegular /> }, // Use the same function for duration
                            { label: 'Avg Speed', value: `${ride.average_speed.toFixed(1)} km/h`, icon: <ArrowTrendingLines20Regular /> },
                            { label: 'Max Speed', value: `${ride.max_speed.toFixed(1)} km/h`, icon: <TopSpeedRegular /> },
                            { label: 'Elevation', value: `${Math.round(ride.elevation_gain)} m`, icon: <MountainTrail20Regular /> },
                            { label: 'CO₂ Saved', value: `${((ride.distance / 1000) * 200 / 1000).toFixed(1)} kg`, icon: <EarthLeaf20Regular /> },
                        ].map((stat, index) => (
                            <div
                                key={index}
                                className="flex flex-col gap-2 bg-white/30 dark:bg-gray-800/30 backdrop-blur-md p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-brand/10 rounded-lg">
                                        {React.cloneElement(stat.icon, { className: 'text-brand h-5 w-5' })}
                                    </div>
                                    <Text className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</Text>
                                </div>
                                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">{stat.value}</Text>
                            </div>
                        ))}

                        {/* Weather Stats */}
                        {ride.start_weather && [
                            {
                                label: 'UV Index',
                                value: ride.start_weather.current.uv,
                                icon: <Sun />,
                            },
                            {
                                label: 'Temperature',
                                value: `${ride.start_weather.current.temp_c}°C`,
                                icon: <Thermometer />,
                            },
                            {
                                label: 'Humidity',
                                value: `${ride.start_weather.current.humidity}%`,
                                icon: <Droplet />,
                            },
                            {
                                label: 'Wind Speed',
                                value: `${ride.start_weather.current.wind_kph} kph`,
                                icon: <Wind />,
                            },
                            {
                                label: 'Wind Direction',
                                value: ride.start_weather.current.wind_dir,
                                icon: (
                                    <div className="flex items-center gap-2">
                                        <Wind />
                                        <div
                                            className="w-4 h-4 border-t-2 border-brand-500"
                                            style={getWindDirectionArrow(ride.start_weather.current.wind_degree)}
                                        />
                                    </div>
                                ),
                            },
                            {
                                label: 'Condition',
                                value: ride.start_weather.current.condition?.text || 'N/A', // Add null check
                                icon: ride.start_weather.current.condition?.icon ? (
                                    <img
                                        src={ride.start_weather.current.condition.icon}
                                        alt={ride.start_weather.current.condition.text || 'Condition'}
                                        className="w-6 h-6"
                                    />
                                ) : (
                                    <Cloud className="w-6 h-6 text-gray-500" /> // Fallback icon
                                ),
                            },
                        ].map((weather, index) => (
                            <div
                                key={index}
                                className="flex flex-col gap-2 bg-white/30 dark:bg-gray-800/30 backdrop-blur-md p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-brand/10 rounded-lg">
                                        {React.cloneElement(weather.icon, { className: 'text-brand h-5 w-5' })}
                                    </div>
                                    <Text className="text-sm text-gray-600 dark:text-gray-400">{weather.label}</Text>
                                </div>
                                <Text className="text-lg font-semibold text-gray-900 dark:text-gray-100">{weather.value}</Text>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default RideDetail;
