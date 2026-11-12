import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../stylesheets/login.css";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        toast.success("Login successful!");
        navigate("/profile");
      } else {
        toast.error(result.error || "Login failed");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Login failed. Please check your credentials."
      );
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
        <p className="form-title">Sign in to Enactus</p>
        <div className="input-container">
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="input-container">
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Link 
          to="/forgot-password" 
          style={{ 
            textDecoration: 'underline', 
            color: '#ffd700', 
            textAlign: 'center', 
            display: 'block', 
            marginBottom: '15px',
            fontWeight: '500'
          }}
        >
          Forgot Password?
        </Link>
        <button type="submit" className="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
        <p className="signup-link">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
