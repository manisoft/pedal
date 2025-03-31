import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  Input,
  Textarea,
  Text,
  MessageBar,
  MessageBarBody,
  Spinner,
  Label
} from '@fluentui/react-components';
import { Play, Square, Save, Crosshair, Sun, Moon } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, useMap, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useRideStore } from '../store/rideStore';
import { startRide, updateRide, endRide, getOrCreateProfile } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { divIcon } from 'leaflet';
import html2canvas from 'html2canvas';
import { useNavigate } from 'react-router-dom';
import {
  ClockRegular,
  LocationRegular,
  TopSpeedRegular,
  ArrowTrendingRegular,
  MountainTrail20Regular,
} from '@fluentui/react-icons';
import { visibility } from 'html2canvas/dist/types/css/property-descriptors/visibility';
import { isIOS } from '../utils/platformUtils'; // Add this import for platform detection

const WEATHER_API_KEY = 'df7f6a5856f84ea3819231340252603';

const fetchWeather = async (lat: number, lon: number) => {
  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${lat},${lon}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
};

const dotIcon = divIcon({
  className: 'relative flex items-center justify-center',
  html: '<div class="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg pulse-animation"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const MapUpdater = ({ center, autoCenter }: { center: [number, number]; autoCenter: boolean }) => {
  const map = useMap();

  useEffect(() => {
    // Only update map center if autoCenter is true
    if (center && autoCenter) {
      map.panTo(center, {
        animate: true,
        duration: 0.5
      });
    }
  }, [center, map, autoCenter]);

  return null;
};

interface RideFormData {
  title: string;
  description: string;
}

const StatsOverlay = ({ stats, currentSpeed }) => {
  return (
    <div className="absolute top-4 md:top-24 left-4 flex flex-col gap-2 z-10 max-w-[60px]" style={{ zIndex: 1000 }}>
      {[
        { icon: <ClockRegular />, value: stats.duration, label: 'Time' },
        { icon: <LocationRegular />, value: `${(stats.distance / 1000).toFixed(1)}`, label: 'km' },
        { icon: <TopSpeedRegular />, value: `${currentSpeed.toFixed(1)}`, label: 'km/h' },
        { icon: <ArrowTrendingRegular />, value: `${stats.maxSpeed.toFixed(1)}`, label: 'km/h' },
        { icon: <MountainTrail20Regular />, value: `${Math.round(stats.elevationGain)}`, label: 'm' }
      ].map((stat, index) => (
        <div
          key={index}
          className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-[4px] rounded-lg p-2 shadow-lg flex flex-col items-center gap-1 transform transition-all duration-300 hover:scale-105 animate-fade-in hover:bg-white/40 dark:hover:bg-gray-700/40"
          style={{ animationDelay: `${index * 100}ms` }}
          title={`${stat.icon.type.render.displayName?.replace('Regular', '')}: ${stat.value} ${stat.label}`}
        >
          <div className="text-brand-500">
            {React.cloneElement(stat.icon, { className: "h-5 w-5" })}
          </div>
          <div className="text-xs font-medium text-gray-700 dark:text-gray-200">
            {stat.value}
          </div>
          <div className="text-[10px] text-gray-600 dark:text-gray-400">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
};

const getRideNameByTime = () => {
  const hour = new Date().getHours();

  if (hour >= 4 && hour < 7) return "Early Morning Ride";
  if (hour >= 7 && hour < 11) return "Morning Ride";
  if (hour >= 11 && hour < 13) return "Noon Ride";
  if (hour >= 13 && hour < 17) return "Afternoon Ride";
  if (hour >= 17 && hour < 20) return "Evening Ride";
  if (hour >= 20 && hour < 23) return "Night Ride";
  if (hour >= 23 || hour < 2) return "Late Night Ride";
  return "Midnight Ride";
};

const LiveTracker = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [locationError, setLocationError] = useState<string>('');
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [formData, setFormData] = useState<RideFormData>({ title: '', description: '' });
  const [stats, setStats] = useState({
    distance: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    elevationGain: 0,
    duration: '00:00:00'
  });
  const { currentRide, isTracking, startTracking, stopTracking, updateCurrentRide } = useRideStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<Date | null>(null);
  const lastLocationRef = useRef<GeolocationPosition | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const distanceRef = useRef(0);
  const [centerMap, setCenterMap] = useState(true);
  const prevLocation = useRef<[number, number] | null>(null);
  const [autoCenter, setAutoCenter] = useState(false); // Changed initial value to false
  const maxSpeedRef = useRef(0); // Add ref for max speed tracking
  const [isMapMovedByUser, setIsMapMovedByUser] = useState(false);
  const [isStartingRide, setIsStartingRide] = useState(false);
  const [permissionRequestInProgress, setPermissionRequestInProgress] = useState(false);

  // Add location permission state
  const [locationPermission, setLocationPermission] = useState<PermissionState | null>(null);
  const locationWatchId = useRef<number | null>(null);

  // Add this effect to request wake lock
  useEffect(() => {
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isTracking) {
        try {
          const wakeLock = await navigator.wakeLock.request('screen');
          return () => wakeLock.release();
        } catch (err) {
          console.error('Wake Lock error:', err);
        }
      }
    };
    requestWakeLock();
  }, [isTracking]);

  // Add state for end ride dialog form
  const [endRideForm, setEndRideForm] = useState({
    title: '',
    description: ''
  });

  // Modify the checkPermission function
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // First try to get current position to trigger permission prompt
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocationPermission('granted');
              resolve(position);
            },
            (error) => {
              if (error.code === error.PERMISSION_DENIED) {
                setLocationPermission('denied');
              }
              reject(error);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          );
        });

        // Then set up permission change listener
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(permission.state);

        permission.addEventListener('change', () => {
          setLocationPermission(permission.state);
          if (permission.state === 'granted') {
            startLocationWatch();
          }
        });

        return () => {
          permission.removeEventListener('change', () => { });
        };
      } catch (error) {
        console.error('Permission check error:', error);
        // On iOS, we might not get permission query support
        if (error instanceof TypeError) {
          // Fallback to checking geolocation.getCurrentPosition
          navigator.geolocation.getCurrentPosition(
            () => setLocationPermission('granted'),
            () => setLocationPermission('denied'),
            { enableHighAccuracy: true }
          );
        }
      }
    };

    checkPermission();
  }, []);

  // Recover ride state from storage on mount
  useEffect(() => {
    const recoverRideState = async () => {
      if (isTracking && currentRide) {
        try {
          // Verify if the ride is still active in the database
          const { data: ride, error } = await supabase
            .from('rides')
            .select('*')
            .eq('id', currentRide.id)
            .eq('is_live', true)
            .single();

          if (error || !ride) {
            // Ride was ended from another tab/device or server
            console.log('Recovering from invalid ride state');
            stopTracking();
            return;
          }

          // Restore start time
          startTimeRef.current = new Date(ride.start_time);

          // Restore route points if available
          if (ride.route_data?.geometry?.coordinates) {
            const points = ride.route_data.geometry.coordinates.map(
              ([lng, lat]: number[]) => [lat, lng] as [number, number]
            );
            setRoutePoints(points);
          }
        } catch (error) {
          console.error('Error recovering ride state:', error);
          stopTracking();
        }
      }
    };

    recoverRideState();
  }, []);

  const smoothlyUpdateLocation = (newLat: number, newLng: number) => {
    if (!prevLocation.current) {
      prevLocation.current = [newLat, newLng];
      setLocation([newLat, newLng]);
      return;
    }

    const [prevLat, prevLng] = prevLocation.current;
    const latDiff = newLat - prevLat;
    const lngDiff = newLng - prevLng;
    const steps = 10;
    let currentStep = 0;

    const animate = () => {
      if (currentStep < steps) {
        const stepLat = prevLat + (latDiff * (currentStep / steps));
        const stepLng = prevLng + (lngDiff * (currentStep / steps));
        setLocation([stepLat, stepLng]);
        currentStep++;
        requestAnimationFrame(animate);
      } else {
        prevLocation.current = [newLat, newLng];
        setLocation([newLat, newLng]);
      }
    };

    requestAnimationFrame(animate);
  };

  const checkLocationPermission = async (): Promise<boolean> => {
    setPermissionRequestInProgress(true);
    try {
      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          (error) => {
            console.warn('Location permission check failed:', error);
            setLocationError(
              error.code === 1
                ? 'Location access denied. Please enable location services in your device settings.'
                : 'Unable to get your location. Please check your device settings.'
            );
            resolve(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
    } finally {
      setPermissionRequestInProgress(false);
    }
  };

  const startLocationWatch = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    // Clear existing watch if any
    if (locationWatchId.current) {
      navigator.geolocation.clearWatch(locationWatchId.current);
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocationError(''); // Clear any existing error
        const { latitude, longitude, speed, altitude } = position.coords;
        smoothlyUpdateLocation(latitude, longitude);

        if (isTracking) {
          // Calculate speed in km/h from GPS data
          const speedKmh = speed ? speed * 3.6 : 0;
          setCurrentSpeed(speedKmh);

          // Update max speed if current speed is higher
          if (speedKmh > maxSpeedRef.current) {
            maxSpeedRef.current = speedKmh;
            setStats(prev => ({
              ...prev,
              maxSpeed: maxSpeedRef.current
            }));
          }

          if (lastLocationRef.current) {
            // Calculate distance and update stats
            const newDistance = calculateDistance(
              lastLocationRef.current.coords.latitude,
              lastLocationRef.current.coords.longitude,
              latitude,
              longitude
            );

            // Only add distance if it's a reasonable value (filter GPS jumps)
            if (newDistance < 100) { // Max 100m between points
              distanceRef.current += newDistance;

              // Calculate time in hours since start
              const currentDuration = startTimeRef.current
                ? (new Date().getTime() - startTimeRef.current.getTime()) / (1000 * 60 * 60)
                : 0;

              // Update average speed only if we have valid duration
              if (currentDuration > 0) {
                const avgSpeed = (distanceRef.current / 1000) / currentDuration;
                setStats(prev => ({
                  ...prev,
                  distance: distanceRef.current,
                  averageSpeed: avgSpeed,
                  // Keep existing max speed from maxSpeedRef
                  maxSpeed: maxSpeedRef.current
                }));
              }
            }

            // Handle elevation changes
            const elevationChange = altitude && lastLocationRef.current.coords.altitude
              ? Math.max(0, altitude - lastLocationRef.current.coords.altitude)
              : 0;

            setStats(prev => ({
              ...prev,
              elevationGain: prev.elevationGain + elevationChange
            }));
          }

          setRoutePoints(prev => [...prev, [latitude, longitude]]);
          lastLocationRef.current = position;
        }
      },
      (error) => {
        console.warn('Location watch error:', error);
        let errorMessage = 'Unable to get your location.';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location services in your settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'GPS signal not found. Please check your location settings and try again.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            startLocationWatch(); // Retry on timeout
            break;
        }

        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
      }
    );

    locationWatchId.current = watchId;
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, altitude } = position.coords;
        smoothlyUpdateLocation(latitude, longitude);

        if (isTracking) {
          // Calculate speed in km/h from GPS data
          const speedKmh = speed ? speed * 3.6 : 0;
          setCurrentSpeed(speedKmh);

          // Update max speed if current speed is higher
          if (speedKmh > maxSpeedRef.current) {
            maxSpeedRef.current = speedKmh;
            setStats(prev => ({
              ...prev,
              maxSpeed: maxSpeedRef.current
            }));
          }

          if (lastLocationRef.current) {
            // Calculate distance and update stats
            const newDistance = calculateDistance(
              lastLocationRef.current.coords.latitude,
              lastLocationRef.current.coords.longitude,
              latitude,
              longitude
            );

            // Only add distance if it's a reasonable value (filter GPS jumps)
            if (newDistance < 100) { // Max 100m between points
              distanceRef.current += newDistance;

              // Calculate time in hours since start
              const currentDuration = startTimeRef.current
                ? (new Date().getTime() - startTimeRef.current.getTime()) / (1000 * 60 * 60)
                : 0;

              // Update average speed only if we have valid duration
              if (currentDuration > 0) {
                const avgSpeed = (distanceRef.current / 1000) / currentDuration;
                setStats(prev => ({
                  ...prev,
                  distance: distanceRef.current,
                  averageSpeed: avgSpeed,
                  // Keep existing max speed from maxSpeedRef
                  maxSpeed: maxSpeedRef.current
                }));
              }
            }

            // Handle elevation changes
            const elevationChange = altitude && lastLocationRef.current.coords.altitude
              ? Math.max(0, altitude - lastLocationRef.current.coords.altitude)
              : 0;

            setStats(prev => ({
              ...prev,
              elevationGain: prev.elevationGain + elevationChange
            }));
          }

          setRoutePoints(prev => [...prev, [latitude, longitude]]);
          lastLocationRef.current = position;
        }
      },
      (error) => {
        console.error('Error watching location:', error);
        setLocationError('Unable to get your location. Please enable location services.');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking]);

  useEffect(() => {
    if (!isTracking) return;

    const updateDuration = () => {
      if (startTimeRef.current) {
        const duration = new Date().getTime() - startTimeRef.current.getTime();
        const hours = Math.floor(duration / 3600000);
        const minutes = Math.floor((duration % 3600000) / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        setStats(prev => ({
          ...prev,
          duration: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        }));
      }
    };

    const durationInterval = setInterval(updateDuration, 1000);
    return () => clearInterval(durationInterval);
  }, [isTracking]);

  // Modify handleStartRide to double-check permissions
  const handleStartRide = async () => {
    setIsStartingRide(true);
    setLocationError('');

    try {
      const hasPermission = await checkLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission is required to start a ride.');
      }

      if (!location) {
        throw new Error('Waiting for GPS signal. Please try again in a moment.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to start a ride.');
      }

      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0] || 'user');
      if (!profile) {
        throw new Error('Error with user profile.');
      }

      const routeData = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [[location[1], location[0]]]
        }
      };

      // Fetch weather data for the start location
      const startWeather = await fetchWeather(location[0], location[1]);

      const ride = await startRide(user.id, {
        route_data: routeData,
        start_weather: startWeather, // Save start weather data
      });

      // Start tracking the ride
      startTracking(ride);

      startTimeRef.current = new Date();
      setRoutePoints([[location[0], location[1]]]);
      setStats({
        duration: '00:00:00',
        distance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        elevationGain: 0
      });
    } catch (error) {
      console.error('Error starting ride:', error);
      setLocationError(error.message || 'Failed to start ride. Please try again.');
    } finally {
      setIsStartingRide(false);
    }
  };

  const handleEndRide = async () => {
    if (!currentRide || !startTimeRef.current) return;

    try {
      const endTime = new Date();
      const routeData = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routePoints.map(([lat, lng]) => [lng, lat])
        }
      };

      // Fetch weather data for the end location
      const endWeather = await fetchWeather(location[0], location[1]);

      await endRide(currentRide.id, {
        route_data: routeData,
        end_weather: endWeather, // Save end weather data
        title: getRideNameByTime(),
        description: `Ride on ${endTime.toLocaleDateString()}`,
        distance: stats.distance,
        average_speed: stats.averageSpeed,
        max_speed: stats.maxSpeed,
        elevation_gain: stats.elevationGain,
        end_time: endTime.toISOString()
      });

      stopTracking();
      setRoutePoints([]);
      startTimeRef.current = null;
      lastLocationRef.current = null;
      navigate('/');
    } catch (error) {
      console.error('Error ending ride:', error);
      setLocationError('Failed to save ride. Please try again.');
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleMapMove = () => {
    setAutoCenter(false);
  };

  const handleLocateMe = () => {
    if (location && mapRef.current) {
      mapRef.current.setView(location, mapRef.current.getZoom(), {
        animate: true,
        duration: 0.5
      });
      setAutoCenter(true);
    }
  };

  // Replace the existing location watch effect with the new one
  useEffect(() => {
    if (locationPermission === 'granted') {
      startLocationWatch();
    }

    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
    };
  }, [locationPermission]);

  // Add notification effect for iOS users
  useEffect(() => {
    if (isTracking && isIOS()) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          alert(
            'Do not leave this page while the trip is recording. iOS limits PWA apps from running in the background, and the app will lose trace history.'
          );
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [isTracking]);

  // Update error display to show retry button
  if (locationError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 space-y-4">
        <MessageBar intent="error">
          <MessageBarBody>{locationError}</MessageBarBody>
        </MessageBar>
        <Button
          appearance="primary"
          onClick={() => {
            setLocationError('');
            startLocationWatch();
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <Spinner size="large" />
        <span>Getting your location...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900">
      {isTracking && isIOS() && (
        <div className="absolute top-4 left-4 right-4 z-50 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg shadow-md">
          Do not leave this page while the trip is recording. iOS limits PWA apps from running in the background, and the app will lose trace history.
        </div>
      )}
      <div className="absolute inset-0">
        <MapContainer
          center={location}
          zoom={19}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          ref={mapRef}
          onMoveStart={handleMapMove} // Only need this handler
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {location && (
            <>
              <MapUpdater center={location} autoCenter={autoCenter} />
              <Marker position={location} icon={dotIcon} />
              {routePoints.length > 1 && (
                <Polyline
                  positions={routePoints}
                  color="#2196F3"
                  weight={4}
                  opacity={0.8}
                />
              )}
            </>
          )}
        </MapContainer>

        <StatsOverlay stats={stats} currentSpeed={currentSpeed} />

        {/* Updated button container with improved visibility */}
        <div className="fixed bottom-24 md:bottom-8 left-0 right-0 z-50 px-4 flex justify-center" style={{ zIndex: 500 }}>
          <div className="backdrop-blur-[4px] rounded-full">
            {isTracking ? (
              <div
                onClick={handleEndRide}
                className="w-20 h-20 rounded-full flex items-center justify-center bg-white/30 dark:bg-gray-800/30 backdrop-blur-[4px] shadow-lg hover:scale-105 hover:bg-red-500/30 dark:hover:bg-red-500/30 transform transition-all cursor-pointer"
              >
                <Square className="w-12 h-12 text-gray-800 dark:text-gray-200" strokeWidth={1} />
              </div>
            ) : (
              <div
                onClick={!isStartingRide && !permissionRequestInProgress ? handleStartRide : undefined}
                className={`w-20 h-20 rounded-full flex items-center justify-center bg-white/30 dark:bg-gray-800/30 backdrop-blur-[4px] shadow-lg ${!isStartingRide && !permissionRequestInProgress
                  ? 'hover:scale-105 hover:bg-brand-500/30 dark:hover:bg-brand-500/30 cursor-pointer'
                  : 'opacity-75'
                  } transform transition-all`}
              >
                {isStartingRide || permissionRequestInProgress ? (
                  <Spinner size="medium" />
                ) : (
                  <Play className="w-12 h-12 ml-2 text-gray-800 dark:text-gray-200" strokeWidth={1} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Locate Me button */}
        <div className="hidden md:block"> {/* Desktop version */}
          <div
            onClick={handleLocateMe}
            className={`fixed top-24 right-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/30 dark:bg-gray-800/30 backdrop-blur-[4px] shadow-lg hover:scale-105 transform transition-all cursor-pointer ${autoCenter ? 'hover:bg-brand-500/30 dark:hover:bg-brand-500/30' : ''}`}
            style={{ zIndex: 500 }}
          >
            <Crosshair className={`w-5 h-5 ${autoCenter ? 'text-brand-500' : 'text-gray-800 dark:text-gray-200'}`} />
          </div>
        </div>

        {/* Locate Me button - Mobile only */}
        <div className="md:hidden"> {/* Only show on mobile */}
          <div
            onClick={handleLocateMe}
            className={`fixed top-16 right-4 w-9 h-9 rounded-full flex items-center justify-center bg-white/30 dark:bg-gray-800/30 backdrop-blur-[4px] shadow-lg hover:scale-105 transform transition-all cursor-pointer ${autoCenter ? 'hover:bg-brand-500/30 dark:hover:bg-brand-500/30' : ''}`}
            style={{ zIndex: 500 }}
          >
            <Crosshair className={`w-5 h-5 ${autoCenter ? 'text-brand-500' : 'text-gray-800 dark:text-gray-200'}`} />
          </div>
        </div>

        {/* Add a safe area for mobile devices */}
        <div className="h-28 md:h-0" /> {/* Spacer for mobile navigation */}
      </div>
    </div>
  );
};

export default LiveTracker;