/* global BigInt */

import React, { useEffect, useState, useCallback } from "react";
import "./OneMinWingo.css";
import { useNavigate } from "react-router-dom";
import { getISTTime, fetchOptimizedData } from "../../predictionLogic";

const OneMinWingo = () => {
    const [latestPeriod, setLatestPeriod] = useState("");
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(59);

    const [aiPredictionDisplay, setAiPredictionDisplay] = useState(null);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    const navigate = useNavigate();

    const backToDashboard = () => {
        navigate(-1);
    };

    const getSizeFromNumber = useCallback((number) => {
        return number >= 5 ? "BIG" : "SMALL";
    }, []);

    const getColorFromNumber = useCallback((number) => {
        return number % 2 === 0 ? "RED" : "GREEN";
    }, []);

    const calculateAndPredict = useCallback((data) => {
        if (!Array.isArray(data) || data.length === 0) {
            console.log("No numbers to calculate for AI prediction.");
            setAiPredictionDisplay(null);
            return;
        }

        const latestEntry = data[0];
        const nextPeriodBigInt = BigInt(latestEntry.issueNumber) + 1n;
        const nextPeriod = String(nextPeriodBigInt);

        // 1. Determine color prediction based on the sum of a reasonable history length
        const relevantHistory = data.slice(0, 20); // Analyze the last 20 entries for a more accurate trend
        const allNumbers = relevantHistory.map((item) => parseInt(item.number));
        const sumOfNumbers = allNumbers.reduce((sum, num) => sum + num, 0);
        const predictionValue = sumOfNumbers % 2 === 0 ? "RED" : "GREEN";

        // 2. Predict two numbers based on the predicted color and frequency analysis
        let predictedNumbers = [];
        const evenNumbers = [0, 2, 4, 6, 8];
        const oddNumbers = [1, 3, 5, 7, 9];

        const relevantNumbers = relevantHistory
            .map((item) => parseInt(item.number))
            .filter((num) => {
                if (predictionValue === "GREEN") {
                    return oddNumbers.includes(num);
                } else {
                    // RED
                    return evenNumbers.includes(num);
                }
            });

        // Count frequencies of the relevant numbers
        const frequencyMap = relevantNumbers.reduce((acc, num) => {
            acc[num] = (acc[num] || 0) + 1;
            return acc;
        }, {});

        // Sort numbers by frequency in descending order
        const sortedNumbers = Object.keys(frequencyMap).sort((a, b) => {
            return frequencyMap[b] - frequencyMap[a];
        });

        // Select the top two unique numbers
        const topTwoNumbers = sortedNumbers.slice(0, 2).map(Number);

        // Fill predictedNumbers ensuring no repeats
        predictedNumbers = [...new Set(topTwoNumbers)];

        // Fallback if not enough numbers are found
        if (predictedNumbers.length < 2) {
            const fallbackSet =
                predictionValue === "GREEN" ? oddNumbers : evenNumbers;
            const existingNumbers = new Set(predictedNumbers);
            const numbersToAdd = fallbackSet
                .filter((num) => !existingNumbers.has(num))
                .sort((a, b) => b - a); // Sort to add highest number first
            predictedNumbers = [...predictedNumbers, ...numbersToAdd].slice(
                0,
                2
            );
        }

        console.log(
            `Sum of all numbers: ${sumOfNumbers}, Prediction: ${predictionValue}, Predicted Numbers: ${predictedNumbers}`
        );

        setAiPredictionDisplay({
            period: nextPeriod,
            prediction: predictionValue,
            associatedNumbers: predictedNumbers,
            type: "COLOR",
            outcome: null,
            actual: null,
        });
    }, []);

    const handleAiPredict = () => {
        calculateAndPredict(history);
        setIsFadingOut(false);
    };

    const handleCopyPrediction = () => {
        if (aiPredictionDisplay) {
            const nextPeriod = aiPredictionDisplay.period;
            const predictionText = aiPredictionDisplay.prediction;
            const predictedNumbersText =
                aiPredictionDisplay.associatedNumbers.join(", ");

            const textToCopy = `
╭⚬──────────────────⚬╮
│ 🎯 WINGO      : 1 Min WinGo
│ ⏳ PERIOD     : ${nextPeriod}
│ 🔮 PREDICTION : ${predictionText}
│ 🔢 NUMBERS    : ${predictedNumbersText}
╰⚬──────────────────⚬╯
`;
            navigator.clipboard.writeText(textToCopy).catch((err) => {
                console.error("Failed to copy text: ", err);
            });
        }
    };

    const fetchHistory = useCallback(
        async (isRetry = false) => {
            try {
                const list = await fetchOptimizedData();
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

    const handleRefresh = () => {
        setIsShaking(true);
        fetchHistory();
        setAiPredictionDisplay(null);
        setIsFadingOut(false);
        setTimeout(() => {
            setIsShaking(false);
        }, 500);
    };

    useEffect(() => {
        if (secondsLeft === 2 && aiPredictionDisplay) {
            setIsFadingOut(true);
        }
    }, [secondsLeft, aiPredictionDisplay]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = getISTTime();
            const seconds = now.getSeconds();
            const remainingSeconds = (59 - seconds + 60) % 60;
            setSecondsLeft(remainingSeconds);

            if (remainingSeconds === 0) {
                setAiPredictionDisplay(null);
                setIsFadingOut(false);
            }

            if (remainingSeconds === 59) {
                fetchHistory();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [fetchHistory]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const cardClassName = `wingo-result-card ${
        aiPredictionDisplay?.prediction?.toLowerCase() || ""
    } ${isFadingOut ? "is-fading-out" : ""}`.trim();

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
            <div className="timer-container">
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
                        onClick={handleAiPredict}
                        className="ai-predict-btn"
                    >
                        AI PREDICT.X
                    </button>
                </div>
                <div className="secondary-buttons">
                    <button
                        onClick={handleRefresh}
                        className={`refresh-btn ${isShaking ? "shake" : ""}`}
                    >
                        REFRESH
                    </button>
                    {aiPredictionDisplay && (
                        <button
                            onClick={handleCopyPrediction}
                            className="copy-btn"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                fill="currentColor"
                                className="bi bi-copy"
                                viewBox="0 0 16 16"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z"
                                />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
            {aiPredictionDisplay && (
                <div className={cardClassName}>
                    <div className="ai-prediction-card-header">
                        <div className="ai-prediction-card-indicator"></div>
                        <p className="wingo-period">
                            Period: {aiPredictionDisplay.period}
                        </p>
                    </div>
                    <h3 className="wingo-prediction-text">
                        {aiPredictionDisplay.prediction}
                    </h3>
                    <p className="wingo-prediction-numbers">
                        {aiPredictionDisplay.associatedNumbers.join(", ")}
                    </p>
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
                                          "GREEN" ? (
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
