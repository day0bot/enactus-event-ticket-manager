import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Cropper from "react-easy-crop";
import getCroppedImg from "../../utils/cropImage";
import imageCompression from "browser-image-compression";
import "../../stylesheets/profile.css";
import { Button } from "@mui/material";

const UpdateProfileForm = () => {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        profilePicture: "",
    });
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [image, setImage] = useState(null);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [showCropper, setShowCropper] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const response = await axios.get("http://localhost:8000/api/v1/users/profile", {
                    withCredentials: true,
                });
                setFormData({
                    name: response.data.name,
                    email: response.data.email,
                    profilePicture: response.data.profilePicture || "",
                });
            } catch (error) {
                console.log(error);
                setError("Failed to fetch user profile. Please try again.");
            }
        };
        fetchUserProfile();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(reader.result);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleCropSave = async () => {
        try {
            const croppedImage = await getCroppedImg(image, croppedAreaPixels);
            const compressedImage = await imageCompression(croppedImage, {
                maxSizeMB: 0.2,
                maxWidthOrHeight: 800,
                useWebWorker: true,
            });

            const uploadData = new FormData();
            uploadData.append("profilePicture", compressedImage);

            const response = await axios.post(
                "http://localhost:8000/api/v1/users/upload-profile-picture",
                uploadData,
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            setFormData((prev) => ({
                ...prev,
                profilePicture: response.data.profilePicture,
            }));
            setSuccessMessage("Profile picture updated successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
            setShowCropper(false);
        } catch (error) {
            console.log(error);
            setError("Failed to upload profile picture. Please try again.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.put(
                "http://localhost:8000/api/v1/users/profile",
                formData,
                { withCredentials: true }
            );
            setSuccessMessage("Profile updated successfully!");
            
            setTimeout(() => {
                setSuccessMessage("");
                window.location.href = "/profile";
            }, 2000);
        } catch (error) {
            console.log(error);
            setError("Failed to update profile. Please try again.");
        }
    };

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <div className="profile-header">
                    <img
                        src={formData.profilePicture || "https://via.placeholder.com/150"}
                        alt="Profile"
                        className="profile-picture"
                    />
                    <div className="profile-edit-picture">
                        <input
                            type="file"
                            id="profile-picture-upload"
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{ display: "none" }}
                        />
                        <label htmlFor="profile-picture-upload" className="btn-yellow">
                            Change Photo
                        </label>
                    </div>
                </div>

                {showCropper && (
                    <div className="cropper-overlay">
                        <div className="cropper-modal">
                            <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", gap: "1rem", marginBottom: "1rem" }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleCropSave}
                                >
                                    Save Photo
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="primary"
                                    onClick={() => setShowCropper(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                            <div style={{ width: 300, height: 300, position: "relative" }}>
                                <Cropper
                                    image={image}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={handleCropComplete}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {successMessage && <div className="success-message">{successMessage}</div>}

                <form onSubmit={handleSubmit} className="profile-form">
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            disabled
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn-yellow">Save Changes</button>
                        <button
                            type="button"
                            className="btn-grey"
                            onClick={() => navigate("/profile")}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateProfileForm;