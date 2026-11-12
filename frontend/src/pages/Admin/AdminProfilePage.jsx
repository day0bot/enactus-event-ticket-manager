import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../stylesheets/profile.css";
import { format } from "date-fns";

function AdminProfilePage() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get(
          "http://localhost:8000/api/v1/users/profile",
          {
            withCredentials: true,
          }
        );

        // Check if user is admin
        if (response.data.role !== "System Admin") {
          setError(
            "Unauthorized access. Only administrators can view this page."
          );
          setTimeout(() => navigate("/profile"), 2000);
          return;
        }

        setUser(response.data);
      } catch (error) {
        setError("Failed to fetch user profile. Please try again.");
        console.log(error);
      }
    };
    fetchUserProfile();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:8000/api/v1/users/logout",
        {},
        {
          withCredentials: true,
        }
      );
      navigate("/");
    } catch (error) {
      setError("Failed to logout. Please try again.");
      console.log(error);
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

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
              <span className="role-admin">{user.role}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Joined:</span>
              <span className="meta-value">
                {user.createdAt
                  ? format(new Date(user.createdAt), "PPP")
                  : "N/A"}
              </span>
            </div>
          </div>
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-value">Admin</div>
              <div className="stat-label">Access Level</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{format(new Date(), "PPP")}</div>
              <div className="stat-label">Today's Date</div>
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
            onClick={() => navigate("/admin/users")}
          >
            Manage Users
          </button>
          <button
            className="btn-yellow"
            onClick={() => navigate("/admin/events")}
          >
            Manage Events
          </button>
          <button className="btn-white" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminProfilePage;
