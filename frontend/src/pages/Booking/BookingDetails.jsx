import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import axios from 'axios';
import { toast } from 'react-toastify';
import BookingStatusIndicator from './BookingStatusIndicator';
import PaymentSummary from './PaymentSummary';
import BookingShareOptions from './BookingShareOptions';

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  const fetchBookingDetails = async () => {
    try {
      const response = await axios.get(`/api/bookings/${id}`);
      setBooking(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching booking details:', err);
      setError(err.response?.data?.message || 'Failed to fetch booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    setCancelLoading(true);
    try {
      await axios.patch(`/api/bookings/${id}/cancel`);
      toast.success('Booking cancelled successfully');
      fetchBookingDetails();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
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

  if (error) {
    return (
        <Container maxWidth="md">
          <Alert severity="error" sx={{ mt: 4 }}>
            {error}
          </Alert>
        </Container>
    );
  }

  if (!booking) {
    return (
        <Container maxWidth="md">
          <Alert severity="info" sx={{ mt: 4 }}>
            Booking not found
          </Alert>
        </Container>
    );
  }

  return (
      <Container maxWidth="md">
        <Box my={4}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h4">
                    Booking Details
                  </Typography>
                  <BookingStatusIndicator status={booking.status} />
                </Box>
                <Divider sx={{ my: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h5" gutterBottom>
                  {booking.event.title}
                </Typography>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Booking ID: {booking._id}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Event Date & Time
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(booking.event.date).toLocaleString()}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle1" gutterBottom>
                  Location
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {booking.event.location}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <PaymentSummary
                    numberOfTickets={booking.numberOfTickets}
                    pricePerTicket={booking.event.ticketPricing}
                    totalPrice={booking.totalPrice}
                />
                <Divider sx={{ my: 2 }} />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Button
                      variant="outlined"
                      onClick={() => navigate('/bookings')}
                  >
                    Back to My Bookings
                  </Button>
                  {booking.status === 'Confirmed' && (
                      <Button
                          variant="contained"
                          color="error"
                          onClick={handleCancelBooking}
                          disabled={cancelLoading}
                      >
                        {cancelLoading ? <CircularProgress size={24} /> : 'Cancel Booking'}
                      </Button>
                  )}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <BookingShareOptions bookingId={booking._id} />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Container>
  );
};

export default BookingDetails;
