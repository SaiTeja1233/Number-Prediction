// src/components/Login.jsx
import React, { useState, useEffect } from "react"; // Import useEffect
import { account } from "../appwriteConfig"; // Import your Appwrite account service
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // --- NEW useEffect hook to check for active session ---
    useEffect(() => {
        const checkUserSession = async () => {
            try {
                const currentUser = await account.get(); // Attempt to get the current user
                console.log(
                    "Active session found for user:",
                    currentUser.email
                );
                // If successful, a session exists, redirect them to dashboard
                navigate("/dashboard");
            } catch (err) {
                // No active session or session is invalid, proceed to show login form
                console.log("No active session detected. User can log in.");
                // You might also want to explicitly clear any stale session data here if needed,
                // but `account.get()` failing usually means no active session on the client side.
            }
        };

        checkUserSession();
        // The empty dependency array [] ensures this effect runs only once when the component mounts.
    }, [navigate]); // Add navigate to dependency array as it's used inside the effect

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (!email || !password) {
            setError("Please fill in all fields.");
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

            // Specific Appwrite error for "session already active"
            if (err.code === 400 && err.message.includes("is already active")) {
                errorMessage =
                    "You are already logged in. Redirecting to dashboard...";
                // In this case, if the error is due to an active session,
                // it implies the initial useEffect check might have been too slow,
                // or user tried to login on another tab where session was active.
                // It's safe to immediately redirect here.
                navigate("/dashboard");
            } else if (err.code === 401) {
                // 401 Unauthorized - invalid credentials
                errorMessage = "Invalid email or password.";
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
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
                    {error && <p className="message error-message">{error}</p>}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? "Logging In..." : "Sign In"}
                    </button>
                </form>
                <p className="login-footer">
                    Don't have an account?{" "}
                    <Link to="/register" className="register-link">
                        Register here
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
