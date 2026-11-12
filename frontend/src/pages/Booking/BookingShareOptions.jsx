import React, { useState } from 'react';
import {
    Box,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Snackbar
} from '@mui/material';

const BookingShareOptions = ({ booking }) => {
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);

    const handleShare = () => {
        setShareDialogOpen(true);
    };

    const handleClose = () => {
        setShareDialogOpen(false);
    };

    const getShareableText = () => {
        return `Check out my booking for ${booking.event?.title}!\n` +
               `Date: ${new Date(booking.event?.date).toLocaleDateString()}\n` +
               `Location: ${booking.event?.location}\n` +
               `Tickets: ${booking.quantity}`;
    };

    const handleCopyLink = () => {
        const text = getShareableText();
        navigator.clipboard.writeText(text).then(() => {
            setSnackbarOpen(true);
        });
    };

    const handleEmailShare = () => {
        const subject = `My Booking for ${booking.event?.title}`;
        const body = getShareableText();
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleWhatsAppShare = () => {
        const text = getShareableText();
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <>
            <Tooltip title="Share Booking">
                <IconButton onClick={handleShare} color="primary">
                    📤
                </IconButton>
            </Tooltip>

            <Dialog open={shareDialogOpen} onClose={handleClose}>
                <DialogTitle>Share Booking</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            value={getShareableText()}
                            variant="outlined"
                            InputProps={{
                                readOnly: true,
                            }}
                        />
                    </Box>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Tooltip title="Copy to Clipboard">
                            <IconButton onClick={handleCopyLink} color="primary">
                                📋
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Share via Email">
                            <IconButton onClick={handleEmailShare} color="primary">
                                ✉️
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Share via WhatsApp">
                            <IconButton onClick={handleWhatsAppShare} color="primary">
                                💬
                            </IconButton>
                        </Tooltip>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Close</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                message="Copied to clipboard"
            />
        </>
    );
};

export default BookingShareOptions;
