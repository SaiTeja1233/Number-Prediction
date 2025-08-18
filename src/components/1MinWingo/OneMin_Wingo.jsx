/* global BigInt */

import React, { useEffect, useState, useCallback, useRef } from "react";
import "./OneMinWingo.css";
import { useNavigate } from "react-router-dom";
import { getISTTime, fetchOptimizedData } from "../../predictionLogic";

const OneMinWingo = () => {
    const [latestPeriod, setLatestPeriod] = useState("");
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(59);
    const [isResultClicked, setIsResultClicked] = useState(false);
    const [glowAnimationActive, setGlowAnimationActive] = useState(false);
    const [showCard, setShowCard] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [predictedResult, setPredictedResult] = useState(null);
    const [predictedNumbers, setPredictedNumbers] = useState([]);
    const [showCopyButton, setShowCopyButton] = useState(false);
    const [consecutiveLosses, setConsecutiveLosses] = useState(0);
    const [isReloading, setIsReloading] = useState(false); // State for manual reload button

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

    const getPrediction = useCallback(() => {
        return consecutiveLosses > 0
            ? { color: "Green", size: "BIG" }
            : { color: "Red", size: "SMALL" };
    }, [consecutiveLosses]);

    const getNumbersToDisplay = (prediction) => {
        const uniqueNumbers = new Set();
        let num;
        while (uniqueNumbers.size < 2) {
            if (prediction === "BIG") {
                num = Math.floor(Math.random() * 5) + 5;
            } else if (prediction === "SMALL") {
                num = Math.floor(Math.random() * 5);
            } else if (prediction === "Red") {
                const evenNumbers = [0, 2, 4, 6, 8];
                num =
                    evenNumbers[Math.floor(Math.random() * evenNumbers.length)];
            } else if (prediction === "Green") {
                const oddNumbers = [1, 3, 5, 7, 9];
                num = oddNumbers[Math.floor(Math.random() * oddNumbers.length)];
            }
            if (!uniqueNumbers.has(num)) {
                uniqueNumbers.add(num);
            }
        }
        return Array.from(uniqueNumbers);
    };

    // This function is now only for fetching data
    const updateHistory = useCallback(
        async (isRetry = false) => {
            try {
                const list = await fetchOptimizedData();
                if (Array.isArray(list) && list.length > 0) {
                    const currentPeriod = list[0]?.issueNumber;
                    if (currentPeriod && currentPeriod !== latestPeriod) {
                        if (predictedResult && history.length > 0) {
                            const lastActualNumber = parseInt(
                                history[0].number
                            );
                            const lastActualColor =
                                getColorFromNumber(lastActualNumber);
                            const lastActualSize =
                                getSizeFromNumber(lastActualNumber);
                            const isLoss =
                                predictedResult !== lastActualColor &&
                                predictedResult !== lastActualSize;
                            setConsecutiveLosses((prev) =>
                                isLoss ? prev + 1 : 0
                            );
                        }
                        setLatestPeriod(currentPeriod);
                        setHistory(list);
                        setError(null);
                    } else if (!isRetry) {
                        setTimeout(() => updateHistory(true), 1000);
                    }
                } else {
                    throw new Error("Unexpected data format or empty list");
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Failed to load data. Please click Reload.");
            }
        },
        [latestPeriod, history, predictedResult]
    );

    const handleAIButtonClick = () => {
        if (!isResultClicked && secondsLeft >= 5) {
            setGlowAnimationActive(true);
            setIsResultClicked(true);
            setShowCard(false);
            setIsFadingOut(false);
            setShowCopyButton(false);

            const predictions = getPrediction();
            const predictionArray = [predictions.color, predictions.size];
            const randomIndex = Math.floor(
                Math.random() * predictionArray.length
            );
            const selectedPrediction = predictionArray[randomIndex];
            const numbers = getNumbersToDisplay(selectedPrediction);

            setPredictedResult(selectedPrediction);
            setPredictedNumbers(numbers);

            const holdDuration = secondsLeft > 4 ? secondsLeft - 4 : 0;
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
            const predictionText = predictedResult;

            const textToCopy = `╭⭑───────────────⭑╮
📅 DATE : ${formattedDateTime}
╰⭑───────────────⭑╯
╭⚬──────────────────⚬╮
│ 🎯 WINGO      : 1 MinWinGo
│ ⏳ PERIOD     : ${nextPeriod}
│ 🔮 PREDICTION : ${predictionText}
│ 🎲 NUMBERS    : ${predictedNumbers.join(", ")}
╰⚬──────────────────⚬╯
`;

            try {
                await navigator.clipboard.writeText(textToCopy);
                alert("Prediction copied to clipboard!");
                setGlowAnimationActive(false);
                setIsResultClicked(false);
                setPredictedResult(null);
                setPredictedNumbers([]);
                setShowCard(false);
                setShowCopyButton(false);
            } catch (err) {
                console.error("Failed to copy: ", err);
                alert("Failed to copy prediction. Please try again.");
            }
        }
    };
    const handlestopbutton = () => {
        setIsResultClicked(false);
        setPredictedResult(null);
        setPredictedNumbers([]);
        setShowCard(false);
        setShowCopyButton(false);
        setGlowAnimationActive(false);
    };
    // New handler for the reload button
    const handleReload = async () => {
        setIsReloading(true);
        setHistory([]); // Clear history to show loading state
        setError(null); // Clear any previous errors
        try {
            const list = await fetchOptimizedData();
            if (Array.isArray(list) && list.length > 0) {
                setLatestPeriod(list[0]?.issueNumber);
                setHistory(list);
                setError(null);
            } else {
                throw new Error("Unexpected data format or empty list");
            }
        } catch (err) {
            console.error("Manual reload error:", err);
            setError("Failed to load data. Please check your connection.");
        } finally {
            setIsReloading(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = getISTTime();
            const seconds = now.getSeconds();
            const remainingSeconds = (59 - seconds + 60) % 60;
            setSecondsLeft(remainingSeconds);

            if (remainingSeconds === 59) {
                updateHistory();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [updateHistory]);

    useEffect(() => {
        if (secondsLeft === 0) {
            setIsResultClicked(false);
            setPredictedResult(null);
            setPredictedNumbers([]);
            setShowCard(false);
            setShowCopyButton(false);
        }
    }, [secondsLeft]);

    useEffect(() => {
        updateHistory();
    }, [updateHistory]);

    useEffect(() => {
        if (secondsLeft <= 2 && showCard) {
            setIsFadingOut(true);
            setTimeout(() => {
                setShowCard(false);
                setIsFadingOut(false);
                setShowCopyButton(false);
                setGlowAnimationActive(false);
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
                <h2>1 Minute WinGo Prediction</h2>
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
                    <button
                        onClick={handleReload}
                        className="predict-btn reload-btn"
                        disabled={isReloading}
                    >
                        {isReloading ? "Reloading..." : "Reload Data"}
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
                        <div className="wingo-numbers">
                            {predictedNumbers.join(", ")}
                        </div>
                        <div className="wingo-line wingo-topl"></div>
                        <div className="wingo-line wingo-leftl"></div>
                        <div className="wingo-line wingo-bottoml"></div>
                        <div className="wingo-line wingo-rightl"></div>
                    </div>
                </div>
            )}

            {showCopyButton && (
                <div>
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
                        onClick={handlestopbutton}
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
                                {isReloading ? "Reloading..." : "Loading..."}
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

export default OneMinWingo;
