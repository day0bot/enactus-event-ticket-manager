import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress
} from '@mui/material';

const CancelBookingModal = ({ open, onClose, onConfirm, booking, loading }) => {
    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6">⚠️ Cancel Booking</Typography>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Typography variant="body1" gutterBottom>
                    Are you sure you want to cancel this booking?
                </Typography>
                {booking && (
                    <Box mt={2}>
                        <Typography variant="body2" color="text.secondary">
                            Event: {booking.event?.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Number of Tickets: {booking.quantity}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total Price: ${booking.totalPrice?.toFixed(2)}
                        </Typography>
                    </Box>
                )}
                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                    This action cannot be undone.
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={onClose}
                    disabled={loading}
                    color="primary"
                >
                    Keep Booking
                </Button>
                <Button
                    onClick={onConfirm}
                    disabled={loading}
                    color="error"
                    variant="contained"
                >
                    {loading ? <CircularProgress size={20} /> : 'Cancel Booking'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CancelBookingModal;
