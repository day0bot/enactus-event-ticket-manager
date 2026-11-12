import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';

const BookingStatusIndicator = ({ status }) => {
    const getStatusConfig = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
                return {
                    color: 'success',
                    label: '✓ Confirmed',
                    tooltip: 'Booking is confirmed'
                };
            case 'canceled':
                return {
                    color: 'error',
                    label: '✕ Canceled',
                    tooltip: 'Booking has been canceled'
                };
            default:
                return {
                    color: 'default',
                    label: '? Unknown',
                    tooltip: 'Status unknown'
                };
        }
    };

    const config = getStatusConfig(status);

    return (
        <Tooltip title={config.tooltip}>
            <Box display="inline-block">
                <Chip
                    label={config.label}
                    color={config.color}
                    size="small"
                />
            </Box>
        </Tooltip>
    );
};

export default BookingStatusIndicator;
