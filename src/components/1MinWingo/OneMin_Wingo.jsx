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
    const [predictionMode, setPredictionMode] = useState("human");
    const [consecutiveLosses, setConsecutiveLosses] = useState(0);

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

    const getNumbersToDisplay = (prediction) => {
        const uniqueNumbers = new Set();
        while (uniqueNumbers.size < 2) {
            let num;
            if (prediction === "BIG") {
                num = Math.floor(Math.random() * 5) + 5; // 5-9
            } else if (prediction === "SMALL") {
                num = Math.floor(Math.random() * 5); // 0-4
            } else if (prediction === "Red") {
                const evenNumbers = [0, 2, 4, 6, 8];
                num =
                    evenNumbers[Math.floor(Math.random() * evenNumbers.length)];
            } else if (prediction === "Green") {
                const oddNumbers = [1, 3, 5, 7, 9];
                num = oddNumbers[Math.floor(Math.random() * oddNumbers.length)];
            }
            uniqueNumbers.add(num);
        }
        return Array.from(uniqueNumbers);
    };

    const fetchHistory = useCallback(
        async (isRetry = false) => {
            try {
                const list = await fetchOptimizedData();
                if (Array.isArray(list) && list.length > 0) {
                    const currentPeriod = list[0]?.issueNumber;
                    if (currentPeriod && currentPeriod !== latestPeriod) {
                        setLatestPeriod(currentPeriod);

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
        [latestPeriod, history, predictedResult]
    );

    const handleAIButtonClick = () => {
        if (!isResultClicked && secondsLeft >= 5) {
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
│ 🎯 WINGO      : 1 MinWinGo
│ ⏳ PERIOD     : ${nextPeriod}
│ 🔮 PREDICTION : ${predictionText}
│ 🎲 NUMBERS    : ${predictedNumbers.join(", ")}
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

    useEffect(() => {
        const interval = setInterval(() => {
            const now = getISTTime();
            const seconds = now.getSeconds();
            const remainingSeconds = (59 - seconds + 60) % 60;
            setSecondsLeft(remainingSeconds);

            if (remainingSeconds === 59) {
                fetchHistory();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [fetchHistory]);

    // Reset prediction states at the end of the countdown
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
