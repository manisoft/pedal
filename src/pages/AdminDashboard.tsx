import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useVersionStore } from '../store/versionStore'; // Import version store
import { useThemeStore } from '../store/themeStore'; // Import theme store
import {
    Card,
    Title2,
    Spinner,
    Button,
    Text,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHeaderCell,
    TableRow,
    makeStyles,
    shorthands,
    tokens,
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogBody,
    DialogTitle,
    DialogActions,
} from '@fluentui/react-components';
import { Users, TrendingUp, ChevronLeft, ChevronRight, LogOut, Sun, Moon, Menu as MenuIcon } from 'lucide-react';
import { Stack } from '@fluentui/react';

const ITEMS_PER_PAGE_USERS = 50; // Pagination for users
const ITEMS_PER_PAGE_RIDES = 10; // Pagination for rides
const ITEMS_PER_PAGE_LEADERBOARD = 100; // Pagination for leaderboard

const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: tokens.colorNeutralBackground1,
        margin: 0, // Remove margin
        padding: 0, // Remove padding
        border: 'none', // Remove border
        overflow: 'hidden', // Prevent horizontal scrolling
    },
    mainContainer: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%',
        margin: 0, // Remove margin
        padding: 0, // Remove padding
        overflow: 'hidden', // Prevent horizontal scrolling
    },
    sidebar: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '0px',
        backgroundColor: tokens.colorNeutralBackground2,
        ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke1),
        ...shorthands.padding('16px'),
        transform: 'translateX(-100%)',
        '@media (min-width: 768px)': {
            width: '280px',
            transform: 'none',
        },
        transition: 'all 0.3s ease',
        overflow: 'hidden', // Prevent sidebar content overflow
    },
    sidebarOpen: {
        width: '280px',
        transform: 'none',
    },
    mainContent: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%',
        margin: 0, // Ensure no margin
        padding: 0, // Ensure no padding
        overflowX: 'hidden', // Prevent horizontal scrolling
        overflowY: 'auto', // Allow vertical scrolling
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        padding: '0 16px', // Add padding to prevent content overflow
        '@media (min-width: 768px)': {
            marginBottom: '32px',
        },
    },
    card: {
        backgroundColor: tokens.colorNeutralBackground1,
        ...shorthands.borderRadius(tokens.borderRadiusMedium),
        ...shorthands.padding('16px'),
        boxShadow: tokens.shadow4,
        animationName: {
            from: { opacity: 0, transform: 'translateY(8px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
        },
        animationDuration: '0.3s',
        animationTimingFunction: 'ease-out',
        animationFillMode: 'forwards',
        width: '100%', // Ensure cards do not exceed container width
        maxWidth: '100%', // Prevent overflow
        overflow: 'hidden', // Prevent content overflow
    },
    table: {
        ...shorthands.margin('16px', '0'),
        width: '100%', // Ensure table fits within container
        maxWidth: '100%', // Prevent overflow
        overflowX: 'auto', // Allow horizontal scrolling for tables if necessary
    },
    tableHeader: {
        backgroundColor: tokens.colorNeutralBackground3,
    },
    tableRow: {
        '&:hover': {
            backgroundColor: tokens.colorNeutralBackground2Hover,
        },
    },
    footer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
        borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
        backgroundColor: tokens.colorNeutralBackground2,
    },
});

const AdminDashboard = () => {
    const styles = useStyles();
    const navigate = useNavigate();
    const { version } = useVersionStore(); // Get app version
    const { isDarkMode, toggleTheme } = useThemeStore(); // Get theme state and toggle function
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeSection, setActiveSection] = useState<'users' | 'leaderboard' | 'settings'>('users');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [rides, setRides] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [params, setParams] = useState({
        metric: 'distance',
        period: 'all_time',
    });
    const [userPage, setUserPage] = useState(1); // Pagination state for users
    const [ridePage, setRidePage] = useState(1); // Pagination state for rides
    const [isRideModalOpen, setIsRideModalOpen] = useState(false); // Modal state
    const [userSearch, setUserSearch] = useState(''); // Search state for users
    const [userOrder, setUserOrder] = useState<'asc' | 'desc'>('asc'); // Order state for users
    const [rideOrder, setRideOrder] = useState<'asc' | 'desc'>('asc'); // Order state for rides
    const [userOrderColumn, setUserOrderColumn] = useState<'username' | 'email'>('username'); // Column to order users
    const [rideOrderColumn, setRideOrderColumn] = useState<'title' | 'start_time'>('start_time'); // Column to order rides

    const filteredUsers = users
        .filter((user) => user.username.toLowerCase().includes(userSearch.toLowerCase()))
        .sort((a, b) => {
            const column = userOrderColumn;
            return userOrder === 'asc'
                ? a[column].localeCompare(b[column])
                : b[column].localeCompare(a[column]);
        });

    const filteredRides = rides
        .sort((a, b) => {
            const column = rideOrderColumn;
            return rideOrder === 'asc'
                ? a[column].localeCompare(b[column])
                : b[column].localeCompare(a[column]);
        });

    const paginatedUsers = filteredUsers.slice((userPage - 1) * ITEMS_PER_PAGE_USERS, userPage * ITEMS_PER_PAGE_USERS);

    const paginatedRides = filteredRides.slice((ridePage - 1) * ITEMS_PER_PAGE_RIDES, ridePage * ITEMS_PER_PAGE_RIDES);

    useEffect(() => {
        const checkAdmin = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    navigate('/');
                    return;
                }

                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error || profile?.role !== 'admin') {
                    navigate('/'); // Redirect non-admin users
                    return;
                }

                setIsAdmin(true);
                fetchUsers();
            } catch (error) {
                console.error('Error checking admin role:', error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .rpc('get_users_with_email'); // Call a stored procedure to fetch users with email

            if (error) {
                console.error('Error fetching users:', error);
                return;
            }

            const formattedUsers = data.map((user) => ({
                id: user.id,
                username: user.username,
                email: user.email || 'N/A',
            }));

            setUsers(formattedUsers || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchUserRides = async (userId) => {
        try {
            const { data } = await supabase
                .from('rides')
                .select('*')
                .eq('user_id', userId)
                .order('start_time', { ascending: false });

            setRides(data || []);
        } catch (error) {
            console.error('Error fetching user rides:', error);
        }
    };

    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .rpc('get_leaderboard_paginated', {
                    p_metric: params.metric,
                    p_period: params.period,
                    p_limit: ITEMS_PER_PAGE_LEADERBOARD,
                    p_offset: (currentPage - 1) * ITEMS_PER_PAGE_LEADERBOARD
                });

            if (error) {
                console.error('Error fetching leaderboard:', error);
                return;
            }

            if (!data || data.length === 0) {
                setLeaderboard([]);
                setTotalPages(0);
                return;
            }

            // Format metric values based on the selected metric
            const formattedData = data.map(entry => ({
                ...entry,
                metric_value: formatMetricValue(entry.metric_value, params.metric)
            }));

            setLeaderboard(formattedData);
            // Get total_count from the first row since it's the same for all rows
            setTotalPages(Math.ceil(data[0].total_count / ITEMS_PER_PAGE_LEADERBOARD));
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        }
    };

    const formatMetricValue = (value: number, metric: string) => {
        switch (metric) {
            case 'distance':
                return `${(value / 1000).toFixed(2)} km`; // Convert meters to kilometers
            case 'duration':
                return formatDuration(value); // Format seconds to HH:MM:SS
            case 'elevation':
                return `${value.toFixed(0)} m`;
            case 'max_speed':
            case 'average_speed':
                return `${value.toFixed(1)} km/h`;
            default:
                return value.toString();
        }
    };

    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Update useEffects for leaderboard
    useEffect(() => {
        if (activeSection === 'leaderboard') {
            setCurrentPage(1); // Reset to first page when changing parameters
            fetchLeaderboard();
        }
    }, [activeSection, params.metric, params.period]);

    useEffect(() => {
        if (activeSection === 'leaderboard') {
            fetchLeaderboard();
        }
    }, [currentPage]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Spinner size="large" />
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className={styles.root}>
            {/* Top Bar Menu */}
            <Menu>
                <MenuTrigger>
                    <Button appearance="subtle" icon={<MenuIcon />}>
                        Menu
                    </Button>
                </MenuTrigger>
                <MenuPopover>
                    <MenuList>
                        <MenuItem onClick={() => setActiveSection('users')} icon={<Users />}>
                            User Administration
                        </MenuItem>
                        <MenuItem onClick={() => setActiveSection('leaderboard')} icon={<TrendingUp />}>
                            Leaderboard
                        </MenuItem>
                        <MenuItem onClick={() => setActiveSection('settings')} icon={isDarkMode ? <Sun /> : <Moon />}>
                            Settings
                        </MenuItem>
                        <MenuItem onClick={() => supabase.auth.signOut().then(() => navigate('/'))} icon={<LogOut />}>
                            Sign Out
                        </MenuItem>
                    </MenuList>
                </MenuPopover>
            </Menu>

            {/* Main Content */}
            <main className={styles.mainContent}>
                <div className={styles.header}>
                    <Title2>
                        {activeSection === 'users'
                            ? 'User Administration'
                            : activeSection === 'leaderboard'
                                ? 'Leaderboard'
                                : 'Settings'}
                    </Title2>
                </div>

                {/* Content sections */}
                <div className={styles.card}>
                    {activeSection === 'users' && (
                        <div>
                            <Title2 className="mb-4">User Administration</Title2>
                            {/* Search */}
                            <div className="flex justify-between items-center mb-4">
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="border p-2 rounded w-full md:w-1/3"
                                />
                            </div>
                            {/* Table Header */}
                            <Stack horizontal className="mb-2" styles={{ root: { fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '8px' } }}>
                                <Stack.Item
                                    grow
                                    styles={{ root: { width: '33%', cursor: 'pointer' } }}
                                    onClick={() => {
                                        setUserOrderColumn('username');
                                        setUserOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                                    }}
                                >
                                    Username {userOrderColumn === 'username' && (userOrder === 'asc' ? '↑' : '↓')}
                                </Stack.Item>
                                <Stack.Item
                                    grow
                                    styles={{ root: { width: '33%', cursor: 'pointer' } }}
                                    onClick={() => {
                                        setUserOrderColumn('email');
                                        setUserOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                                    }}
                                >
                                    Email {userOrderColumn === 'email' && (userOrder === 'asc' ? '↑' : '↓')}
                                </Stack.Item>
                                <Stack.Item grow styles={{ root: { width: '33%' } }}>Actions</Stack.Item>
                            </Stack>
                            {/* Table Body */}
                            {paginatedUsers.map((user) => (
                                <Stack horizontal key={user.id} className="mb-2" styles={{ root: { borderBottom: '1px solid #eee', paddingBottom: '8px' } }}>
                                    <Stack.Item grow styles={{ root: { width: '33%' } }}>{user.username}</Stack.Item>
                                    <Stack.Item grow styles={{ root: { width: '33%' } }}>{user.email}</Stack.Item>
                                    <Stack.Item grow styles={{ root: { width: '33%' } }}>
                                        <Button
                                            appearance="subtle"
                                            onClick={() => {
                                                setSelectedUser(user);
                                                fetchUserRides(user.id);
                                                setIsRideModalOpen(true);
                                            }}
                                        >
                                            View Rides
                                        </Button>
                                    </Stack.Item>
                                </Stack>
                            ))}
                            {/* Pagination for Users */}
                            <div className="flex justify-between items-center mt-4">
                                <Button
                                    appearance="subtle"
                                    disabled={userPage === 1}
                                    onClick={() => setUserPage((prev) => prev - 1)}
                                >
                                    <ChevronLeft />
                                    Previous
                                </Button>
                                <Text>{`Page ${userPage} of ${Math.ceil(filteredUsers.length / ITEMS_PER_PAGE_USERS)}`}</Text>
                                <Button
                                    appearance="subtle"
                                    disabled={userPage === Math.ceil(filteredUsers.length / ITEMS_PER_PAGE_USERS)}
                                    onClick={() => setUserPage((prev) => prev + 1)}
                                >
                                    Next
                                    <ChevronRight />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Ride Modal */}
                    <Dialog open={isRideModalOpen} onOpenChange={(event, data) => setIsRideModalOpen(data.open)}>
                        <DialogSurface style={{ width: '90%', maxWidth: '800px' }}>
                            <DialogBody style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <DialogTitle>Rides for {selectedUser?.username}</DialogTitle>
                                {/* Table Header */}
                                <Stack horizontal tokens={{ childrenGap: 12 }} className="mb-2" styles={{ root: { fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '8px' } }}>
                                    <Stack.Item
                                        grow={3}
                                        styles={{ root: { minWidth: '200px', cursor: 'pointer' } }}
                                        onClick={() => {
                                            setRideOrderColumn('title');
                                            setRideOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                                        }}
                                    >
                                        Title {rideOrderColumn === 'title' && (rideOrder === 'asc' ? '↑' : '↓')}
                                    </Stack.Item>
                                    <Stack.Item
                                        grow={2}
                                        styles={{ root: { minWidth: '150px', cursor: 'pointer' } }}
                                        onClick={() => {
                                            setRideOrderColumn('start_time');
                                            setRideOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                                        }}
                                    >
                                        Start Time {rideOrderColumn === 'start_time' && (rideOrder === 'asc' ? '↑' : '↓')}
                                    </Stack.Item>
                                </Stack>
                                {/* Table Body */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, overflowY: 'auto' }}>
                                    {paginatedRides.map((ride) => (
                                        <Card
                                            key={ride.id}
                                            className="p-3 hover:bg-neutral-50"
                                            onClick={() => navigate(`/ride-detail/${ride.id}`)}
                                        >
                                            <Stack horizontal tokens={{ childrenGap: 12 }} styles={{ root: { width: '100%' } }}>
                                                <Stack.Item grow={3} styles={{ root: { minWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}>
                                                    <Text>{ride.title || 'Untitled Ride'}</Text>
                                                </Stack.Item>
                                                <Stack.Item grow={2} styles={{ root: { minWidth: '150px' } }}>
                                                    <Text>{new Date(ride.start_time).toLocaleDateString()}</Text>
                                                </Stack.Item>
                                            </Stack>
                                        </Card>
                                    ))}
                                </div>
                                {/* Pagination for Rides */}
                                <div className="flex justify-between items-center mt-4">
                                    <Button
                                        appearance="subtle"
                                        disabled={ridePage === 1}
                                        onClick={() => setRidePage((prev) => prev - 1)}
                                    >
                                        <ChevronLeft />
                                        Previous
                                    </Button>
                                    <Text>{`Page ${ridePage} of ${Math.ceil(filteredRides.length / ITEMS_PER_PAGE_RIDES)}`}</Text>
                                    <Button
                                        appearance="subtle"
                                        disabled={ridePage === Math.ceil(filteredRides.length / ITEMS_PER_PAGE_RIDES)}
                                        onClick={() => setRidePage((prev) => prev + 1)}
                                    >
                                        Next
                                        <ChevronRight />
                                    </Button>
                                </div>
                                <DialogActions>
                                    <Button appearance="primary" onClick={() => setIsRideModalOpen(false)}>
                                        Close
                                    </Button>
                                </DialogActions>
                            </DialogBody>
                        </DialogSurface>
                    </Dialog>
                    {/* End of Ride Modal */}
                    {/* Leaderboard Section */}
                    {activeSection === 'leaderboard' && (
                        <div>
                            <Title2 className="mb-4">Leaderboard</Title2>
                            <div className="flex flex-wrap gap-4 mb-4">
                                <Select
                                    value={params.metric}
                                    onChange={(e, data) => setParams((prev) => ({ ...prev, metric: data.value }))}
                                    className="w-full md:w-auto"
                                >
                                    <option value="distance">Distance</option>
                                    <option value="duration">Duration</option>
                                    <option value="elevation">Elevation</option>
                                    <option value="max_speed">Max Speed</option>
                                    <option value="average_speed">Average Speed</option>
                                </Select>
                                <Select
                                    value={params.period}
                                    onChange={(e, data) => setParams((prev) => ({ ...prev, period: data.value }))}
                                    className="w-full md:w-auto"
                                >
                                    <option value="this_week">This Week</option>
                                    <option value="this_month">This Month</option>
                                    <option value="all_time">All Time</option>
                                </Select>
                            </div>
                            <div className={styles.table}>
                                <Table>
                                    <TableHeader className={styles.tableHeader}>
                                        <TableRow>
                                            <TableHeaderCell>Rank</TableHeaderCell>
                                            <TableHeaderCell>Username</TableHeaderCell>
                                            <TableHeaderCell>Metric Value</TableHeaderCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaderboard.map((entry, index) => (
                                            <TableRow key={entry.username} className={styles.tableRow}>
                                                <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE_LEADERBOARD + index + 1}</TableCell>
                                                <TableCell>{entry.username}</TableCell>
                                                <TableCell>{entry.metric_value}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {/* Pagination controls */}
                            <div className="flex justify-between items-center mt-4">
                                <Button
                                    appearance="subtle"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                >
                                    <ChevronLeft />
                                    Previous
                                </Button>
                                <Text>{`Page ${currentPage} of ${totalPages}`}</Text>
                                <Button
                                    appearance="subtle"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                >
                                    Next
                                    <ChevronRight />
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeSection === 'settings' && (
                        <div>
                            <Title2 className="mb-4">Settings</Title2>
                            <Card className="p-6">
                                <div className="flex items-center justify-between">
                                    <Text>Dark Mode</Text>
                                    <Button
                                        appearance="subtle"
                                        icon={isDarkMode ? <Sun /> : <Moon />}
                                        onClick={toggleTheme}
                                    >
                                        {isDarkMode ? 'Disable' : 'Enable'}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
            <footer className={styles.footer}>
                <Text>Version {version}</Text>
            </footer>
        </div>
    );
};

export default AdminDashboard;
