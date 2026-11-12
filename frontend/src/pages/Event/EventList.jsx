import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Button,
  CardActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { format } from "date-fns";
import { publicAxios } from "../../config/axios";
import { useNavigate } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

// Default placeholder image
const DEFAULT_IMAGE =
  "https://placehold.co/600x400/e9ecef/495057?text=Event+Image";

const CATEGORIES = [
  "Conference",
  "Workshop",
  "Concert",
  "Exhibition",
  "Sport",
  "Other"
];

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 9;
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await publicAxios.get("/events/approved");
      setEvents(response.data);
      setFilteredEvents(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err.response?.data?.message || "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = events;

    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(event => event.category === categoryFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        event =>
          event.title?.toLowerCase().includes(searchLower) ||
          event.location?.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredEvents(filtered);
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, events]);

  const handleViewDetails = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  // Pagination
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Upcoming Events
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search events"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              placeholder="Search by title, location, or description"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="Category"
              >
                <MenuItem value="all">All Categories</MenuItem>
                {CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {filteredEvents.length === 0 ? (
        <Alert severity="info">No events found matching your criteria.</Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {currentEvents.map((event) => (
              <Grid item xs={12} sm={6} md={4} key={event._id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={event.image || DEFAULT_IMAGE}
                    alt={event.title}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h5" component="h2">
                      {event.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {event.description?.slice(0, 100)}
                      {event.description?.length > 100 ? "..." : ""}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        📅 {format(new Date(event.date), "PPP")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        📍 {event.location}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        💰 ${event.ticketPricing}
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                      <Chip
                        label={`${event.remainingTickets} tickets left`}
                        color={
                          event.remainingTickets > 10
                            ? "success"
                            : event.remainingTickets > 0
                            ? "warning"
                            : "error"
                        }
                        size="small"
                      />
                      <Chip
                        label={event.category || "Other"}
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  </CardContent>
                  <CardActions sx={{ padding: "0 16px 16px 16px" }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="medium"
                      fullWidth
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => handleViewDetails(event._id)}
                    >
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 1,
                mt: 4,
              }}
            >
              <Button
                variant="outlined"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outlined"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}
    </Container>
  );
};

export default EventList;
