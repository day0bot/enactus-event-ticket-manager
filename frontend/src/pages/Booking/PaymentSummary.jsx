import React from 'react';
import {
    Paper,
    Typography,
    Box,
    Divider,
    List,
    ListItem,
    ListItemText
} from '@mui/material';

const PaymentSummary = ({ booking }) => {
    if (!booking) return null;

    const ticketPrice = booking.totalPrice / booking.quantity;
    const serviceFee = booking.totalPrice * 0.05; // 5% service fee
    const total = booking.totalPrice + serviceFee;

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
                Payment Summary
            </Typography>
            
            <List disablePadding>
                <ListItem sx={{ py: 1 }}>
                    <ListItemText 
                        primary="Ticket Price"
                        secondary={`$${ticketPrice.toFixed(2)} × ${booking.quantity} tickets`}
                    />
                    <Typography variant="body1">
                        ${booking.totalPrice.toFixed(2)}
                    </Typography>
                </ListItem>

                <ListItem sx={{ py: 1 }}>
                    <ListItemText 
                        primary="Service Fee"
                        secondary="5% of ticket price"
                    />
                    <Typography variant="body1">
                        ${serviceFee.toFixed(2)}
                    </Typography>
                </ListItem>

                <Divider sx={{ my: 1 }} />

                <ListItem sx={{ py: 1 }}>
                    <ListItemText 
                        primary={
                            <Typography variant="h6">
                                Total
                            </Typography>
                        }
                    />
                    <Typography variant="h6" color="primary">
                        ${total.toFixed(2)}
                    </Typography>
                </ListItem>
            </List>

            <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                    * All prices include applicable taxes
                </Typography>
            </Box>
        </Paper>
    );
};

export default PaymentSummary;