import React, { useState, useEffect } from "react";
import { account } from "../appwriteConfig"; // Remove 'databases', 'databaseId', 'userPresenceCollectionId'
import { Link, useNavigate } from "react-router-dom";
import "./Dashboard.css";

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // REMOVED: const [onlineUsersCount, setOnlineUsersCount] = useState(0);
    const navigate = useNavigate();

    // REMOVED: updateUserPresence function
    // REMOVED: getOnlineUsersCount function

    useEffect(() => {
        const fetchUser = async () => { // Renamed from fetchUserAndPresence
            try {
                const loggedInUser = await account.get();
                setUser(loggedInUser);
                // REMOVED: await updateUserPresence(loggedInUser.$id);
                // REMOVED: presenceInterval and countInterval setup
            } catch (err) {
                console.error("Failed to fetch user:", err);
                setError("Please log in to view this page.");
                navigate("/login");
            } finally {
                setLoading(false);
            }
        };

        fetchUser(); // Call the updated fetchUser
        // REMOVED: return cleanup function for intervals

    }, [navigate]);

    const handleLogout = async () => {
        setLoading(true);
        try {
            // REMOVED: Optional: Delete user presence document on explicit logout
            await account.deleteSession("current");
            setUser(null);
            alert("Logged out successfully!");
            navigate("/login");
        } catch (err) {
            console.error("Logout error:", err);
            setError(err.message || "An error occurred during logout.");
        } finally {
            setLoading(false);
        }
    };

    const handleWingoClick = () => {
        navigate("/OneMinWingo");
    };

    const handleCoinWaveClick = () => {
        navigate("/CoinWave");
    };

    if (loading) {
        return (
            <div className="dashboard-loading-container">
                <div className="dashboard-loading-content">
                    <svg
                        className="dashboard-loading-spinner"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                    <p>Loading user data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error-container">
                <div className="dashboard-error-content">
                    <p className="dashboard-error-title">Error!</p>
                    <p className="dashboard-error-message">{error}</p>
                    <Link to="/login" className="dashboard-error-login-button">
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-main-container">
            <div className="dashboard-content-wrapper">
                <div className="dashboard-header">
                    <h2 className="dashboard-welcome-heading">
                        Welcome to your Prediction App
                    </h2>
                    {user && (
                        <p className="dashboard-welcome-message">
                            Hello,{" "}
                            <span className="dashboard-username">
                                {user.name || user.email}
                            </span>
                            ! Have a safe play.
                        </p>
                    )}
                    <button
                        onClick={handleLogout}
                        className="dashboard-logout-button"
                        disabled={loading}
                        aria-label={loading ? "Logging out..." : "Logout"}
                        title="Logout"
                    >
                        {loading ? (
                            <span className="spinner"></span>
                        ) : (
                            <svg
                                className="logout-icon"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                    </button>
                </div>

                {/* REMOVED: Online users display */}
                {/*
                <div className="online-users-display">
                    <p>Users Online: <span className="online-count">{onlineUsersCount}</span></p>
                </div>
                */}

                <div className="dashboard-game-cards">
                    <button
                        className="dashboard-game-card"
                        onClick={handleWingoClick}
                    >
                        <h3 className="card-title">Wingo</h3>
                        <p className="card-description">
                            Predict colors and numbers to win!
                        </p>
                    </button>
                    <button
                        className="dashboard-game-card"
                        onClick={handleCoinWaveClick}
                    >
                        <h3 className="card-title">CoinWave</h3>
                        <p className="card-description">
                            Flip coins and ride the wave of fortune.
                        </p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;