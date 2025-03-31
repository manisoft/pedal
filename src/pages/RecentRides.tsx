import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    Card,
    Title2,
    Spinner,
    Button,
    Text,
} from '@fluentui/react-components';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 10;

const RecentRides = () => {
    const navigate = useNavigate();
    const [rides, setRides] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchRides = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: rides, count } = await supabase
                    .from('rides')
                    .select('*', { count: 'exact' })
                    .eq('user_id', user.id)
                    .eq('is_live', false)
                    .order('start_time', { ascending: false })
                    .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

                setRides(rides || []);
                setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
            } catch (error) {
                console.error('Error fetching rides:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRides();
    }, [currentPage]);

    const getRoutePositions = (routeData: any) => {
        if (!routeData || !routeData.geometry || !routeData.geometry.coordinates) {
            return [];
        }
        return routeData.geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng]);
    };

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
                            <div className="text-2xl md:text-3xl font-semibold">Recent Rides</div>
                            <div className="text-subtle">View all your cycling activities</div>
                        </div>
                    </div>
                </div>
            </section>

            <Card className="p-6 depth-2">
                <div className="space-y-4">
                    {rides.map((ride, index) => (
                        <div
                            key={ride.id}
                            className="border rounded-lg p-4 hover-lift click-animation cursor-pointer"
                            style={{ animationDelay: `${index * 100}ms` }}
                            onClick={() => navigate(`/ride-detail/${ride.id}`)}
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold">
                                        {ride.title || format(new Date(ride.start_time), 'MMMM d, yyyy')}
                                    </h3>
                                    <div className="text-subtle mb-2 text-xxs">
                                        {format(new Date(ride.start_time), 'EEEE, h:mm a, MMMM do, yyyy')}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-2">
                                        <div>
                                            <Text className="text-gray-600">Distance</Text>
                                            <div className="font-semibold">{(ride.distance / 1000).toFixed(1)} km</div>
                                        </div>
                                        <div>
                                            <Text className="text-gray-600">Duration</Text>
                                            <div className="font-semibold">
                                                {new Date(ride.end_time).getTime() - new Date(ride.start_time).getTime() > 0
                                                    ? `${Math.floor((new Date(ride.end_time).getTime() - new Date(ride.start_time).getTime()) / 3600000)}h ${Math.floor(((new Date(ride.end_time).getTime() - new Date(ride.start_time).getTime()) % 3600000) / 60000)}m`
                                                    : 'N/A'}
                                            </div>
                                        </div>
                                        <div>
                                            <Text className="text-gray-600">Avg Speed</Text>
                                            <div className="font-semibold">{ride.average_speed.toFixed(1)} km/h</div>
                                        </div>
                                        <div>
                                            <Text className="text-gray-600">Max Speed</Text>
                                            <div className="font-semibold">{ride.max_speed.toFixed(1)} km/h</div>
                                        </div>
                                        <div>
                                            <Text className="text-gray-600">Elevation</Text>
                                            <div className="font-semibold">{Math.round(ride.elevation_gain)} m</div>
                                        </div>
                                        <div>
                                            <Text className="text-gray-600">CO₂ Saved</Text>
                                            <div className="font-semibold">
                                                {((ride.distance / 1000) * 200 / 1000).toFixed(1)} kg
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-48 h-32">
                                    <MapContainer
                                        bounds={getRoutePositions(ride.route_data)}
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
                    {rides.length === 0 && (
                        <div className="text-center py-12 text-subtle">
                            <Text>No rides recorded yet.</Text>
                        </div>
                    )}
                </div>

                <div className="flex justify-center items-center gap-4 mt-6">
                    <Button
                        appearance="subtle"
                        icon={<ChevronLeft />}
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        Previous
                    </Button>
                    <Text>{`Page ${currentPage} of ${totalPages}`}</Text>
                    <Button
                        appearance="subtle"
                        icon={<ChevronRight />}
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        Next
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default RecentRides;
