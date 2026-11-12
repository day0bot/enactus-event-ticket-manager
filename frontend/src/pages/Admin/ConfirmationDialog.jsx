import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import "../../stylesheets/ConfirmationDialog.css";

const ConfirmationDialog = () => {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;

  const [userData, setUserData] = useState(user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // If user data wasn't passed in state, fetch it
  useEffect(() => {
    if (!user) {
      const fetchUser = async () => {
        try {
          const response = await axios.get(
            `http://localhost:8000/api/v1/users/${userId}`,
            {
              withCredentials: true,
            }
          );
          setUserData(response.data);
        } catch (err) {
          setError(err.response?.data?.message || "Failed to fetch user");
        }
      };
      fetchUser();
    }
  }, [user, userId]);

  const handleCancel = () => {
    navigate("/admin/users");
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      // Make API call to delete the user
      await axios.delete(`http://localhost:8000/api/v1/users/${userId}`, {
        withCredentials: true,
      });

      // Navigate back after successful deletion
      navigate("/admin/users");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
      setLoading(false);
    }
  };

  if (!userData && !error) {
    return (
      <div className="loading-container">
        <div className="spinner">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="containerDelete">
      <div className="confirmation-container">
        <h2>Confirm Deletion</h2>

        <div className="confirmation-body">
          <p>Are you sure you want to delete the following user?</p>
          {userData && (
            <div className="user-details">
              <p>
                <strong>Name:</strong> {userData.name}
              </p>
              <p>
                <strong>Email:</strong> {userData.email}
              </p>
              <p>
                <strong>Role:</strong> {userData.role}
              </p>
            </div>
          )}
          <p className="warning">This action cannot be undone.</p>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="button-group">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-button"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="delete-button"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
