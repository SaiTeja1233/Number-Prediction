/* global BigInt */

import React, { useEffect, useState, useCallback, useRef } from "react";
import "./OneMinWingo.css";
import { useNavigate } from "react-router-dom";
import LogicsMenu from "../LogicsMenu";

// Helper: Get IST time
const getISTTime = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(
        now.getTime() + istOffset - now.getTimezoneOffset() * 60000
    );
};

// Get color for number
const getColorFromNumber = (num) => {
    if (num === 0) return "🔴🟣";
    if (num === 5) return "🟢🟣";
    if (num % 2 === 0) return "🔴";
    return "🟢";
};

// Get size for number
const getSizeFromNumber = (num) => {
    return num >= 5 ? "Big" : "Small";
};

const OneMinWingo = () => {
    const [latestPeriod, setLatestPeriod] = useState("");
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(59);

    const [predictedSize, setPredictedSize] = useState("");
    const [predictedColor, setPredictedColor] = useState("");
    const [predictedNumbers, setPredictedNumbers] = useState([]);
    const [selectedLogic, setSelectedLogic] = useState(
        "Size & Color Tie-Breaker"
    );
    const [copyMessage, setCopyMessage] = useState(null);

    const navigate = useNavigate();
    const logicsMenuRef = useRef(null); // Create a ref to access child functions

    const backToDashboard = () => {
        navigate("/dashboard");
    };

    const handlePredictionUpdate = useCallback((prediction) => {
        setPredictedSize(prediction.size);
        setPredictedColor(prediction.color);
        setPredictedNumbers(prediction.numbers);
        setSelectedLogic(prediction.logic);
    }, []);

    const handleLogicSelect = useCallback((logic) => {
        setSelectedLogic(logic);
    }, []);

    // Fetch API history
    const fetchHistory = useCallback(
        async (isRetry = false) => {
            try {
                const response = await fetch(
                    `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${Date.now()}`
                );
                const data = await response.json();
                const list = data?.data?.list;

                if (Array.isArray(list)) {
                    const currentPeriod = list[0]?.issueNumber;
                    if (currentPeriod && currentPeriod !== latestPeriod) {
                        setLatestPeriod(currentPeriod);
                    } else if (!isRetry) {
                        setTimeout(() => fetchHistory(true), 2000);
                    }

                    setHistory(list);
                    setError(null);
                } else {
                    throw new Error("Unexpected data format");
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Failed to load data");
            }
        },
        [latestPeriod]
    );

    // Timer and polling
    useEffect(() => {
        fetchHistory();
        const interval = setInterval(() => {
            const now = getISTTime();
            const seconds = now.getSeconds();
            const count = 59 - seconds;
            setSecondsLeft(count);
            if (count === 0) {
                fetchHistory();
                // Clear the prediction when the timer resets
                handlePredictionUpdate({
                    size: "",
                    color: "",
                    numbers: [],
                    logic: selectedLogic,
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [fetchHistory, handlePredictionUpdate, selectedLogic]);

    // Handle copy to clipboard
    const handleCopyClick = async () => {
        const predictionText = predictedSize
            ? predictedSize
            : predictedColor === "🟢"
            ? "GREEN"
            : predictedColor === "🔴"
            ? "RED"
            : "N/A";

        // Get formatted date and time
        const currentDate = new Date();
        const formattedDateTime = currentDate.toLocaleString();

        // Calculate the next period number
        const nextPeriod = latestPeriod
            ? String(BigInt(latestPeriod) + 1n)
            : "-----";

        // Construct the multi-line text to copy
        const textToCopy = `WINGO : 1 MinWinGo\nDATE : ${formattedDateTime}\nPERIOD : ${nextPeriod}\nPREDICTION : ${predictionText}\nNUMBER : ${predictedNumbers.join(
            " , "
        )}`;

        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopyMessage("Copied!");
            setTimeout(() => {
                setCopyMessage(null);
            }, 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
            setCopyMessage("Failed to copy");
        }
    };

    return (
        <div className="one-min-wrapper">
            {/* Header */}
            <div className="Wingo-header">
                <img
                    src="back (1).png"
                    alt="back"
                    onClick={backToDashboard}
                    style={{ width: "20px" }}
                />
                <h2>1 Minute WinGo Prediction</h2>
            </div>

            {/* Logics Menu */}
            <div className="logics-menu">
                <div className="logics-menu-left">
                    <LogicsMenu
                        ref={logicsMenuRef}
                        history={history}
                        onPredictionUpdate={handlePredictionUpdate}
                        selectedLogic={selectedLogic}
                        onSelectLogic={handleLogicSelect}
                    />
                </div>
                <p className="selected-logic-display">
                    Active Logic: {selectedLogic}
                </p>
            </div>

            {/* Top Border */}
            <div className="Topline"></div>

            {/* Prediction Box */}
            <div className="prediction-box">
                <div className="prediction-box-left">
                    <p>Time remaining</p>
                    <div className="digital-timer-container">
                        <div className="timer-box">0</div>
                        <div className="timer-box">0</div>
                        <div className="colon">:</div>
                        <div className="timer-box">
                            {Math.floor(secondsLeft / 10)}
                        </div>
                        <div className="timer-box">{secondsLeft % 10}</div>
                    </div>
                    <p className="next-period-num">
                        {latestPeriod
                            ? String(BigInt(latestPeriod) + 1n)
                            : "-----"}
                    </p>
                </div>
                <div className="prediction-box-right">
                    <div
                        className={`prediction ${
                            predictedColor === "🟢"
                                ? "green"
                                : predictedColor === "🔴"
                                ? "red"
                                : ""
                        }`}
                    >
                        {predictedSize
                            ? predictedSize
                            : predictedColor === "🟢"
                            ? "GREEN"
                            : predictedColor === "🔴"
                            ? "RED"
                            : ""}
                    </div>
                    <div className="prediction-Num">
                        {predictedNumbers.length > 0
                            ? predictedNumbers.join(" , ")
                            : ""}
                    </div>
                </div>
            </div>

            {/* Buttons and Copy Message */}
            <div className="button-container">
                <button
                    className="button button-primary"
                    onClick={() => logicsMenuRef.current?.generatePrediction()}
                >
                    Result
                </button>
                <button
                    className="button button-secondary"
                    onClick={handleCopyClick}
                >
                    Copy
                </button>
            </div>
            {copyMessage && <p className="copy-message">{copyMessage}</p>}

            {/* Error or Loading */}
            {error && <p style={{ color: "red" }}>{error}</p>}
            {history.length === 0 ? (
                <p>Loading...</p>
            ) : (
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Period</th>
                            <th>Number</th>
                            <th>Big/Small</th>
                            <th>Color</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((item) => {
                            const number = parseInt(item.number);
                            return (
                                <tr key={item.issueNumber}>
                                    <td>{item.issueNumber}</td>
                                    <td
                                        className={
                                            number % 2 === 0
                                                ? "number-even"
                                                : "number-odd"
                                        }
                                    >
                                        {number}
                                    </td>
                                    <td>{getSizeFromNumber(number)}</td>
                                    <td>{getColorFromNumber(number)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default OneMinWingo;
