import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Button,
    Box,
    Chip,
    Grid,
    Alert
} from '@mui/material';
import { format } from 'date-fns';

const BookingCard = ({ booking, onCancel }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'Date not available';
        try {
            return format(new Date(dateString), 'PPP');
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid date';
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
                return 'success';
            case 'cancelled':
                return 'error';
            case 'pending':
                return 'warning';
            default:
                return 'default';
        }
    };

    // Handle deleted events
    if (!booking) {
        return (
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Typography color="error">
                        Invalid booking data
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    // Check if event is deleted
    const isEventDeleted = !booking.event || !booking.event.title;
    if (isEventDeleted) {
        return (
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Event deleted by organizer
                            </Alert>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    🎟️ Tickets Booked: {booking.numberOfTicketsBooked || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    mt: 1
                                }}>
                                    💰 Total Price: ${parseFloat(booking.totalPrice || 0).toFixed(2)}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip
                                    label="Cancelled"
                                    color="error"
                                    size="small"
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        );
    }

    // Ensure numeric values
    const ticketCount = parseInt(booking.numberOfTicketsBooked) || 0;
    const ticketPrice = parseFloat(booking.event.ticketPricing) || 0;
    const bookingTotalPrice = parseFloat(booking.totalPrice) || 0;

    return (
        <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <Typography variant="h6" gutterBottom>
                            {booking.event.title}
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                📅 Event Date: {formatDate(booking.event.date)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                📍 Location: {booking.event.location || 'Location not available'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                🎟️ Tickets: {ticketCount} x ${ticketPrice.toFixed(2)} each
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                mt: 1
                            }}>
                                💰 Total Price: ${bookingTotalPrice.toFixed(2)}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip
                                label={booking.status || 'Status not available'}
                                color={getStatusColor(booking.status)}
                                size="small"
                            />
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {booking.status?.toLowerCase() === 'confirmed' && (
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => onCancel(booking)}
                                sx={{ mt: { xs: 2, md: 0 } }}
                            >
                                Cancel Booking
                            </Button>
                        )}
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default BookingCard;
