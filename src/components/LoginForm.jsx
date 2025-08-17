import React, { useState, useEffect } from "react";
import { account } from "../appwriteConfig";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [enterKey, setEnterKey] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkUserSession = async () => {
            try {
                await account.get();
                console.log("Active session found. Redirecting to dashboard.");
                navigate("/dashboard");
            } catch (err) {
                console.log("No active session detected. User can log in.");
            }
        };

        checkUserSession();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const requiredKey = "152535";

        if (!email || !password || !enterKey) {
            setError("Please fill in all fields.");
            setLoading(false);
            return;
        }

        if (enterKey !== requiredKey) {
            setError("Invalid key. Please enter the correct key to proceed.");
            setLoading(false);
            return;
        }

        try {
            await account.createEmailPasswordSession(email, password);
            const user = await account.get();
            console.log("Logged in user:", user);
            alert("Login successful!");
            navigate("/dashboard");
        } catch (err) {
            console.error("Login error:", err);
            let errorMessage =
                err.message || "An unexpected error occurred during login.";

            if (err.code === 400 && err.message.includes("is already active")) {
                errorMessage =
                    "You are already logged in. Redirecting to dashboard...";
                navigate("/dashboard");
            } else if (err.code === 401) {
                errorMessage = "Invalid email or password.";
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleTermsClick = () => {
        setShowPopup(true);
    };

    const handleClosePopup = () => {
        setShowPopup(false);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">Sign In</h2>
                <form onSubmit={handleSubmit} className="login-form">
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
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="form-group enterKey">
                        <input
                            type="text"
                            placeholder="Enter Key..."
                            className="form-input"
                            value={enterKey}
                            onChange={(e) => setEnterKey(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    {error && <p className="message error-message">{error}</p>}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? "Logging In..." : "Sign In"}
                    </button>
                </form>
                <div className="login-footer">
                    <p>
                        Don't have an account?{" "}
                        <Link to="/register" className="register-link">
                            Register here
                        </Link>
                    </p>
                    <p className="terms-link-container">
                        <button
                            type="button"
                            onClick={handleTermsClick}
                            className="terms-link-button"
                        >
                            View Terms & Conditions
                        </button>
                    </p>
                </div>
            </div>
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

export default Login;
