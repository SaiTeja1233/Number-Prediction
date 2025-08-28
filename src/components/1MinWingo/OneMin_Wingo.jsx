/* global BigInt */

import React, { useEffect, useState, useCallback } from "react";
import "./OneMinWingo.css";
import { useNavigate } from "react-router-dom";
import { getISTTime, fetchOptimizedData } from "../../predictionLogic";
import StatusPopup from "./StatusPopup";

const OneMinWingo = () => {
    const [latestPeriod, setLatestPeriod] = useState("");
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(59);

    const [aiPredictionDisplay, setAiPredictionDisplay] = useState(null);
    const [lastTwoOutcomes, setLastTwoOutcomes] = useState([]);
    const [predictionType, setPredictionType] = useState("COLOR");
    const [popupMessage, setPopupMessage] = useState(null);

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

    const updateOutcomes = useCallback((outcome) => {
        setLastTwoOutcomes((prevOutcomes) => {
            const newOutcomes = [outcome, ...prevOutcomes.slice(0, 1)];
            return newOutcomes;
        });
    }, []);

    const calculateAndPredict = useCallback(
        (data) => {
            if (!Array.isArray(data) || data.length === 0) {
                console.log("No numbers to calculate for AI prediction.");
                setAiPredictionDisplay(null);
                return;
            }

            const nextPeriod = String(BigInt(latestPeriod) + 1n);

            let predictionValue, associatedNumbers;

            if (predictionType === "COLOR") {
                const lastNumbers = data
                    .slice(0, 5)
                    .map((item) => parseInt(item.number));
                const lastRed = lastNumbers.filter(
                    (n) => getColorFromNumber(n) === "RED"
                ).length;
                const lastGreen = lastNumbers.filter(
                    (n) => getColorFromNumber(n) === "GREEN"
                ).length;
                predictionValue = lastRed > lastGreen ? "GREEN" : "RED";
                associatedNumbers = [];
            } else {
                const lastNumbers = data
                    .slice(0, 5)
                    .map((item) => parseInt(item.number));
                const lastBig = lastNumbers.filter(
                    (n) => getSizeFromNumber(n) === "BIG"
                ).length;
                const lastSmall = lastNumbers.filter(
                    (n) => getSizeFromNumber(n) === "SMALL"
                ).length;
                predictionValue = lastBig > lastSmall ? "SMALL" : "BIG";
                associatedNumbers = [];
            }

            setAiPredictionDisplay({
                period: nextPeriod,
                prediction: predictionValue,
                associatedNumbers: associatedNumbers,
                type: predictionType,
                outcome: null,
                actual: null,
            });
        },
        [latestPeriod, predictionType, getColorFromNumber, getSizeFromNumber]
    );

    const checkPredictionStatus = useCallback(
        (newData) => {
            if (aiPredictionDisplay && newData.length > 0) {
                const lastResult = newData[0];
                const predictedPeriod = aiPredictionDisplay.period;

                if (lastResult.issueNumber === predictedPeriod) {
                    const actualNumber = parseInt(lastResult.number);
                    const actualValue =
                        aiPredictionDisplay.type === "COLOR"
                            ? getColorFromNumber(actualNumber)
                            : getSizeFromNumber(actualNumber);

                    const newOutcome =
                        aiPredictionDisplay.prediction === actualValue
                            ? "win"
                            : "loss";

                    setPopupMessage({
                        type: newOutcome,
                        text: `Period ${predictedPeriod} was a ${newOutcome.toUpperCase()}!`,
                    });

                    setTimeout(() => {
                        setPopupMessage(null);
                    }, 5000);

                    setAiPredictionDisplay((prev) => ({
                        ...prev,
                        outcome: newOutcome,
                        actual: actualValue,
                    }));

                    updateOutcomes(newOutcome);
                    const isTwoColorLosses =
                        lastTwoOutcomes.length === 2 &&
                        lastTwoOutcomes.every((o) => o === "loss");

                    if (newOutcome === "win") {
                        setLastTwoOutcomes([]);
                        console.log("Win detected. Resetting loss streak.");
                    } else if (isTwoColorLosses) {
                        setPredictionType("SIZE");
                        console.log(
                            "Two consecutive COLOR losses detected. Switching to SIZE."
                        );
                        setLastTwoOutcomes([]);
                    } else {
                        setPredictionType("COLOR");
                        console.log("Resetting to COLOR prediction.");
                    }
                }
            }
        },
        [
            aiPredictionDisplay,
            updateOutcomes,
            lastTwoOutcomes,
            getColorFromNumber,
            getSizeFromNumber,
        ]
    );

    const handleAiPredict = () => {
        calculateAndPredict(history);
    };

    const handleCopyPrediction = () => {
        if (aiPredictionDisplay) {
            const textToCopy = aiPredictionDisplay.prediction;
            navigator.clipboard
                .writeText(textToCopy)
                .then(() => {
                    alert("Prediction copied to clipboard!");
                })
                .catch((err) => {
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
                        checkPredictionStatus(list);
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
        [latestPeriod, checkPredictionStatus]
    );

    const handleRefresh = () => {
        fetchHistory();
        setAiPredictionDisplay(null);
        setLastTwoOutcomes([]);
        setPredictionType("COLOR");
        setPopupMessage(null);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = getISTTime();
            const seconds = now.getSeconds();
            const remainingSeconds = (59 - seconds + 60) % 60;
            setSecondsLeft(remainingSeconds);

            if (remainingSeconds <= 3) {
                setAiPredictionDisplay(null);
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

    const cardClassName =
        aiPredictionDisplay && aiPredictionDisplay.prediction
            ? `wingo-result-card ${aiPredictionDisplay.prediction.toLowerCase()}`
            : "wingo-result-card";

    return (
        <div className="one-min-wrapper">
            <StatusPopup
                message={popupMessage?.text}
                type={popupMessage?.type}
                onClose={() => setPopupMessage(null)}
            />

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
                    <button onClick={handleRefresh} className="refresh-btn">
                        REFRESH
                    </button>
                </div>
            </div>
            {aiPredictionDisplay && (
                <>
                    <div className={cardClassName}>
                        <div className="ai-prediction-card-header">
                            <div className="ai-prediction-card-indicator"></div>
                            <p>Period: {aiPredictionDisplay.period}</p>
                        </div>
                        <h3 className="ai-prediction-value">
                            {aiPredictionDisplay.prediction}
                        </h3>
                        {aiPredictionDisplay.outcome ? (
                            <>
                                <p
                                    className={`status-text ${aiPredictionDisplay.outcome}`}
                                >
                                    {aiPredictionDisplay.outcome.toUpperCase()}
                                </p>
                                <p className="prediction-detail">
                                    Predicted: {aiPredictionDisplay.prediction},
                                    Actual: {aiPredictionDisplay.actual}
                                </p>
                            </>
                        ) : (
                            <p className="ai-prediction-numbers">
                                {aiPredictionDisplay.associatedNumbers.join(
                                    ", "
                                )}
                            </p>
                        )}
                    </div>
                    <button onClick={handleCopyPrediction} className="copy-btn">
                        Copy Prediction
                    </button>
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
