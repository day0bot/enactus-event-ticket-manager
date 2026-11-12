import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../stylesheets/register.css"; // Fixed path assuming "styles" is your folder name
import axios from "axios";
import { API_BASE_URL } from "../../config/axios";

function Register() {
  // State variables
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const navigate = useNavigate();

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!email.match(/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!role) {
      newErrors.role = "Please select a role";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Fixed API endpoint to match backend routes
      const response = await axios.post(
        `${API_BASE_URL}/auth/register`,
        {
          name,
          email,
          password,
          role,
        },
        {
          timeout: 5000, // 5 second timeout
          withCredentials: true, // If using cookies
        }
      );

      console.log("Registration successful:", response.data);
      alert("Account created successfully!");
      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error);

      // Better error handling
      if (error.response?.status === 409) {
        setSubmitError("This email is already registered");
      } else if (error.response?.data?.message) {
        setSubmitError(error.response.data.message);
      } else if (error.message) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Registration failed. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup-container">
      <form className="form" onSubmit={handleSubmit}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          <img
            src="/enactus-logo.png"
            alt="Enactus Logo"
            style={{ width: "64px", height: "64px", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
          />
        </div>
        <p className="form-title">Create your Enactus account</p>

        {submitError && <div className="error-message">{submitError}</div>}

        <div className="input-container">
          <input
            type="text"
            placeholder="Enter Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={errors.name ? "error" : ""}
            required
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="input-container">
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={errors.email ? "error" : ""}
            required
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <div className="input-container">
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={errors.password ? "error" : ""}
            required
          />
          {errors.password && (
            <span className="error-text">{errors.password}</span>
          )}
        </div>

        <div className="input-container">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={errors.role ? "error" : ""}
            required
          >
            <option value="" disabled>
              Select a Role
            </option>
            <option value="Standard User">User</option>
            <option value="Organizer">Event Organizer</option>
            <option value="System Admin">Admin</option>
          </select>
          {errors.role && <span className="error-text">{errors.role}</span>}
        </div>

        <button type="submit" className="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner"></span>
              Signing up...
            </>
          ) : (
            "Sign up"
          )}
        </button>

        <p className="signup-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
