import Navbar from "./components/navbar.jsx";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import Register from "./pages/Auth/register.jsx";
import Login from "./pages/Auth/login.jsx";
import Contact from "./components/Contact.jsx";
import CreateEvent from "./pages/Event/CreateEvent.jsx";
import EventList from "./pages/Event/EventList.jsx";
import UserBookingsPage from "./pages/Booking/UserBookingsPage.jsx";
import { ToastContainer } from 'react-toastify';
import Profile from "./pages/User/ProfilePage.jsx";
import UpdateProfileForm from "./pages/User/UpdateProfileForm";
import AdminUsersPage from "./pages/Admin/AdminUsersPage.jsx";
import UserRoleUpdate from "./pages/Admin/UpdateUserRoleModal.jsx";
import ConfirmationDialog from "./pages/Admin/ConfirmationDialog.jsx";
import UnauthorizedPage from "./pages/Auth/UnauthorizedPage.jsx";
import AdminEventsPage from "./pages/Admin/AdminEventsPage.jsx";
import EventDetails from "./pages/Event/EventDetails.jsx";
import EditEvent from "./pages/Event/EditEvent.jsx";
import BookingDetails from "./pages/Booking/BookingDetails.jsx";
import MyEvents from "./pages/Event/MyEvents.jsx";
import { AuthProvider } from './context/AuthContext';
import 'react-toastify/dist/ReactToastify.css';
import EventAnalytics from "./pages/Event/EventAnalytics.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ForgotPassword from "./pages/Auth/ForgotPassword.jsx";

function App() {
    return (
        <AuthProvider>
            <Navbar />
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/events" element={<ProtectedRoute requireAuth={false}><EventList /></ProtectedRoute>} />
                <Route path="/events/:id" element={<ProtectedRoute requireAuth={false}><EventDetails /></ProtectedRoute>} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* Protected Routes - Standard User */}
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProtectedRoute><UpdateProfileForm /></ProtectedRoute>} />
                <Route path="/bookings" element={<ProtectedRoute allowedRoles={["Standard User"]}><UserBookingsPage /></ProtectedRoute>} />
                <Route path="/bookings/:id" element={<ProtectedRoute allowedRoles={["Standard User"]}><BookingDetails /></ProtectedRoute>} />

                {/* Protected Routes - Organizer */}
                <Route path="/my-events" element={<ProtectedRoute allowedRoles={["Organizer"]}><MyEvents /></ProtectedRoute>} />
                <Route
                    path="/my-events/new"
                    element={
                        <ProtectedRoute allowedRoles={["Organizer"]}>
                            <CreateEvent />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/my-events/edit/:eventId"
                    element={
                        <ProtectedRoute allowedRoles={["Organizer"]}>
                            <EditEvent />
                        </ProtectedRoute>
                    }
                />
                <Route path="/my-events/analytics" element={<ProtectedRoute allowedRoles={["Organizer"]}><EventAnalytics /></ProtectedRoute>} />

                {/* Protected Routes - Admin */}
                <Route path="/admin/events" element={<ProtectedRoute allowedRoles={["System Admin"]}><AdminEventsPage /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute allowedRoles={["System Admin"]}><AdminUsersPage /></ProtectedRoute>} />
                <Route path="/admin/users/edit/:userId" element={<ProtectedRoute allowedRoles={["System Admin"]}><UserRoleUpdate /></ProtectedRoute>} />
                <Route path="/admin/users/delete/:userId" element={<ProtectedRoute allowedRoles={["System Admin"]}><ConfirmationDialog /></ProtectedRoute>} />
                <Route path="/admin/events/edit/:eventId" element={<ProtectedRoute allowedRoles={["System Admin"]}><EditEvent /></ProtectedRoute>} />
            </Routes>
            <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                style={{ marginTop: '80px' }}
            />
        </AuthProvider>
    );
}

export default App;