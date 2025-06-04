// src/components/Register.jsx
import React, { useState } from "react";
import { account, ID } from "../appwriteConfig"; // Import your Appwrite account service and ID
import { Link, useNavigate } from "react-router-dom";
import "./Register.css"; // <--- Ensure this import is present

const Register = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false); // New loading state
    const navigate = useNavigate(); // For redirection after successful registration

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        if (!username || !email || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            // Appwrite default minimum password length is 8 characters
            setError("Password must be at least 8 characters long.");
            setLoading(false);
            return;
        }

        try {
            // Create user account in Appwrite
            await account.create(
                ID.unique(), // Generates a unique user ID
                email,
                password,
                username // Optional: name for the user
            );
            setSuccess("Registration successful! Logging in...");
            // Optionally, you can also log them in immediately after registration:
            await account.createEmailPasswordSession(email, password);
            console.log("Registered and logged in user:", await account.get());
            navigate("/dashboard"); // Redirect to dashboard after successful registration and login
        } catch (err) {
            console.error("Registration error:", err);
            setError(
                err.message ||
                    "An unexpected error occurred during registration."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <h2 className="register-title">Create Account</h2>
                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            className="form-input"
                            placeholder="Choose a username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            placeholder="Your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            id="confirmPassword"
                            className="form-input"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    {error && <p className="message error-message">{error}</p>}
                    {success && (
                        <p className="message success-message">{success}</p>
                    )}
                    <button
                        type="submit"
                        className="register-button"
                        disabled={loading}
                    >
                        {loading ? "Registering..." : "Register"}
                    </button>
                </form>
                <p className="register-footer">
                    Already have an account?{" "}
                    <Link to="/login" className="login-link">
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
