import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../stylesheets/AdminUsersPage.css";
import { exportToCsv } from "../../utils/csvExport";
import { API_BASE_URL } from "../../config/axios";

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/users`, {
          withCredentials: true,
        });
        setUsers(response.data);
        setFilteredUsers(response.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch users");
        if (err.response?.status === 403) {
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  useEffect(() => {
    // Filter users based on search term
    const results = users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(results);
    setCurrentPage(1); // Reset to first page on new search
  }, [searchTerm, users]);

  const handleUpdateRole = (user) => {
    navigate(`/admin/users/edit/${user._id}`, {
      state: { user },
    });
  };

  const handleDeleteUser = (user) => {
    navigate(`/admin/users/delete/${user._id}`, {
      state: { user },
    });
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleExportCsv = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      alert("No users to export");
      return;
    }
    const columns = [
      { header: "Name", key: "name" },
      { header: "Email", key: "email" },
      { header: "Role", key: "role" },
      { header: "Date Joined", key: (u) => (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "") },
      { header: "User ID", key: "_id" },
    ];
    exportToCsv(`enactus_users_${new Date().toISOString().slice(0, 10)}`, filteredUsers, columns);
  };

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Get role class for styling
  const getRoleClass = (role) => {
    if (role.toLowerCase().includes("admin")) return "role-admin";
    if (role.toLowerCase().includes("organizer")) return "role-organizer";
    return "role-user";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="error-alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12" y2="16"></line>
          </svg>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <h1 className="page-title">User Management</h1>
        <button
          onClick={handleExportCsv}
          type="button"
          style={{
            backgroundColor: "#eab308",
            color: "#ffffff",
            padding: "8px 16px",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          Export to CSV
        </button>
      </div>

      <div className="search-filter">
        <input
          type="text"
          placeholder="Search by name, email or role..."
          className="search-input"
          value={searchTerm}
          onChange={handleSearch}
        />
      </div>

      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Date Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentUsers.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center" }}>
                No users found
              </td>
            </tr>
          ) : (
            currentUsers.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`user-role ${getRoleClass(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="action-buttons">
                  <button
                    className="btn btn-edit"
                    onClick={() => handleUpdateRole(user)}
                    aria-label={`Edit ${user.name}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit Role
                  </button>
                  <button
                    className="btn btn-delete"
                    onClick={() => handleDeleteUser(user)}
                    aria-label={`Delete ${user.name}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              onClick={() => paginate(index + 1)}
              className={currentPage === index + 1 ? "active" : ""}
            >
              {index + 1}
            </button>
          ))}

          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
