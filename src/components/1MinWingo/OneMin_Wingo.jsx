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
    const [predictedResult, setPredictedResult] = useState(null);
    const [predictedNumbers, setPredictedNumbers] = useState([]);

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

    // New deterministic prediction logic based on the period number
    const getDeterministicPrediction = useCallback((nextPeriod) => {
        if (!nextPeriod) {
            return { prediction: null, numbers: [] };
        }

        const periodNumber = BigInt(nextPeriod);

        // A simple, deterministic algorithm
        // We can use the last digit or perform a modulo operation on the full number
        // For example, if the last digit is even, predict BIG; if odd, predict SMALL
        const lastDigit = Number(periodNumber % 10n);

        // This is a simple, predictable pattern. You can make it more complex
        // For example, (periodNumber % 2n === 0n) ? "BIG" : "SMALL"
        let predictedValue;
        let numbersToDisplay;

        if (lastDigit % 2 === 0) {
            // Predict BIG for even last digits
            predictedValue = "BIG";
            numbersToDisplay = [7, 9];
        } else {
            // Predict SMALL for odd last digits
            predictedValue = "SMALL";
            numbersToDisplay = [2, 4];
        }

        return {
            prediction: predictedValue,
            numbers: numbersToDisplay,
        };
    }, []);

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
                        setPredictedResult(null);
                        setPredictedNumbers([]);
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

    const handleAIButtonClick = () => {
        if (secondsLeft >= 5 && latestPeriod) {
            const nextPeriod = BigInt(latestPeriod) + 1n;
            const { prediction, numbers } =
                getDeterministicPrediction(nextPeriod);

            if (prediction && numbers.length > 0) {
                setPredictedResult(prediction);
                setPredictedNumbers(numbers);
            }
        }
    };

    const handleCopyPrediction = () => {
        const textToCopy = `╭⚬──────────────────⚬╮
│ 🎯 WINGO      : 1 Min WinGo
│ ⏳ PERIOD     : ${String(BigInt(latestPeriod) + 1n)}
│ 🔮 PREDICTION : ${predictedResult}
│ 🎲 NUMBERS    : ${predictedNumbers.join(", ")}
╰⚬──────────────────⚬╯`;
        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
                alert("Prediction copied to clipboard!");
            })
            .catch((err) => {
                console.error("Failed to copy text: ", err);
            });
    };

    const handleRefresh = () => {
        fetchHistory();
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
                <div
                    className="prediction-control-box"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                    }}
                >
                    <button
                        onClick={handleAIButtonClick}
                        className="predict-btn"
                        disabled={secondsLeft < 5 || history.length === 0}
                    >
                        AI Predict.X
                    </button>
                    <button onClick={handleRefresh} className="refresh-btn">
                        REFRESH
                    </button>
                </div>
            </div>

            {predictedResult && (
                <>
                    <div className="prediction-section">
                        <div
                            className={`wingo-result-card ${predictedResult.toLowerCase()}`}
                        >
                            <div className="wingo-period">
                                {latestPeriod
                                    ? `Period: ${String(
                                          BigInt(latestPeriod) + 1n
                                      )}`
                                    : ""}
                            </div>
                            <div
                                className={`wingo-prediction-text ${predictedResult.toLowerCase()}`}
                            >
                                {predictedResult}
                            </div>
                            <div className="wingo-prediction-numbers">
                                {predictedNumbers.join(", ")}
                            </div>
                        </div>
                    </div>
                    <div className="prediction-actions">
                        <button
                            onClick={handleCopyPrediction}
                            className="copy-btn"
                        >
                            Copy Prediction
                        </button>
                    </div>
                </>
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
