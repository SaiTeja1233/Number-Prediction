import React from "react";
import "./StatusPopup.css";

const StatusPopup = ({ message, type, onClose }) => {
    if (!message) return null;

    return (
        <div className={`status-popup ${type}`}>
            <div className="status-popup-content">
                <p>{message}</p>
                <button onClick={onClose} className="close-btn">
                    ×
                </button>
            </div>
        </div>
    );
};

export default StatusPopup;
