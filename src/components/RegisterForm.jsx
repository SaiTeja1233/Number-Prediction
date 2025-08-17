import React, { useState } from "react";
import { account, ID } from "../appwriteConfig";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

const Register = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [isAccepted, setIsAccepted] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const navigate = useNavigate();

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
            setError("Password must be at least 8 characters long.");
            setLoading(false);
            return;
        }

        if (!isAccepted) {
            setError("Please accept the terms and conditions.");
            setLoading(false);
            return;
        }

        try {
            await account.create(ID.unique(), email, password, username);
            setSuccess("Registration successful! Logging in...");
            await account.createEmailPasswordSession(email, password);
            console.log("Registered and logged in user:", await account.get());
            navigate("/dashboard");
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

    const handleCheckboxChange = (e) => {
        setIsAccepted(e.target.checked);
    };

    const handleTermsClick = (e) => {
        e.preventDefault();
        setShowPopup(true);
    };

    const handleClosePopup = () => {
        setShowPopup(false);
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
                    {/* Updated Checkbox with Uiverse.io SVG */}
                    <div className="terms-checkbox-container">
                        <div class="checkbox-wrapper">
                            <input
                                checked={isAccepted}
                                onChange={handleCheckboxChange}
                                type="checkbox"
                                class="check"
                                id="check1-61"
                                disabled={loading}
                            />
                            <label for="check1-61" class="label">
                                <svg width="45" height="45" viewBox="0 0 95 95">
                                    <rect
                                        x="30"
                                        y="20"
                                        width="50"
                                        height="50"
                                        stroke="black"
                                        fill="none"
                                    ></rect>
                                    <g transform="translate(0,-952.36222)">
                                        <path
                                            d="m 56,963 c -102,122 6,9 7,9 17,-5 -66,69 -38,52 122,-77 -7,14 18,4 29,-11 45,-43 23,-4"
                                            stroke="black"
                                            stroke-width="3"
                                            fill="none"
                                            class="path1"
                                        ></path>
                                    </g>
                                </svg>
                                <span>
                                    I accept the{" "}
                                    <button
                                        type="button"
                                        onClick={handleTermsClick}
                                        className="terms-link-button"
                                    >
                                        Terms & Conditions
                                    </button>
                                </span>
                            </label>
                        </div>
                    </div>
                    {error && <p className="message error-message">{error}</p>}
                    {success && (
                        <p className="message success-message">{success}</p>
                    )}
                    <button
                        type="submit"
                        className="register-button"
                        disabled={loading || !isAccepted}
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
            {/* Safety Instructions Pop-up */}
            {showPopup && (
                <div className="popup-overlay">
                    <div className="popup-card">
                        <div className="popup-header">
                            <h3>Safety Instructions & Terms</h3>
                        </div>
                        <div className="popup-content">
                            <p>
                                ⚠️ **Attention:** Users under 18 years of age
                                are not permitted to use this application.
                            </p>
                            <p>
                                This app is intended for responsible use. Any
                                discomfort or misuse of this app is at your own
                                risk. Please follow all safety measures and
                                guidelines.
                            </p>
                            <ul>
                                <li>Always use strong, unique passwords.</li>
                                <li>
                                    Do not share your login credentials with
                                    anyone.
                                </li>
                                <li>
                                    Report any suspicious activity immediately.
                                </li>
                            </ul>
                            <p>
                                By clicking "OK," you acknowledge and agree to
                                these terms.
                            </p>
                        </div>
                        <div className="popup-footer">
                            <button
                                className="ok-button"
                                onClick={handleClosePopup}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Register;
