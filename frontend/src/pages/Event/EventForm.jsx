import React, { useState, useRef } from "react";
import {
  Container,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Slider,
} from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "../../config/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const EventForm = ({ event = null }) => {
  const [formData, setFormData] = useState({
    title: event?.title || "",
    description: event?.description || "",
    date: event?.date ? new Date(event.date) : new Date(),
    location: event?.location || "",
    category: event?.category || "",
    ticketPricing: event?.ticketPricing || "",
    totalTickets: event?.totalTickets || "",
    image: event?.image || null,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showCropper, setShowCropper] = useState(false);
  const imageRef = useRef(null);
  
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        imageRef.current = reader.result;
        setImageSrc(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = async (croppedArea, croppedAreaPixels) => {
    try {
      const canvas = document.createElement('canvas');
      const image = await createImage(imageRef.current);

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No 2d context');
      }

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      canvas.toBlob(async (blob) => {
        if (blob) {
          const compressedImage = await imageCompression(blob, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
          });

          const uploadData = new FormData();
          uploadData.append("image", compressedImage);

          try {
            const response = await axios.post(
              "/events/upload-image",
              uploadData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              }
            );

            setFormData((prev) => ({
              ...prev,
              image: response.data.image,
            }));
            toast.success("Event image uploaded successfully!");
            setShowCropper(false);
          } catch (error) {
            console.error(error);
            toast.error("Failed to upload event image. Please try again.");
          }
        }
      }, 'image/jpeg');
    } catch (e) {
      console.error(e);
      toast.error("Error processing image. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const eventData = {
        ...formData,
        ticketPricing: parseFloat(formData.ticketPricing),
        totalTickets: parseInt(formData.totalTickets),
      };

      if (event) {
        await axios.put(`/events/${event._id}`, eventData);
        toast.success("Event updated successfully!");
      } else {
        await axios.post("/events", eventData);
        toast.success("Event created successfully!");
      }

      navigate("/my-events");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to save event");
      toast.error(err.response?.data?.message || "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {event ? "Edit Event" : "Create New Event"}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 400,
                  height: 200,
                  overflow: "hidden",
                  borderRadius: 1,
                  mb: 2,
                  position: "relative",
                }}
              >
                {formData.image ? (
                  <img
                    src={formData.image}
                    alt="Event"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      bgcolor: "grey.200",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography color="text.secondary">
                      No image selected
                    </Typography>
                  </Box>
                )}
              </Box>
              <input
                type="file"
                id="event-image"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
              <label htmlFor="event-image">
                <Button variant="contained" component="span">
                  {formData.image ? "Change Image" : "Upload Image"}
                </Button>
              </label>
            </Box>
          </Grid>

          {showCropper && (
            <Box
              sx={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: "rgba(0, 0, 0, 0.7)",
                zIndex: 1300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 1,
                  p: 3,
                  width: "90%",
                  maxWidth: 600,
                }}
              >
                <Box sx={{ height: 400, position: "relative", mb: 2 }}>
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={16 / 9}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </Box>
                <Box sx={{ px: 2 }}>
                  <Typography>Zoom</Typography>
                  <Slider
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="zoom"
                    onChange={(e, zoom) => setZoom(zoom)}
                  />
                </Box>
                <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowCropper(false);
                      setImageSrc(null);
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </Box>
          )}

          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Event Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              multiline
              rows={4}
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Event Date & Time"
                value={formData.date}
                onChange={(newValue) =>
                  setFormData((prev) => ({ ...prev, date: newValue }))
                }
                renderInput={(params) => <TextField {...params} fullWidth />}
                minDate={new Date()}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                label="Category"
              >
                <MenuItem value="Music">Music</MenuItem>
                <MenuItem value="Sports">Sports</MenuItem>
                <MenuItem value="Arts">Arts</MenuItem>
                <MenuItem value="Technology">Technology</MenuItem>
                <MenuItem value="Food">Food</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              type="number"
              label="Ticket Price ($)"
              name="ticketPricing"
              value={formData.ticketPricing}
              onChange={handleInputChange}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              type="number"
              label="Total Tickets"
              name="totalTickets"
              value={formData.totalTickets}
              onChange={handleInputChange}
              inputProps={{ min: 1 }}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={() => navigate("/my-events")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} />
                ) : event ? (
                  "Update Event"
                ) : (
                  "Create Event"
                )}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default EventForm; 