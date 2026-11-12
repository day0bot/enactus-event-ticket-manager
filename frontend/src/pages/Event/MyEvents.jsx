import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    CircularProgress,
    Alert,
    Chip,
    CardActions,
} from '@mui/material';
import { format } from 'date-fns';
import axios from '../../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { exportToCsv } from '../../utils/csvExport';

const MyEvents = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchMyEvents();
    }, [location.search]);

    const fetchMyEvents = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/users/events?t=${Date.now()}`);
            setEvents(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching events:', err);
            setError(err.response?.data?.message || 'Failed to fetch events');
            if (err.response?.status === 401) {
                toast.error('Please login to view your events');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Are you sure you want to delete this event?')) {
            return;
        }

        try {
            await axios.delete(`/events/${eventId}`);
            toast.success('Event deleted successfully');
            setEvents(events.filter(event => event._id !== eventId));
        } catch (err) {
            console.error('Error deleting event:', err);
            toast.error(err.response?.data?.message || 'Failed to delete event');
        }
    };

    const handleEditEvent = (event) => {
        navigate(`/my-events/edit/${event._id}`, { state: { event } });
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'success';
            case 'pending':
                return 'warning';
            case 'declined':
                return 'error';
            default:
                return 'default';
        }
    };

    const handleExportCsv = () => {
        if (!events || events.length === 0) {
            toast.info('No events to export');
            return;
        }
        const columns = [
            { header: 'Title', key: 'title' },
            { header: 'Category', key: 'category' },
            { header: 'Date', key: (e) => (e.date ? format(new Date(e.date), 'yyyy-MM-dd') : '') },
            { header: 'Time', key: 'time' },
            { header: 'Location', key: 'location' },
            { header: 'Price ($)', key: 'ticketPricing' },
            { header: 'Total Tickets', key: 'totalTickets' },
            { header: 'Remaining Tickets', key: 'remainingTickets' },
            { header: 'Status', key: 'status' },
        ];
        exportToCsv(`my_events_${format(new Date(), 'yyyyMMdd_HHmm')}`, events, columns);
        toast.success('Events exported to CSV');
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">My Events</Typography>
                <Box>
                    <Button
                        variant="outlined"
                        color="primary"
                        onClick={handleExportCsv}
                        sx={{ mr: 2 }}
                    >
                        Export to CSV
                    </Button>
                    <Button
                        component={Link}
                        to="/my-events/analytics"
                        variant="outlined"
                        color="primary"
                        sx={{ mr: 2 }}
                    >
                        View Analytics
                    </Button>
                    <Button
                        component={Link}
                        to="/my-events/new"
                        variant="contained"
                        color="primary"
                    >
                        Create New Event
                    </Button>
                </Box>
            </Box>

            {events.length === 0 ? (
                <Alert severity="info">
                    You haven't created any events yet.
                </Alert>
            ) : (
                <Grid container spacing={3}>
                    {events.map((event) => (
                        <Grid item xs={12} sm={6} md={4} key={event._id}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        {event.title}
                                    </Typography>

                                    <Box sx={{ mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            📅 {format(new Date(event.date), 'PPP')}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            📍 {event.location}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            💰 ${event.ticketPricing}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            🎟️ {event.remainingTickets} tickets available
                                        </Typography>
                                    </Box>

                                    <Chip
                                        label={event.status}
                                        color={getStatusColor(event.status)}
                                        size="small"
                                        sx={{ mb: 2 }}
                                    />
                                </CardContent>

                                <CardActions>
                                    <Button
                                        size="small"
                                        onClick={() => navigate(`/events/${event._id}`)}
                                    >
                                        View
                                    </Button>
                                    <Button
                                        size="small"
                                        color="primary"
                                        onClick={() => handleEditEvent(event)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteEvent(event._id)}
                                    >
                                        Delete
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Container>
    );
};

export default MyEvents;