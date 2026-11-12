import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import "../../stylesheets/UserRoleUpdate.css";
import { API_BASE_URL } from "../../config/axios";

const UserRoleUpdate = () => {
  const { userId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state?.user;

  const [selectedRole, setSelectedRole] = useState(user?.role || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userData, setUserData] = useState(user);

  // If user data wasn't passed in state, fetch it
  useEffect(() => {
    if (!user) {
      const fetchUser = async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/users/${userId}`,
            {
              withCredentials: true,
            }
          );
          setUserData(response.data);
          setSelectedRole(response.data.role);
        } catch (err) {
          setError(err.response?.data?.message || "Failed to fetch user");
        }
      };
      fetchUser();
    }
  }, [user, userId]);

  const validRoles = ["Standard User", "Organizer", "System Admin"];

  const handleRoleChange = (e) => {
    setSelectedRole(e.target.value);
  };

  const handleCancel = () => {
    navigate("/admin/users");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Don't make API call if role hasn't changed
    if (selectedRole === userData?.role) {
      setError("User already has this role");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/users/${userId}`,
        { role: selectedRole },
        { withCredentials: true }
      );

      setSuccess(response.data.message || "Role updated successfully");

      // Navigate back after success
      setTimeout(() => {
        navigate("/admin/users");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user role");
    } finally {
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
    <div className="containerUserRoleUpdate">
      <div className="role-update-container">
        <h2>Update User Role</h2>

        <form onSubmit={handleSubmit} className="role-update-form">
          <div className="form-group">
            <label htmlFor="roleSelect">
              Change role for: {userData?.name}
            </label>
            <select
              id="roleSelect"
              value={selectedRole}
              onChange={handleRoleChange}
              disabled={loading}
              className="role-select"
            >
              {validRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

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
              type="submit"
              disabled={loading || selectedRole === userData?.role}
              className="update-button"
            >
              {loading ? "Updating..." : "Update Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRoleUpdate;
