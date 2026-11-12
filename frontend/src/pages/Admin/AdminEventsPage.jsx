import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ButtonGroup,
} from "@mui/material";
import { format } from "date-fns";
import authAxios from "../../config/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { exportToCsv } from "../../utils/csvExport";

const AdminEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const eventsPerPage = 9;
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== "System Admin") {
      setError("Unauthorized: Only System Admins can view this page");
      setTimeout(() => navigate("/unauthorized"), 2000);
      return;
    }
    fetchEvents();
  }, [user, navigate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await authAxios.get("/admin/events");
      const eventsWithOrganizer = await Promise.all(
        response.data.map(async (event) => {
          if (event.organizer) {
            try {
              const organizerResponse = await authAxios.get(`/users/${event.organizer}`);
              return { ...event, organizer: organizerResponse.data };
            } catch (err) {
              console.error("Error fetching organizer:", err);
              return event;
            }
          }
          return event;
        })
      );
      setEvents(eventsWithOrganizer);
      setFilteredEvents(eventsWithOrganizer);
      setError(null);
    } catch (err) {
      console.error("Error fetching events:", err);
      if (err.response?.status === 401) {
        setError("Please login to access this page");
        setTimeout(() => navigate("/login"), 2000);
      } else if (err.response?.status === 403) {
        setError("You don't have permission to access this page");
        setTimeout(() => navigate("/unauthorized"), 2000);
      } else {
        setError(err.response?.data?.message || "Failed to fetch events");
        toast.error(err.response?.data?.message || "Failed to fetch events");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = events;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        event =>
          event.title?.toLowerCase().includes(searchLower) ||
          event.location?.toLowerCase().includes(searchLower) ||
          event.organizer?.name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredEvents(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, events]);

  const handleStatusChange = async (eventId, newStatus) => {
    try {
      setApprovalLoading(true);
      await authAxios.put(`/admin/events/${eventId}/status`, { status: newStatus });
      toast.success(`Event ${newStatus} successfully`);
      fetchEvents(); // Refresh the list
    } catch (err) {
      console.error("Error updating event status:", err);
      toast.error(err.response?.data?.message || "Failed to update event status");
    } finally {
      setApprovalLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "success";
      case "pending":
        return "warning";
      case "declined":
        return "error";
      default:
        return "default";
    }
  };

  const handleExportCsv = () => {
    if (!filteredEvents || filteredEvents.length === 0) {
      toast.info("No events to export");
      return;
    }
    const columns = [
      { header: "Title", key: "title" },
      { header: "Category", key: "category" },
      { header: "Date", key: (e) => (e.date ? format(new Date(e.date), "yyyy-MM-dd") : "") },
      { header: "Time", key: "time" },
      { header: "Location", key: "location" },
      { header: "Price ($)", key: "ticketPricing" },
      { header: "Total Tickets", key: "totalTickets" },
      { header: "Remaining Tickets", key: "remainingTickets" },
      { header: "Status", key: "status" },
      { header: "Organizer Name", key: (e) => e.organizer?.name || "" },
      { header: "Organizer Email", key: (e) => e.organizer?.email || "" },
    ];
    exportToCsv(`enactus_events_${format(new Date(), "yyyyMMdd_HHmm")}`, filteredEvents, columns);
    toast.success("Events exported to CSV successfully");
  };

  // Pagination
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          Manage Events
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search events"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="outlined"
              placeholder="Search by title, location, or organizer"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status Filter"
              >
                <MenuItem value="all">All Events</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="declined">Declined</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleExportCsv}
              sx={{ height: 56 }}
            >
              Export to CSV
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {currentEvents.map((event) => (
          <Grid item xs={12} sm={6} md={4} key={event._id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Typography variant="h6" gutterBottom>
                    {event.title}
                  </Typography>
                  <Chip
                    label={event.status}
                    color={getStatusColor(event.status)}
                    size="small"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  📅 {format(new Date(event.date), "PPP")}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  📍 {event.location}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  👤 {event.organizer?.name || "Unknown Organizer"}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  🎟️ {event.remainingTickets}/{event.totalTickets} tickets available
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  💰 ${event.ticketPricing}
                </Typography>

                <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                  {event.status === "pending" && (
                    <ButtonGroup size="small">
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => handleStatusChange(event._id, "approved")}
                        disabled={approvalLoading}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleStatusChange(event._id, "declined")}
                        disabled={approvalLoading}
                      >
                        Decline
                      </Button>
                    </ButtonGroup>
                  )}
                  {event.status === "approved" && (
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      onClick={() => handleStatusChange(event._id, "declined")}
                      disabled={approvalLoading}
                    >
                      Cancel
                    </Button>
                  )}
                  {event.status === "declined" && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => handleStatusChange(event._id, "approved")}
                      disabled={approvalLoading}
                    >
                      Approve
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate(`/events/${event._id}`)}
                  >
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredEvents.length > eventsPerPage && (
        <Box display="flex" justifyContent="center" mt={4}>
          {[...Array(totalPages)].map((_, index) => (
            <Button
              key={index + 1}
              variant={currentPage === index + 1 ? "contained" : "outlined"}
              onClick={() => setCurrentPage(index + 1)}
              sx={{ mx: 0.5 }}
            >
              {index + 1}
            </Button>
          ))}
        </Box>
      )}

      {filteredEvents.length === 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No events found matching your criteria.
        </Alert>
      )}
    </Container>
  );
};

export default AdminEventsPage;
