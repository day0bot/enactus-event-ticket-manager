import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, CircularProgress, Alert } from '@mui/material';
import BookingDetails from '../Booking/BookingDetails.jsx';
import axios from 'axios';

const UserBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('/api/v1/users/bookings', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!isMounted) return;

        // Ensure we have an array to work with
        const data = response.data || [];
        const bookingsArray = Array.isArray(data) ? data : [];
        
        // Transform the data
        const transformedBookings = bookingsArray.map(booking => ({
          bookingId: booking._id || '',
          eventName: booking.event?.title || 'Unknown Event',
          eventDate: booking.event?.date || new Date().toISOString(),
          bookingDate: booking.timestamp || new Date().toISOString(),
          numberOfTickets: booking.numberOfTicketsBooked || 0,
          totalAmount: booking.totalPrice || 0,
          status: booking.status || 'unknown'
        }));

        setBookings(transformedBookings);
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching bookings:', err);
          setError('Failed to fetch bookings');
          setBookings([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBookings();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCancelBooking = async (bookingId) => {
    try {
      setLoading(true);
      await axios.delete(`/api/v1/bookings/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      // Fetch updated bookings
      const response = await axios.get('/api/v1/users/bookings', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = response.data || [];
      const bookingsArray = Array.isArray(data) ? data : [];
      
      const transformedBookings = bookingsArray.map(booking => ({
        bookingId: booking._id || '',
        eventName: booking.event?.title || 'Unknown Event',
        eventDate: booking.event?.date || new Date().toISOString(),
        bookingDate: booking.timestamp || new Date().toISOString(),
        numberOfTickets: booking.numberOfTicketsBooked || 0,
        totalAmount: booking.totalPrice || 0,
        status: booking.status || 'unknown'
      }));

      setBookings(transformedBookings);
      setError({ severity: 'success', message: 'Booking cancelled successfully' });
    } catch (err) {
      console.error('Error canceling booking:', err);
      setError('Failed to cancel booking');
    } finally {
      setLoading(false);
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
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Bookings
      </Typography>

      {error && (
        <Alert severity={typeof error === 'object' ? error.severity : 'error'} sx={{ mb: 3 }}>
          {typeof error === 'object' ? error.message : error}
        </Alert>
      )}

      {bookings.length === 0 ? (
        <Typography variant="body1" color="text.secondary">
          You don't have any bookings yet.
        </Typography>
      ) : (
        bookings.map((booking) => {
          console.log('Mapping booking:', booking); // Debug log
          return (
            <BookingDetails
              key={booking.bookingId}
              booking={{
                ...booking,
                onCancelBooking: handleCancelBooking,
              }}
            />
          );
        })
      )}
    </Container>
  );
};

export default UserBookingsPage; 