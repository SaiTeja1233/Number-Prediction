import React from "react";
import { useNavigate } from "react-router-dom";
import "./Tournament.css";

function Tournament() {
    const navigate = useNavigate();

    const handleGoBack = () => {
        navigate(-1); // Navigates to the previous page
    };

    return (
        <div className="tournament-container">
            <h1>Tournaments Coming Soon...</h1>
            <p>
                We're working hard to bring you an exciting new feature. Stay
                tuned for updates!
            </p>
            <button onClick={handleGoBack} className="back-button">
                Go Back
            </button>
        </div>
    );
}

export default Tournament;
