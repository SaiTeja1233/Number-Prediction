import React, { useState, useEffect } from "react";
import { account } from "../appwriteConfig";
import { Link, useNavigate } from "react-router-dom";
import "./Dashboard.css";

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const ADMIN_EMAIL = "k.saiteja1233@gmail.com";

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const loggedInUser = await account.get();
                setUser(loggedInUser);
            } catch (err) {
                console.error("Failed to fetch user:", err);
                setError("Please log in to view this page.");
                navigate("/login");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [navigate]);

    const navigateToTournaments = () => {
        navigate("/tournament");
    };
    const navigateToColorGames = () => {
        navigate("/colorgames");
    };
    const navigateToAdminPanel = () => {
        navigate("/userlist");
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
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

    const isAdmin = user && user.email === ADMIN_EMAIL;

    return (
        <div className="dashboard-main-container">
            <nav className="dashboard-navbar">
                <div className="navbar-left" onClick={() => navigate("/")}>
                    <img src="hacker.png" alt="" style={{ width: "30px" }} />
                    <span className="navbar-app-name">
                        Predict
                        <span className="orange-x">.X</span>
                    </span>
                </div>
                <div className="navbar-right">
                    {user && (
                        <div className="navbar-user-info">
                            <span className="navbar-user">
                                {user.name || user.email}
                            </span>
                            <div className="navbar-buttons">
                                <button
                                    onClick={handleLogout}
                                    className="navbar-logout-btn"
                                    disabled={loading}
                                    aria-label={
                                        loading ? "Logging out..." : "Logout"
                                    }
                                    title="Logout"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {isAdmin && (
                <button
                    className="admin-fixed-btn"
                    onClick={navigateToAdminPanel}
                    disabled={loading}
                    title="Admin Panel"
                >
                    Admin
                </button>
            )}

            <div className="dashboard-content">
                <h3 className="dashboard-welcome-heading">
                    Welcome to Predict{" "}
                    <span style={{ color: "#ffa500" }}>.X</span>
                </h3>
                <div className="game-card-container">
                    <button
                        className="game-card colorgames"
                        onClick={navigateToColorGames}
                    >
                        <h3 className="card-title">Color Games</h3>
                        <p className="card-description">
                            Predict colors and numbers to win!
                        </p>
                    </button>
                    <button
                        className="game-card tournament"
                        onClick={navigateToTournaments}
                    >
                        <h3 className="card-title">Tournaments</h3>
                        <p className="card-description">
                            Compete and win big prizes!
                        </p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
