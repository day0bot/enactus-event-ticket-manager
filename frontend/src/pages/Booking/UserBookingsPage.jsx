import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Grid,
    CircularProgress,
    Alert,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper
} from '@mui/material';
import axios from '../../config/axios';
import { toast } from 'react-toastify';
import BookingCard from './BookingCard';
import CancelBookingModal from './CancelBookingModal';
import { useAuth } from '../../context/AuthContext';

const UserBookingsPage = () => {
    const [bookings, setBookings] = useState([]);
    const [filteredBookings, setFilteredBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchBookings();
    }, [user, navigate]);

    useEffect(() => {
        filterBookings();
    }, [statusFilter, bookings]);

    const filterBookings = () => {
        if (statusFilter === 'all') {
            setFilteredBookings(bookings);
        } else {
            setFilteredBookings(bookings.filter(booking => booking.status === statusFilter));
        }
    };

    const fetchBookings = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/users/bookings');
            console.log('Raw bookings response:', response.data);

            let bookingsData;
            if (response.data.bookings) {
                bookingsData = response.data.bookings;
            } else if (Array.isArray(response.data)) {
                bookingsData = response.data;
            } else {
                bookingsData = [];
            }

            // Process bookings to handle deleted events and ensure proper data types
            bookingsData = bookingsData.map(booking => {
                // If event is deleted, mark booking as cancelled
                if (!booking.event || !booking.event.title) {
                    return {
                        ...booking,
                        status: 'deleted',
                        numberOfTicketsBooked: parseInt(booking.numberOfTicketsBooked) || 0,
                        totalPrice: parseFloat(booking.totalPrice) || 0
                    };
                }

                return {
                    ...booking,
                    status: booking.status || 'confirmed',
                    numberOfTicketsBooked: parseInt(booking.numberOfTicketsBooked) || 0,
                    event: {
                        ...booking.event,
                        ticketPricing: parseFloat(booking.event.ticketPricing) || 0
                    },
                    totalPrice: parseFloat(booking.totalPrice) || 0
                };
            });

            console.log('Processed bookings:', bookingsData);
            setBookings(bookingsData);
            setFilteredBookings(bookingsData);
        } catch (err) {
            console.error('Error fetching bookings:', err);
            setBookings([]);
            setFilteredBookings([]);
            if (err.response?.status === 401) {
                toast.error('Please login to view your bookings');
                navigate('/login');
            } else if (err.response?.status === 403) {
                toast.error('You are not authorized to view these bookings');
                navigate('/unauthorized');
            } else {
                setError('Failed to fetch bookings. Please try again later.');
                toast.error('Error loading bookings');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancelClick = (booking) => {
        setSelectedBooking(booking);
        setCancelModalOpen(true);
    };

    const handleCancelConfirm = async () => {
        if (!selectedBooking) return;

        setCancelLoading(true);
        try {
            await axios.delete(`/bookings/${selectedBooking._id}`, {
                data: {
                    eventId: selectedBooking.event?._id,
                    numberOfTickets: selectedBooking.numberOfTicketsBooked
                }
            });

            toast.success('Booking cancelled successfully');
            fetchBookings(); // Refresh the bookings list
            setCancelModalOpen(false);
        } catch (err) {
            console.error('Error cancelling booking:', err);
            if (err.response?.status === 401) {
                toast.error('Please login to cancel your booking');
                navigate('/login');
            } else {
                toast.error(err.response?.data?.message || 'Failed to cancel booking. Please try again.');
            }
        } finally {
            setCancelLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box my={4}>
                <Typography variant="h4" gutterBottom>
                    My Bookings
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {!bookings || bookings.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            You haven't made any bookings yet.
                        </Alert>
                        <Button
                            component={Link}
                            to="/events"
                            variant="contained"
                            color="primary"
                        >
                            Browse Events
                        </Button>
                    </Box>
                ) : (
                    <>
                        <Paper sx={{ p: 2, mb: 3 }}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel>Filter by Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    label="Filter by Status"
                                >
                                    <MenuItem value="all">All Bookings</MenuItem>
                                    <MenuItem value="confirmed">Confirmed</MenuItem>
                                    <MenuItem value="cancelled">Cancelled</MenuItem>
                                    <MenuItem value="deleted">Deleted Events</MenuItem>
                                </Select>
                            </FormControl>
                        </Paper>

                        {filteredBookings.length === 0 ? (
                            <Alert severity="info" sx={{ mb: 3 }}>
                                No bookings found with the selected filter.
                            </Alert>
                        ) : (
                            <Grid container spacing={3}>
                                {filteredBookings.map((booking) => (
                                    <Grid item xs={12} key={booking._id}>
                                        <BookingCard
                                            booking={booking}
                                            onCancel={() => handleCancelClick(booking)}
                                        />
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </>
                )}
            </Box>

            <CancelBookingModal
                open={cancelModalOpen}
                onClose={() => setCancelModalOpen(false)}
                onConfirm={handleCancelConfirm}
                booking={selectedBooking}
                loading={cancelLoading}
            />
        </Container>
    );
};

export default UserBookingsPage;