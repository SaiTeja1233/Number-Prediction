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
    const [predictionMode, setPredictionMode] = useState("human");
    const [consecutiveLosses, setConsecutiveLosses] = useState(0);

    const scannerThingRef = useRef(null);
    const navigate = useNavigate();
    const timeoutRef = useRef(null); // Ref to hold the timeout ID

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

    // New function to stop the prediction and reset states
    const handleStopPrediction = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setIsResultClicked(false);
        setGlowAnimationActive(false);
        setShowCard(false);
        setIsFadingOut(false);
        setPredictedResult(null);
        setShowCopyButton(false);
    };

    const getHumanPrediction = useCallback((historyData) => {
        if (historyData.length < 2) {
            return { color: "Green", size: "BIG" };
        }

        const lastTwoColors = historyData
            .slice(0, 2)
            .map((item) => getColorFromNumber(parseInt(item.number)));
        const lastTwoSizes = historyData
            .slice(0, 2)
            .map((item) => getSizeFromNumber(parseInt(item.number)));

        let predictedColor;
        if (lastTwoColors[0] === lastTwoColors[1]) {
            predictedColor = lastTwoColors[0] === "Red" ? "Green" : "Red";
        } else {
            predictedColor = lastTwoColors[1] === "Red" ? "Green" : "Red";
        }

        let predictedSize;
        if (lastTwoSizes[0] === lastTwoSizes[1]) {
            predictedSize = lastTwoSizes[0] === "BIG" ? "SMALL" : "BIG";
        } else {
            predictedSize = lastTwoSizes[1] === "BIG" ? "SMALL" : "BIG";
        }

        return { color: predictedColor, size: predictedSize };
    }, []);

    const getRobotPrediction = useCallback((historyData) => {
        if (historyData.length < 10) {
            return { color: "Green", size: "BIG" };
        }

        const recentHistory = historyData.slice(0, 10);
        const colorCounts = recentHistory.reduce((acc, item) => {
            const color = getColorFromNumber(parseInt(item.number));
            acc[color] = (acc[color] || 0) + 1;
            return acc;
        }, {});

        const sizeCounts = recentHistory.reduce((acc, item) => {
            const size = getSizeFromNumber(parseInt(item.number));
            acc[size] = (acc[size] || 0) + 1;
            return acc;
        }, {});

        const predictedColor =
            colorCounts["Red"] <= colorCounts["Green"] ? "Red" : "Green";
        const predictedSize =
            sizeCounts["BIG"] <= sizeCounts["SMALL"] ? "BIG" : "SMALL";

        return { color: predictedColor, size: predictedSize };
    }, []);

    const handleAIButtonClick = () => {
        if (!isResultClicked) {
            setGlowAnimationActive(true);
            setIsResultClicked(true);
            setShowCard(false);
            setIsFadingOut(false);
            setShowCopyButton(false);

            let predictions;
            if (predictionMode === "human") {
                predictions = getHumanPrediction(history);
            } else {
                predictions = getRobotPrediction(history);
            }

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

            // Clear any previous timeouts before setting new ones
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setShowCard(true);
                setShowCopyButton(true);
            }, 3000);

            timeoutRef.current = setTimeout(() => {
                handleStopPrediction(); // Use the new function to reset all states
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
            const predictionText = predictedResult;

            const textToCopy = `╭⭑───────────────⭑╮
📅 DATE : ${formattedDateTime}
╰⭑───────────────⭑╯
╭⚬──────────────────⚬╮
│ 🎯 WINGO      : 30 Sec WinGo
│ ⏳ PERIOD     : ${nextPeriod}
│ 🔮 PREDICTION : ${predictionText}
╰⚬──────────────────⚬╯
`;

            try {
                await navigator.clipboard.writeText(textToCopy);
                alert("Prediction copied to clipboard!");
                handleStopPrediction();
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

            if (remainingSeconds === 28) {
                const latestItem = history[0];
                if (latestItem && predictedResult) {
                    const actualColor = getColorFromNumber(
                        parseInt(latestItem.number)
                    );
                    const actualSize = getSizeFromNumber(
                        parseInt(latestItem.number)
                    );

                    const isLoss =
                        predictedResult !== actualColor &&
                        predictedResult !== actualSize;

                    if (isLoss) {
                        setConsecutiveLosses((prev) => prev + 1);
                    } else {
                        setConsecutiveLosses(0);
                    }
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [fetchHistory, history, predictedResult]);

    useEffect(() => {
        if (consecutiveLosses >= 1) {
            setPredictionMode("robot");
        } else {
            setPredictionMode("human");
        }
    }, [consecutiveLosses]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        if (secondsLeft <= 2 && showCard) {
            setIsFadingOut(true);
            setTimeout(() => {
                handleStopPrediction(); // Use the new function to reset states
            }, 1000);
        }
    }, [secondsLeft, showCard]);

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

            {/* This is the new button group for Copy and Stop */}
            {showCopyButton && (
                <div className="copy-stop-button-container">
                    <button
                        className={`copy-prediction-btn ${
                            isFadingOut ? "fade-out" : "fade-in"
                        }`}
                        onClick={handleCopyPrediction}
                    >
                        Copy Prediction
                    </button>
                    <button
                        className={`stop-prediction-btn ${
                            isFadingOut ? "fade-out" : "fade-in"
                        }`}
                        onClick={handleStopPrediction}
                    >
                        Stop Prediction
                    </button>
                </div>
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
                                    <td>
                                        {number === 0 ? (
                                            <>🔴🟣</>
                                        ) : number === 5 ? (
                                            <>🟢🟣</>
                                        ) : getColorFromNumber(number) ===
                                          "Green" ? (
                                            <>🟢</>
                                        ) : (
                                            <>🔴</>
                                        )}
                                    </td>
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
