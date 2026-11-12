import React from 'react';
import {
    Box,
    Alert,
    AlertTitle,
    LinearProgress,
    Typography
} from '@mui/material';

const TicketAvailability = ({ totalTickets, remainingTickets }) => {
    if (!totalTickets || !remainingTickets) return null;

    const soldTickets = totalTickets - remainingTickets;
    const availabilityPercentage = (remainingTickets / totalTickets) * 100;
    
    const getAvailabilityStatus = () => {
        if (remainingTickets === 0) {
            return {
                severity: 'error',
                title: 'Sold Out',
                message: 'Sorry, there are no more tickets available for this event.'
            };
        } else if (remainingTickets <= 10) {
            return {
                severity: 'warning',
                title: 'Limited Availability',
                message: `Only ${remainingTickets} tickets left! Book soon.`
            };
        } else if (remainingTickets <= totalTickets * 0.3) { // Less than 30% remaining
            return {
                severity: 'info',
                title: 'Selling Fast',
                message: `${remainingTickets} tickets remaining`
            };
        } else {
            return {
                severity: 'success',
                title: 'Available',
                message: 'Tickets are available'
            };
        }
    };

    const status = getAvailabilityStatus();

    return (
        <Box sx={{ mb: 3 }}>
            <Alert severity={status.severity} sx={{ mb: 1 }}>
                <AlertTitle>{status.title}</AlertTitle>
                {status.message}
            </Alert>
            
            <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2" color="text.secondary">
                        {soldTickets} sold
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {remainingTickets} remaining
                    </Typography>
                </Box>
                <LinearProgress
                    variant="determinate"
                    value={100 - availabilityPercentage}
                    color={status.severity === 'error' ? 'error' : 'primary'}
                    sx={{ height: 8, borderRadius: 4 }}
                />
            </Box>
        </Box>
    );
};

export default TicketAvailability;