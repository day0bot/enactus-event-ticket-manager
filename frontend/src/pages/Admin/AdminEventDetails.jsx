import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
  Chip,
  ButtonGroup,
  TablePagination,
} from "@mui/material";
import { format } from "date-fns";
import axios from "../../config/axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const AdminEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAndFetchEvents = async () => {
      // Get user and token
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      // Check if user is logged in
      if (!token || !user) {
        setError("Please log in to access this page");
        setLoading(false);
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      // Check if user is admin
      if (user.role !== "System Admin") {
        setError("Unauthorized: Only System Admins can view this page");
        setLoading(false);
        return;
      }

      fetchEvents();
    };

    checkAdminAndFetchEvents();
  }, [navigate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/events/all");
      setEvents(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching events:", err);
      setError(err.response?.data?.message || "Failed to fetch events");
      toast.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (eventId, newStatus) => {
    try {
      await axios.put(`/events/${eventId}`, { status: newStatus });
      toast.success(`Event ${newStatus} successfully`);
      fetchEvents(); // Refresh the list
    } catch (err) {
      console.error("Error updating event status:", err);
      toast.error(
        err.response?.data?.message || "Failed to update event status"
      );
    }
  };

  const getStatusChipColor = (status) => {
    switch (status) {
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
      <Typography variant="h4" gutterBottom>
        Manage Events
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Organizer</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Tickets</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((event) => (
                <TableRow key={event._id}>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>{format(new Date(event.date), "PPP")}</TableCell>
                  <TableCell>{event.location}</TableCell>
                  <TableCell>{event.organizer?.name || "Unknown"}</TableCell>
                  <TableCell>
                    <Chip
                      label={event.status}
                      color={getStatusChipColor(event.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {event.remainingTickets}/{event.totalTickets}
                  </TableCell>
                  <TableCell>
                    <ButtonGroup size="small">
                      {event.status === "pending" && (
                        <>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={() =>
                              handleStatusChange(event._id, "approved")
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            onClick={() =>
                              handleStatusChange(event._id, "declined")
                            }
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {event.status === "approved" && (
                        <Button
                          variant="contained"
                          color="error"
                          onClick={() =>
                            handleStatusChange(event._id, "declined")
                          }
                        >
                          Cancel
                        </Button>
                      )}
                      {event.status === "declined" && (
                        <Button
                          variant="contained"
                          color="success"
                          onClick={() =>
                            handleStatusChange(event._id, "approved")
                          }
                        >
                          Approve
                        </Button>
                      )}
                    </ButtonGroup>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={events.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Container>
  );
};

export default AdminEventsPage;
