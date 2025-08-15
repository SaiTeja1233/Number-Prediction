/* global BigInt */

import React, { useEffect, useState, useCallback, useRef } from "react";
import "./ThirtySecWingo.css";
import { useNavigate } from "react-router-dom";
import { getISTTime, fetchThirtySecData } from "../../predictionLogic";

const ThirtySecWingo = () => {
    const [latestPeriod, setLatestPeriod] = useState("");
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(29);
    const [isResultClicked, setIsResultClicked] = useState(false);
    const [glowAnimationActive, setGlowAnimationActive] = useState(false);
    const [showCard, setShowCard] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [predictedResult, setPredictedResult] = useState(null);
    const [showCopyButton, setShowCopyButton] = useState(false);

    const scannerThingRef = useRef(null);
    const navigate = useNavigate();

    const backToDashboard = () => {
        navigate(-1);
    };

    const getSizeFromNumber = (number) => {
        if (number >= 5) {
            return "BIG";
        } else {
            return "SMALL";
        }
    };

    const getColorFromNumber = (number) => {
        if (number % 2 === 0) {
            return "Red";
        } else {
            return "Green";
        }
    };

    const getHumanPrediction = (historyData) => {
        const colors = historyData.map((item) =>
            getColorFromNumber(parseInt(item.number))
        );
        const sizes = historyData.map((item) =>
            getSizeFromNumber(parseInt(item.number))
        );

        let predictedColor = null;
        if (colors.length >= 2) {
            const lastTwoColors = colors.slice(-2);
            if (lastTwoColors[0] !== lastTwoColors[1]) {
                predictedColor = lastTwoColors[0];
            } else {
                predictedColor = lastTwoColors[0] === "Red" ? "Green" : "Red";
            }
        } else {
            predictedColor = "Green";
        }

        let predictedSize = null;
        const sizeCounts = sizes.reduce((acc, size) => {
            acc[size] = (acc[size] || 0) + 1;
            return acc;
        }, {});

        if (sizeCounts["BIG"] > sizeCounts["SMALL"]) {
            predictedSize = "SMALL";
        } else if (sizeCounts["SMALL"] > sizeCounts["BIG"]) {
            predictedSize = "BIG";
        } else {
            predictedSize = sizes[sizes.length - 1] === "BIG" ? "SMALL" : "BIG";
        }

        return { color: predictedColor, size: predictedSize };
    };

    const handleAIButtonClick = () => {
        if (!isResultClicked) {
            setGlowAnimationActive(true);
            setIsResultClicked(true);
            setShowCard(false);
            setIsFadingOut(false);
            setShowCopyButton(false);

            // Get both predictions from your existing logic
            const predictions = getHumanPrediction(history);

            // Randomly select one prediction (color or size)
            const predictionArray = [predictions.color, predictions.size];
            const randomIndex = Math.floor(
                Math.random() * predictionArray.length
            );
            const selectedPrediction = predictionArray[randomIndex];

            setPredictedResult(selectedPrediction);

            const holdDuration = secondsLeft > 3 ? secondsLeft - 3 : 0;
            const animationDuration = holdDuration + 2;

            if (scannerThingRef.current) {
                scannerThingRef.current.style.setProperty(
                    "--glow-duration",
                    `${animationDuration}s`
                );
            }

            setTimeout(() => {
                setShowCard(true);
                setShowCopyButton(true);
            }, 3000);

            setTimeout(() => {
                setGlowAnimationActive(false);
                setIsResultClicked(false);
                setPredictedResult(null);
                setShowCard(false);
                setShowCopyButton(false);
            }, animationDuration * 1000);
        }
    };

    const handleCopyPrediction = async () => {
        if (predictedResult && latestPeriod) {
            const formattedDateTime = new Date().toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            });

            const nextPeriod = String(BigInt(latestPeriod) + 1n);
            const predictionText = predictedResult; // Use the single predicted string directly

            const textToCopy = `╭⭑───────────────⭑╮
📅 DATE : ${formattedDateTime}
╰⭑───────────────⭑╯
╭⚬──────────────────⚬╮
│ 🎯 WINGO      : 30 Sec WinGo
│ ⏳ PERIOD     : ${nextPeriod}
│ 🔮 PREDICTION : ${predictionText}
╰⚬──────────────────⚬╯
`;

            try {
                await navigator.clipboard.writeText(textToCopy);
                alert("Prediction copied to clipboard!");
                setGlowAnimationActive(false);
                setIsResultClicked(false);
                setPredictedResult(null);
                setShowCard(false);
                setShowCopyButton(false);
            } catch (err) {
                console.error("Failed to copy: ", err);
                alert("Failed to copy prediction. Please try again.");
            }
        }
    };

    const fetchHistory = useCallback(
        async (isRetry = false) => {
            try {
                const list = await fetchThirtySecData();
                if (Array.isArray(list) && list.length > 0) {
                    const currentPeriod = list[0]?.issueNumber;
                    if (currentPeriod && currentPeriod !== latestPeriod) {
                        setLatestPeriod(currentPeriod);
                        setHistory(list);
                        setError(null);
                    } else if (!isRetry) {
                        setTimeout(() => fetchHistory(true), 1000);
                    }
                } else {
                    throw new Error("Unexpected data format or empty list");
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Failed to load data");
            }
        },
        [latestPeriod]
    );

    useEffect(() => {
        const interval = setInterval(() => {
            const now = getISTTime();
            const seconds = now.getSeconds();
            const remainingSeconds = 29 - (seconds % 30);
            setSecondsLeft(remainingSeconds);
            if (remainingSeconds === 29) {
                fetchHistory();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [fetchHistory]);

    useEffect(() => {
        if (secondsLeft <= 2 && showCard) {
            setIsFadingOut(true);
            setTimeout(() => {
                setShowCard(false);
                setIsFadingOut(false);
                setShowCopyButton(false);
                setGlowAnimationActive(false);
                setIsResultClicked(false);
                setPredictedResult(null);
            }, 1000);
        }
    }, [secondsLeft, showCard]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return (
        <div className="one-min-wrapper">
            <div className="Wingo-header">
                <img
                    src="back (1).png"
                    alt="back"
                    onClick={backToDashboard}
                    style={{ width: "20px", cursor: "pointer" }}
                />
                <h2>30 Second WinGo Prediction</h2>
            </div>
            <div className="Topline"></div>
            <div className="thirtySecprediction-box">
                <div className="prediction-box-upper">
                    <p>Time remaining</p>
                    <div className="digital-timer-container">
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
            </div>

            <div className="button-wrapper">
                <div className="prediction-control-box">
                    <button
                        onClick={handleAIButtonClick}
                        className="predict-btn get-result-btn"
                        disabled={isResultClicked}
                    >
                        {isResultClicked ? "Scanning..." : "AI Predict.X"}
                    </button>
                </div>
            </div>

            <div className={`loader ${isResultClicked ? "active" : ""}`}>
                <div className="eva">
                    <div className="head">
                        <div className="eyeChamber">
                            <div className="eye"></div>
                            <div className="eye"></div>
                        </div>
                    </div>
                    <div className="body">
                        <div className="hand"></div>
                        <div className="hand"></div>
                        <div
                            ref={scannerThingRef}
                            className={`scannerThing ${
                                glowAnimationActive ? "animate-glow" : ""
                            }`}
                        ></div>
                        <div className="scannerOrigin"></div>
                    </div>
                </div>
            </div>

            {showCard && predictedResult && (
                <div
                    className={`wingo-outer ${
                        isFadingOut ? "fade-out" : "fade-in"
                    }`}
                >
                    <div
                        className={`wingo-dot ${
                            predictedResult === "Red" ||
                            predictedResult === "Green"
                                ? predictedResult.toLowerCase()
                                : ""
                        }`}
                    ></div>
                    <div className="wingo-card">
                        <div className="wingo-ray"></div>
                        <div className="wingo-text-number">
                            {latestPeriod
                                ? String(BigInt(latestPeriod) + 1n)
                                : ""}
                        </div>
                        <div
                            className={`wingo-text-color-size ${
                                predictedResult === "Red" ||
                                predictedResult === "Green"
                                    ? predictedResult.toLowerCase()
                                    : ""
                            }`}
                        >
                            {predictedResult}
                        </div>
                        <div className="wingo-line wingo-topl"></div>
                        <div className="wingo-line wingo-leftl"></div>
                        <div className="wingo-line wingo-bottoml"></div>
                        <div className="wingo-line wingo-rightl"></div>
                    </div>
                </div>
            )}

            {showCopyButton && (
                <button
                    className={`copy-prediction-btn ${
                        isFadingOut ? "fade-out" : "fade-in"
                    }`}
                    onClick={handleCopyPrediction}
                >
                    Copy Prediction
                </button>
            )}

            {error && (
                <p style={{ color: "red", textAlign: "center" }}>{error}</p>
            )}

            {history.length === 0 ? (
                <table className="history-table">
                    <tbody>
                        <tr>
                            <td colSpan="4" style={{ textAlign: "center" }}>
                                Loading...
                            </td>
                        </tr>
                    </tbody>
                </table>
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

export default ThirtySecWingo;
