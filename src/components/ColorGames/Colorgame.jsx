import React from "react";
import { useNavigate } from "react-router-dom";
import "./Colorgame.css"; // Assuming you have a CSS file for styling

function Colorgame() {
    const navigate = useNavigate();

    const thirtySecWingo = () => {
        navigate("/thirtysecwingo");
    };

    const oneMinWingo = () => {
        navigate("/oneminwingo");
    };

    const threeMinWingo = () => {
        navigate("/threeminwingo");
    };

    const goBack = () => {
        navigate(-1);
    };

    return (
        <div className="colorgame-page-container">
            {/* Top Navigation Bar with Back Button and Title */}
            <nav className="colorgame-navbar">
                {/* The back button is now an image */}
                <img 
                    src="back (1).png" 
                    alt="Back to Dashboard" 
                    onClick={goBack} 
                    className="back-button-image"
                />
                <h1 className="navbar-title">Wingo Prediction</h1>
            </nav>

            {/* Game Card Container */}
            <div className="colorgame-container">
                <button
                    className="dashboard-game-card"
                    onClick={thirtySecWingo}
                >
                    <h3 className="card-title">30Sec WinGo</h3>
                    <p className="card-description">
                        Predict colors and numbers to win!
                    </p>
                </button>
                <button className="dashboard-game-card" onClick={oneMinWingo}>
                    <h3 className="card-title">1Min WinGo</h3>
                    <p className="card-description">
                        Predict colors and numbers to win!
                    </p>
                </button>
                <button className="dashboard-game-card" onClick={threeMinWingo}>
                    <h3 className="card-title">3Min WinGo</h3>
                    <p className="card-description">
                        Predict colors and numbers to win!
                    </p>
                </button>
            </div>
        </div>
    );
}

export default Colorgame;