import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    Alert,
    MenuItem,
    CircularProgress,
    InputAdornment
} from "@mui/material";
import axios from "../../config/axios";
import { toast } from 'react-toastify';
import { useAuth } from "../../context/AuthContext";

const CATEGORIES = [
    "Conference",
    "Workshop",
    "Concert",
    "Exhibition",
    "Sport",
    "Other"
];

const EditEvent = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const eventData = location.state?.event;

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        date: "",
        location: "",
        category: "",
        ticketPricing: "",
        totalTickets: "",
        remainingTickets: ""
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEventDetails = async () => {
            try {
                setLoading(true);
                // If we have event data from navigation state, use it
                if (eventData) {
                    const formattedDate = new Date(eventData.date)
                        .toISOString()
                        .slice(0, 16);

                    setFormData({
                        title: eventData.title || "",
                        description: eventData.description || "",
                        date: formattedDate,
                        location: eventData.location || "",
                        category: eventData.category || "",
                        ticketPricing: eventData.ticketPricing || "",
                        totalTickets: eventData.totalTickets || "",
                        remainingTickets: eventData.remainingTickets || ""
                    });
                } else {
                    // Fetch event data if not provided in navigation state
                    const response = await axios.get(`/events/${eventId}`);
                    const event = response.data;
                    const formattedDate = new Date(event.date)
                        .toISOString()
                        .slice(0, 16);

                    setFormData({
                        title: event.title || "",
                        description: event.description || "",
                        date: formattedDate,
                        location: event.location || "",
                        category: event.category || "",
                        ticketPricing: event.ticketPricing || "",
                        totalTickets: event.totalTickets || "",
                        remainingTickets: event.remainingTickets || ""
                    });
                }
                setError(null);
            } catch (err) {
                console.error("Error fetching event details:", err);
                setError(err.response?.data?.message || "Failed to load event details");
                toast.error("Failed to load event details");
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetails();
    }, [eventId, eventData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            // Format the data before sending, excluding remainingTickets
            const updatedFormData = {
                title: formData.title,
                description: formData.description,
                date: formData.date,
                location: formData.location,
                category: formData.category,
                ticketPricing: parseFloat(formData.ticketPricing),
                totalTickets: parseInt(formData.totalTickets),
                remainingTickets: parseInt(formData.totalTickets) // Set remaining tickets equal to total tickets
            };

            console.log('Sending update data:', updatedFormData);
            const response = await axios.put(`/events/${eventId}`, updatedFormData);
            console.log('Update response:', response.data);
            
            toast.success("Event updated successfully!");

            // Force reload of the events list page to show updated data with cache busting
            setTimeout(() => {
                window.location.href = `/my-events?t=${Date.now()}`;
            }, 1500);
        } catch (err) {
            console.error("Error updating event:", err);
            setError(err.response?.data?.message || "Failed to update event");
            toast.error("Failed to update event");
        } finally {
            setSubmitting(false);
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
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Edit Event
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Box display="grid" gap={3}>
                        <TextField
                            label="Event Title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            required
                            fullWidth
                        />

                        <TextField
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            multiline
                            rows={4}
                            fullWidth
                        />

                        <TextField
                            label="Date and Time"
                            name="date"
                            type="datetime-local"
                            value={formData.date}
                            onChange={handleInputChange}
                            required
                            fullWidth
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />

                        <TextField
                            label="Location"
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            required
                            fullWidth
                        />

                        <TextField
                            select
                            label="Category"
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            fullWidth
                        >
                            {CATEGORIES.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Ticket Price"
                            name="ticketPricing"
                            type="number"
                            value={formData.ticketPricing}
                            onChange={handleInputChange}
                            required
                            fullWidth
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">$</InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            label="Total Tickets"
                            name="totalTickets"
                            type="number"
                            value={formData.totalTickets}
                            onChange={handleInputChange}
                            required
                            fullWidth
                        />

                        <Box display="flex" gap={2} justifyContent="flex-end">
                            <Button
                                variant="outlined"
                                onClick={() => navigate("/my-events")}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                disabled={submitting}
                            >
                                {submitting ? <CircularProgress size={24} /> : "Save Changes"}
                            </Button>
                        </Box>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
};

export default EditEvent;
