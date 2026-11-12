import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/axios';
import { toast } from 'react-toastify';
import '../../stylesheets/login.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [step, setStep] = useState(1); // 1: email input, 2: OTP and new password
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error('Please enter your email');
            return;
        }

        setIsSubmitting(true);
        try {
            await axios.put('/auth/forgetPassword', { email });
            toast.success('OTP has been sent to your email');
            setStep(2);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send OTP');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!otp || !newPassword) {
            toast.error('Please fill in all fields');
            return;
        }

        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        setIsSubmitting(true);
        try {
            await axios.post('/auth/changePasswordWithOtp', {
                email,
                otp,
                newPassword
            });
            toast.success('Password reset successful');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="signup-container">
            <form className="form" onSubmit={step === 1 ? handleRequestOTP : handleResetPassword}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                    <img
                        src="/enactus-logo.png"
                        alt="Enactus Logo"
                        style={{ width: "64px", height: "64px", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                    />
                </div>
                <p className="form-title">Reset Password</p>
                
                {step === 1 ? (
                    <>
                        <div className="input-container">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Sending OTP..." : "Send OTP"}
                        </button>
                    </>
                ) : (
                    <>
                        <div className="input-container">
                            <input
                                type="text"
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                            />
                        </div>
                        <div className="input-container">
                            <input
                                type="password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Resetting..." : "Reset Password"}
                        </button>
                    </>
                )}

                <p className="signup-link">
                    <span 
                        onClick={() => navigate('/login')} 
                        style={{ cursor: 'pointer', color: '#1a73e8' }}
                    >
                        Back to Login
                    </span>
                </p>
            </form>
        </div>
    );
};

export default ForgotPassword; 