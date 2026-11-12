import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/axios';
import { toast } from 'react-toastify';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    CircularProgress,
    Alert,
} from '@mui/material';

const BookTicketForm = ({ event, onBookingComplete }) => {
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const totalPrice = event.price * quantity;
    const maxTickets = event.availableTickets;

    const handleQuantityChange = (e) => {
        const value = parseInt(e.target.value);
        if (value > 0 && value <= maxTickets) {
            setQuantity(value);
            setError(null);
        } else {
            setError(`Please enter a quantity between 1 and ${maxTickets}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (quantity > maxTickets) {
            setError(`Only ${maxTickets} tickets available`);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await axios.post('/bookings', {
                eventId: event._id,
                quantity: quantity
            });

            toast.success('Booking successful!');
            if (onBookingComplete) {
                onBookingComplete(response.data);
            }
            navigate('/my-bookings');
        } catch (err) {
            console.error('Booking error:', err);
            setError(err.response?.data?.message || 'Failed to book tickets');
            toast.error(err.response?.data?.message || 'Failed to book tickets');
        } finally {
            setLoading(false);
        }
    };

    if (maxTickets === 0) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                Sold Out
            </Alert>
        );
    }

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
                Book Tickets
            </Typography>

            <Alert severity="info" sx={{ mb: 2 }}>
                {maxTickets === 1
                    ? 'Last ticket available!'
                    : `${maxTickets} tickets available`}
            </Alert>

            <form onSubmit={handleSubmit}>
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        label="Number of Tickets"
                        type="number"
                        value={quantity}
                        onChange={handleQuantityChange}
                        inputProps={{ min: 1, max: maxTickets }}
                        error={!!error}
                        helperText={error}
                        disabled={loading}
                    />
                </Box>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1">
                        Price per ticket: ${event.price}
                    </Typography>
                    <Typography variant="h6" color="primary">
                        Total Price: ${totalPrice}
                    </Typography>
                </Box>

                <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={loading || !!error}
                >
                    {loading ? <CircularProgress size={24} /> : 'Book Now'}
                </Button>
            </form>
        </Paper>
    );
};

export default BookTicketForm;