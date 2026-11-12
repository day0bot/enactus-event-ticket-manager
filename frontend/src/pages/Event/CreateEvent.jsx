import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { toast } from 'react-toastify';
import axios from "../../config/axios";
import { useAuth } from "../../context/AuthContext";

const CATEGORIES = [
  "Conference",
  "Workshop",
  "Concert",
  "Exhibition",
  "Sport",
  "Other"
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    category: "",
    ticketPricing: "",
    totalTickets: "",
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError("Title is required");
      return false;
    }
    if (!formData.date) {
      setError("Date is required");
      return false;
    }
    if (!formData.location.trim()) {
      setError("Location is required");
      return false;
    }
    if (!formData.ticketPricing || formData.ticketPricing <= 0) {
      setError("Valid ticket price is required");
      return false;
    }
    if (!formData.totalTickets || formData.totalTickets <= 0) {
      setError("Valid number of tickets is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    // Convert form data to proper format
    const eventPayload = {
      title: formData.title,
      description: formData.description || "",
      date: formData.date,
      location: formData.location,
      category: formData.category || "Other",
      ticketPricing: Number(formData.ticketPricing),
      totalTickets: Number(formData.totalTickets),
    };

    setLoading(true);

    try {
      console.log("Submitting event data:", eventPayload);
      const response = await axios.post("/events", eventPayload);

      console.log("Event creation response:", response.data);
      toast.success("Event created successfully! It will be visible after admin approval.");
      
      // Clear form
      setFormData({
        title: "",
        description: "",
        date: "",
        location: "",
        category: "",
        ticketPricing: "",
        totalTickets: "",
      });
      setImage(null);
      
      // Navigate after a short delay to allow the user to see the success message
      setTimeout(() => {
        navigate("/my-events");
      }, 1500);
    } catch (err) {
      console.error("Error creating event:", {
        error: err,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers
      });
      setError(err.response?.data?.message || "Failed to create event");
      toast.error(err.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Please upload an image file (JPEG, PNG, or GIF)");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File size should be less than 5MB");
      return;
    }

    setImage(file);
    setError(null);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box component={Paper} p={4}>
        <Typography variant="h4" gutterBottom>
          Create New Event
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
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

            <Box>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                type="file"
                onChange={handleImageChange}
              />
              <label htmlFor="image-upload">
                <Button variant="outlined" component="span" fullWidth>
                  Upload Event Image
                </Button>
              </label>
              {image && (
                <Typography variant="caption" display="block" mt={1}>
                  Selected file: {image.name}
                </Typography>
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              fullWidth
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Creating Event...
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          </Box>
        </form>
      </Box>
    </Container>
  );
}

export default CreateEvent;
