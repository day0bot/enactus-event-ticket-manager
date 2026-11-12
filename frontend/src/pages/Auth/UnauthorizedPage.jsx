import React from "react";
import { Link } from "react-router-dom";
import "../../stylesheets/UnauthorizedPage.css";

const UnauthorizedPage = () => {
  return (
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        <div className="unauthorized-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            <circle cx="12" cy="16" r="1"></circle>
          </svg>
        </div>
        <h1>Access Denied</h1>
        <p className="error-code">403</p>
        <p className="error-message">
          You don't have permission to access this page. This area is
          restricted.
        </p>
        <div className="action-links">
          <Link to="/" className="primary-button">
            Return to Home
          </Link>
          <Link to="/login" className="secondary-button">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
