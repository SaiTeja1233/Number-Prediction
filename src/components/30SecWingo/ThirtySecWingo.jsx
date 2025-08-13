/* global BigInt */

import React, { useEffect, useState, useCallback } from "react";
import "./ThirtySecWingo.css";
import { useNavigate } from "react-router-dom";

// Import the new fetch function and helper functions
import {
    getISTTime,
    getColorFromNumber,
    getSizeFromNumber,
    fetchThirtySecData,
} from "../../predictionLogic";

const ThirtySecWingo = () => {
    const [latestPeriod, setLatestPeriod] = useState("");
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(29);

    const [isPredicting, setIsPredicting] = useState(false);
    const [predictionResult, setPredictionResult] = useState(null);
    const [lastPredictedPeriod, setLastPredictedPeriod] = useState(null);
    const [copyMessage, setCopyMessage] = useState(null);

    const navigate = useNavigate();

    const backToDashboard = () => {
        navigate(-1);
    };

    const startPrediction = () => {
        setIsPredicting((prev) => !prev);
        if (isPredicting) {
            setPredictionResult(null);
        }
    };

    const predictNumbers = useCallback(() => {
        if (history.length < 5) return [];

        // Analysis: Check for sequences (e.g., 5, 5, 5 or 1, 2, 3)
        const latestNumbers = history
            .slice(0, 5)
            .map((item) => parseInt(item.number));
        let nextInSequence = null;
        if (latestNumbers.length === 5) {
            // Check for a repeating sequence
            if (
                latestNumbers[0] === latestNumbers[1] &&
                latestNumbers[1] === latestNumbers[2]
            ) {
                nextInSequence = latestNumbers[0];
            }
            // Check for a simple ascending sequence
            else if (
                latestNumbers[0] + 1 === latestNumbers[1] &&
                latestNumbers[1] + 1 === latestNumbers[2]
            ) {
                nextInSequence = latestNumbers[2] + 1;
            }
            // Check for a simple descending sequence
            else if (
                latestNumbers[0] - 1 === latestNumbers[1] &&
                latestNumbers[1] - 1 === latestNumbers[2]
            ) {
                nextInSequence = latestNumbers[2] - 1;
            }
        }

        // Final prediction logic
        if (
            nextInSequence !== null &&
            nextInSequence >= 0 &&
            nextInSequence <= 9
        ) {
            return [nextInSequence];
        }

        // Otherwise, fall back to predicting the least frequent number.
        const numberCounts = Array(10).fill(0);
        history.slice(0, 100).forEach((item) => {
            const num = parseInt(item.number);
            if (!isNaN(num)) {
                numberCounts[num]++;
            }
        });

        const minCount = Math.min(...numberCounts);
        const leastFrequentNumbers = numberCounts
            .map((count, index) => (count === minCount ? index : null))
            .filter((num) => num !== null);

        if (leastFrequentNumbers.length > 0) {
            const chosenNumber =
                leastFrequentNumbers[
                    Math.floor(Math.random() * leastFrequentNumbers.length)
                ];
            return [chosenNumber];
        }

        return [];
    }, [history]);

    const makePrediction = useCallback(
        (currentPeriod) => {
            if (currentPeriod !== lastPredictedPeriod) {
                const numberPrediction = predictNumbers();
                const prediction =
                    numberPrediction.length > 0
                        ? numberPrediction[0] >= 5
                            ? "BIG"
                            : "SMALL"
                        : Math.random() < 0.5
                        ? "BIG"
                        : "SMALL";

                setPredictionResult({ prediction, numbers: numberPrediction });
                setLastPredictedPeriod(currentPeriod);
            }
        },
        [lastPredictedPeriod, predictNumbers]
    );

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

                        if (isPredicting) {
                            const nextPeriod = String(
                                BigInt(currentPeriod) + 1n
                            );
                            makePrediction(nextPeriod);
                        }
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
        [latestPeriod, isPredicting, makePrediction]
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
        fetchHistory();
    }, [fetchHistory]);

    const handleCopyClick = async () => {
        if (!predictionResult) {
            setCopyMessage("No prediction to copy!");
            setTimeout(() => setCopyMessage(null), 2000);
            return;
        }

        const now = getISTTime();
        const formattedDateTime = now.toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
        });

        const nextPeriod =
            lastPredictedPeriod || String(BigInt(latestPeriod) + 1n);
        const predictionText = predictionResult.prediction;
        const predictedNumbers = predictionResult.numbers;

        const textToCopy = `
╭⭑───────────────⭑╮
 📅 DATE : ${formattedDateTime}
╰⭑───────────────⭑╯
╭⚬──────────────────⚬╮
│ 🎯 WINGO      : 30 Second WinGo
│ ⏳ PERIOD     : ${nextPeriod}
│ 🔮 PREDICTION : ${predictionText}
│ 🎲 NUMBER     : ${
            predictedNumbers.length > 0 ? predictedNumbers.join(", ") : "N/A"
        }
╰⚬──────────────────⚬╯
`;

        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopyMessage("Copied!");
        } catch (err) {
            console.error("Failed to copy text: ", err);
            setCopyMessage("Failed to copy!");
        }

        setTimeout(() => setCopyMessage(null), 2000);
    };

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

            <div className="prediction-box">
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
                <div className="horizontal-divider"></div>
                <div className="prediction-box-lower">
                    <div className="prediction-content">
                        {predictionResult ? (
                            <>
                                <p className="prediction-label">Prediction</p>
                                <div
                                    className={`prediction-result ${predictionResult.prediction.toLowerCase()}`}
                                >
                                    {predictionResult.prediction}
                                </div>
                                <p className="prediction-label-number">
                                    Number Prediction
                                </p>
                                <div className="prediction-result number-box">
                                    {" "}
                                    {/* Applied the class here */}
                                    {predictionResult.numbers.length > 0
                                        ? predictionResult.numbers.join(" , ")
                                        : "N/A"}
                                </div>
                            </>
                        ) : (
                            <div className="no-prediction">
                                {isPredicting
                                    ? "Waiting for new period..."
                                    : "No Prediction"}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="button-wrapper">
                <div className="prediction-control-box">
                    <button
                        onClick={startPrediction}
                        className={`predict-btn ${
                            isPredicting ? "stop" : "start"
                        }`}
                    >
                        {isPredicting ? "Stop Prediction" : "Start Prediction"}
                    </button>
                    <button
                        onClick={handleCopyClick}
                        className="predict-btn copy-btn"
                    >
                        Copy Prediction
                    </button>
                </div>
                {copyMessage && <p className="copy-message">{copyMessage}</p>}
            </div>

            {error && (
                <p style={{ color: "red", textAlign: "center" }}>{error}</p>
            )}

            {history.length === 0 ? (
                <p style={{ textAlign: "center" }}>Loading...</p>
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
