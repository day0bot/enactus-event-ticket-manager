import React, { useState } from "react";
import axios from "axios";
import "../../stylesheets/DeletEvent.css";
import { API_BASE_URL } from "../../config/axios";

const DeleteEvent = ({ event, onClose, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await axios.delete(`${API_BASE_URL}/events/${event._id}`, {
        withCredentials: true,
      });

      // Call the callback to update parent component
      onDeleted(event._id);
    } catch (err) {
      console.error("Error deleting event:", err);
      setError(
        err.response?.data?.message ||
          "Failed to delete event. Please try again."
      );
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="delete-modal">
        <div className="modal-header">
          <h2>Delete Event</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="warning-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>

          <p className="delete-message">
            Are you sure you want to delete <strong>{event.title}</strong>?
          </p>
          <p className="delete-warning">
            This action cannot be undone. All event data including bookings will
            be permanently removed.
          </p>

          {error && (
            <div className="error-message">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className="delete-button"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className="spinner-small"></span>
                Deleting...
              </>
            ) : (
              "Delete Event"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteEvent;
