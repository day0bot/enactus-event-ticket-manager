import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    CircularProgress,
    Alert,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
} from '@mui/material';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import axios from '../../config/axios';
import { format } from 'date-fns';
import { exportToCsv } from '../../utils/csvExport';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const EventAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [analytics, setAnalytics] = useState([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/users/events/analytics');
            setAnalytics(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError(err.response?.data?.message || 'Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    const prepareBarChartData = () => {
        const labels = analytics.map(event => event.eventName || 'Unnamed Event');
        const bookedTickets = analytics.map(
            event => Number(event.totalTickets || 0) - Number(event.remainingTickets || 0)
        );
        const availableTickets = analytics.map(event => Number(event.remainingTickets || 0));

        return {
            labels,
            datasets: [
                {
                    label: 'Booked Tickets',
                    data: bookedTickets,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                },
                {
                    label: 'Available Tickets',
                    data: availableTickets,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                },
            ],
        };
    };

    const preparePieChartData = (event) => {
        const bookedTickets = Number(event.totalTickets || 0) - Number(event.remainingTickets || 0);
        const availableTickets = Number(event.remainingTickets || 0);

        return {
            labels: ['Booked', 'Available'],
            datasets: [
                {
                    data: [bookedTickets, availableTickets],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(75, 192, 192, 1)',
                    ],
                    borderWidth: 1,
                },
            ],
        };
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

    if (!analytics || analytics.length === 0) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="info">No events data available for analytics.</Alert>
            </Container>
        );
    }

    const handleExportCsv = () => {
        if (!analytics || analytics.length === 0) {
            return;
        }
        const columns = [
            { header: 'Event Name', key: (e) => e.eventName || 'Unnamed Event' },
            { header: 'Total Tickets', key: (e) => e.totalTickets || 0 },
            { header: 'Remaining Tickets', key: (e) => e.remainingTickets || 0 },
            { header: 'Booked Tickets', key: (e) => Number(e.totalTickets || 0) - Number(e.remainingTickets || 0) },
            { header: 'Ticket Price ($)', key: (e) => e.ticketPrice || 0 },
            { header: 'Total Revenue ($)', key: (e) => e.totalRevenue || 0 },
        ];
        exportToCsv(`event_analytics_${new Date().toISOString().slice(0, 10)}`, analytics, columns);
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">
                    Event Analytics
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleExportCsv}
                >
                    Export Analytics (CSV)
                </Button>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Total Events
                            </Typography>
                            <Typography variant="h3">
                                {analytics.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Total Revenue
                            </Typography>
                            <Typography variant="h3">
                                ${analytics.reduce((sum, event) => {
                                    const soldTickets = Number(event.totalTickets || 0) - Number(event.remainingTickets || 0);
                                    const eventRevenue = soldTickets * Number(event.ticketPricing || 0);
                                    return sum + eventRevenue;
                                }, 0).toFixed(2)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Total Bookings
                            </Typography>
                            <Typography variant="h3">
                                {analytics.reduce((sum, event) => sum + Number(event.bookingsCount || 0), 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Ticket Distribution Across Events
                </Typography>
                <Box sx={{ width: '100%', height: 400 }}>
                    <Bar
                        data={prepareBarChartData()}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: { stacked: true },
                                y: { stacked: true }
                            }
                        }}
                    />
                </Box>
            </Paper>

            <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                Individual Event Analytics
            </Typography>
            <Grid container spacing={3}>
                {analytics.map((event, index) => (
                    <Grid item xs={12} md={6} key={event.eventId || index}>
                        <Paper sx={{ p: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                {event.eventName || 'Unnamed Event'}
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    📅 {format(new Date(event.date || new Date()), 'PPP')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    📍 {event.location || 'No location'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    💰 Revenue: ${(() => {
                                        const soldTickets = Number(event.totalTickets || 0) - Number(event.remainingTickets || 0);
                                        return (soldTickets * Number(event.ticketPricing || 0)).toFixed(2);
                                    })()}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    🎟️ Bookings: {Number(event.bookingsCount || 0)}
                                </Typography>
                            </Box>
                            <Box sx={{ height: 200 }}>
                                <Pie
                                    data={preparePieChartData(event)}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                    }}
                                />
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default EventAnalytics;
