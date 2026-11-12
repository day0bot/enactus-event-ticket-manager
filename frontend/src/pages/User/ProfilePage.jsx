import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../stylesheets/profile.css";
import { format } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import axios from "../../config/axios";

function Profile() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [activeBookings, setActiveBookings] = useState(0);

    useEffect(() => {
        const fetchActiveBookings = async () => {
            try {
                const response = await axios.get('/users/bookings');
                const bookings = response.data;
                // Count only confirmed bookings
                const confirmedBookings = bookings.filter(booking => 
                    booking.status?.toLowerCase() === 'confirmed'
                );
                setActiveBookings(confirmedBookings.length);
            } catch (error) {
                console.error('Error fetching bookings:', error);
                setActiveBookings(0);
            }
        };

        if (user) {
            fetchActiveBookings();
        }
    }, [user]);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Logged out successfully");
            navigate("/");
        } catch (error) {
            toast.error("Failed to logout. Please try again.");
            console.error("Logout error:", error);
        }
    };

    if (!user) {
        return <div className="loading-message">Loading profile...</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <div className="profile-header">
                    <img
                        src={user.profilePicture || "https://via.placeholder.com/150"}
                        alt="Profile"
                        className="profile-picture"
                    />
                </div>

                <div className="profile-info">
                    <h2 className="profile-name">{user.name}</h2>
                    <p className="profile-email">{user.email}</p>
                    <div className="profile-meta">
                        <div className="meta-item">
                            <span className="meta-label">Role:</span>
                            <span className={user.role === "System Admin" ? "role-admin" : "role-user"}>
                                {user.role}
                            </span>
                        </div>
                        <div className="meta-item">
                            <span className="meta-label">Joined:</span>
                            <span className="meta-value">
                                {user.createdAt ? format(new Date(user.createdAt), "PPP") : "N/A"}
                            </span>
                        </div>
                    </div>
                    {/* Example stats, you can fetch and display real stats if needed */}
                    <div className="stats-container">
                        <div className="stat-card">
                            <div className="stat-title">Active Bookings</div>
                            <div className="stat-value">{activeBookings}</div>
                        </div>
                    </div>
                </div>

                <div className="profile-actions">
                    <button
                        className="btn-yellow"
                        onClick={() => navigate("/profile/edit")}
                    >
                        Edit Profile
                    </button>
                    <button
                        className="btn-yellow"
                        onClick={() => navigate("/bookings")}
                        style={{ order: 1 }}
                    >
                        Your Bookings
                    </button>
                    <button className="btn-white" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Profile;