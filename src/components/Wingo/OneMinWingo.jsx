import React, { useState, useEffect, useCallback, useRef } from "react";
import { FaArrowLeft, FaWallet, FaUserCircle } from "react-icons/fa";
import "./WingoGame.css"; // Ensure you have styles for .win-theme and .loss-theme

import {
    startTimer,
    getSizeFromNumber,
    getHistoryColorClass,
    getLatestEntryPrediction, // This utility should return prediction for the *next* period
    getNormalizedResult,
} from "./wingoUtils";
import { useNavigate } from "react-router-dom";

function OneMinWingo() {
    const [activeTab, setActiveTab] = useState("1min");
    const [activeBottomTab, setActiveBottomTab] = useState("history"); // Default to history or myHistory
    const [historicalData, setHistoricalData] = useState([]);
    const [latestPeriod, setLatestPeriod] = useState("Loading...");

    const [isFetching, setIsFetching] = useState(false);
    const [timer, setTimer] = useState("00");

    // Store the prediction along with the period it was made for
    const [activePrediction, setActivePrediction] = useState(null);
    const [consecutiveLosses, setConsecutiveLosses] = useState(0);

    // New state for personal prediction history
    const [predictionHistory, setPredictionHistory] = useState([]);

    // Use refs for values that change but shouldn't trigger re-renders or be stale in async ops
    const latestPeriodRef = useRef(null); // The *last completed* period from API
    const isFetchingRef = useRef(isFetching);
    const activePredictionRef = useRef(activePrediction); // To get the latest activePrediction in fetchData
    const navigate = useNavigate();
    useEffect(() => {
        isFetchingRef.current = isFetching;
    }, [isFetching]);

    useEffect(() => {
        activePredictionRef.current = activePrediction;
    }, [activePrediction]);

    function handleBackClick() {
        navigate(-1);
    }
    // Navigate back to the previous page
    function incrementStringNumber(strNum) {
        let carry = 1;
        let result = "";

        for (let i = strNum.length - 1; i >= 0; i--) {
            let digit = parseInt(strNum[i], 10);
            if (isNaN(digit)) {
                result = strNum[i] + result;
                continue;
            }

            let sum = digit + carry;
            if (sum >= 10) {
                result = (sum % 10).toString() + result;
                carry = Math.floor(sum / 10);
            } else {
                result = sum.toString() + result;
                carry = 0;
            }
        }

        if (carry > 0) {
            result = carry.toString() + result;
        }

        return result;
    }

    const fetchData = useCallback(async () => {
        if (isFetchingRef.current) {
            return;
        }

        setIsFetching(true);
        try {
            const response = await fetch(
                `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${Date.now()}`
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const list = data?.data?.list || [];

            if (list.length > 0) {
                const apiLatestIssueNumber = list[0].issueNumber;
                const nextPeriodNum =
                    incrementStringNumber(apiLatestIssueNumber);
                setLatestPeriod(` ${nextPeriodNum}`);

                // Only update historicalData and process prediction if a new *completed* period arrived
                if (latestPeriodRef.current !== apiLatestIssueNumber) {
                    latestPeriodRef.current = apiLatestIssueNumber; // Update the ref to the latest completed period

                    const newCompletedEntry = list[0]; // This is the *just completed* period
                    const lastResultNumber = parseInt(newCompletedEntry.number);
                    const actualResult = getNormalizedResult(lastResultNumber);

                    // Check if we had an active prediction for THIS specific period
                    const currentActivePrediction = activePredictionRef.current; // Get the prediction made for the previous period
                    if (
                        currentActivePrediction &&
                        currentActivePrediction.period ===
                            newCompletedEntry.issueNumber
                    ) {
                        const predictedType = currentActivePrediction.type;
                        const predictedValue = currentActivePrediction.value;
                        const predictedNumber =
                            currentActivePrediction.predictedNumber;
                        const predictedStrategy =
                            currentActivePrediction.strategy;

                        let predictionWasCorrect = false;

                        if (predictedType === "Color") {
                            predictionWasCorrect =
                                predictedValue === actualResult.color;
                        } else if (predictedType === "Size") {
                            predictionWasCorrect =
                                predictedValue === actualResult.size;
                        } else if (
                            predictedType === "Number" &&
                            predictedNumber === actualResult.number
                        ) {
                            predictionWasCorrect = true;
                        }

                        const outcome = predictionWasCorrect ? "win" : "loss";

                        setPredictionHistory((prevHistory) => {
                            // Prevent adding the same prediction outcome if somehow triggered multiple times for the same period
                            if (
                                prevHistory.some(
                                    (entry) =>
                                        entry.period ===
                                        newCompletedEntry.issueNumber
                                )
                            ) {
                                return prevHistory; // Already recorded for this period
                            }

                            return [
                                {
                                    period: newCompletedEntry.issueNumber,
                                    predicted: {
                                        type: predictedType,
                                        value: predictedValue,
                                        number: predictedNumber,
                                        strategy: predictedStrategy,
                                    },
                                    actual: {
                                        number: lastResultNumber,
                                        color: actualResult.color,
                                        size: actualResult.size,
                                    },
                                    outcome: outcome,
                                },
                                ...prevHistory,
                            ].slice(0, 50); // Keep history to a reasonable size
                        });

                        if (predictionWasCorrect) {
                            setConsecutiveLosses(0);
                        } else {
                            setConsecutiveLosses((prev) => prev + 1);
                        }
                        // Clear the active prediction AFTER it has been processed
                        setActivePrediction(null);
                    }

                    // Update historicalData only with new entries (based on issueNumber)
                    setHistoricalData((prevHistoricalData) => {
                        const newEntriesForHistory = list.filter(
                            (item) =>
                                !prevHistoricalData.some(
                                    (h) => h.issueNumber === item.issueNumber
                                )
                        );
                        return [
                            ...newEntriesForHistory,
                            ...prevHistoricalData,
                        ].slice(0, 50);
                    });
                }
            } else {
                setHistoricalData([]);
            }
        } catch (err) {
            setHistoricalData([]);
            // Optionally, show a user-facing error message here
        } finally {
            setIsFetching(false);
        }
    }, []); // Dependencies remain correct as fetchData uses refs now

    useEffect(() => {
        fetchData();
        const clearTimer = startTimer(setTimer, fetchData);
        return () => {
            clearTimer();
        };
    }, [fetchData]);

    const handleGetPrediction = () => {
        // When "Get Prediction" is clicked, we need the prediction for the *next* period
        // The `latestPeriod` state already holds the *next* period number.
        // So, `getLatestEntryPrediction` should ideally take `historicalData`
        // and the `nextPeriod` to generate the prediction for that period.
        const predictionForNextPeriod = getLatestEntryPrediction(
            historicalData,
            latestPeriod.trim(), // Ensure no leading/trailing spaces
            false, // forceNumberPrediction is false by default
            {
                consecutiveLosses: consecutiveLosses,
                lastPredictionType: activePrediction
                    ? activePrediction.type
                    : null,
                lastPredictionWasLoss: activePrediction
                    ? activePrediction.outcome === "loss"
                    : false, // This isn't strictly correct here as activePrediction is for previous period,
                // but if activePrediction was set, it means it's the one we're evaluating the outcome of.
                // The logic in wingoUtils needs `previousPredictionInfo` which is derived from *the last result's outcome*.
                // A better way would be to pass the actual outcome of the *previous* prediction if available.
                // For now, `consecutiveLosses` should be enough for the loss-based logic.
            }
        );
        // Store the prediction along with the period it's for
        setActivePrediction({
            ...predictionForNextPeriod,
            period: latestPeriod.trim(), // Store the period number for which this prediction is made
        });
    };

    return (
        <div className="wingo-app-container">
            <header className="wingo-header">
                <FaArrowLeft
                    className="header-icon back-icon"
                    onClick={handleBackClick}
                />

                <div className="header-logo">Jalwa.Game</div>
                <div className="header-icons-right">
                    <FaWallet className="header-icon wallet-icon" />
                    <FaUserCircle className="header-icon profile-icon" />
                </div>
            </header>

            <nav className="game-tabs-nav">
                {["1min", "3min"].map((tab) => (
                    <button
                        key={tab}
                        className={`game-tab-button ${
                            activeTab === tab ? "active" : ""
                        }`}
                        onClick={() => setActiveTab(tab)}
                    >
                        Wingo {tab}
                    </button>
                ))}
            </nav>

            <main className="wingo-game-main">
                <div className="game-info-row">
                    <div className="next-period">
                        <span className="next-period-label">Next Period</span>
                        <div className="next-period-number">{latestPeriod}</div>
                    </div>

                    <div className="time-remaining-box full-width">
                        <span className="time-label">Time Remaining</span>
                        <div className="time-left-seconds">00:{timer}</div>
                    </div>
                </div>

                {/* Removed activePrediction info display block */}

                <div className="color-selection">
                    {["green", "violet", "red"].map((clr) => (
                        <button
                            key={clr}
                            className={`color-button ${clr}-button ${
                                activePrediction &&
                                activePrediction.type === "Color" &&
                                activePrediction.value === clr
                                    ? "prediction-border"
                                    : ""
                            }`}
                        >
                            {clr.charAt(0).toUpperCase() + clr.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="number-selection-grid">
                    {[...Array(10).keys()].map((num) => (
                        <button
                            key={num}
                            className={`number-select-circle ${getHistoryColorClass(
                                num
                            )}-bg ${
                                activePrediction &&
                                activePrediction.predictedNumber === num
                                    ? "prediction-border"
                                    : ""
                            }`}
                        >
                            {num}
                        </button>
                    ))}
                </div>

                <div className="big-small-buttons-row">
                    {["Big", "Small"].map((size) => (
                        <button
                            key={size}
                            className={`action-button ${size.toLowerCase()}-button ${
                                activePrediction &&
                                activePrediction.type === "Size" &&
                                activePrediction.value === size
                                    ? "prediction-border"
                                    : ""
                            }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
                <div className="getPrediction">
                    <button className="pushable" onClick={handleGetPrediction}>
                        <span className="shadow"></span>
                        <span className="edge"></span>
                        <span className="front"> Get Prediction </span>
                    </button>
                </div>
            </main>

            <nav className="bottom-tabs-nav">
                {/* Removed "chart" tab */}
                {["history", "myHistory"].map((tab) => (
                    <button
                        key={tab}
                        className={`bottom-tab-button ${
                            activeBottomTab === tab ? "active" : ""
                        }`}
                        onClick={() => setActiveBottomTab(tab)}
                    >
                        {tab === "myHistory"
                            ? "My history"
                            : "Game " +
                              tab.charAt(0).toUpperCase() +
                              tab.slice(1)}
                    </button>
                ))}
            </nav>

            {activeBottomTab === "history" && (
                <section className="game-history-section">
                    <div className="history-table-header">
                        <span>Period</span>
                        <span>Number</span>
                        <span>Big/Small</span>
                        <span>Color</span>
                    </div>
                    <div className="history-table-body">
                        {historicalData.map((entry) => {
                            const number = parseInt(entry.number);
                            const bigSmall = getSizeFromNumber(number);
                            const colorClass = getHistoryColorClass(number);

                            const colorsToRender = [];
                            if (colorClass === "red-violet") {
                                colorsToRender.push("red", "violet");
                            } else if (colorClass === "green-violet") {
                                colorsToRender.push("green", "violet");
                            } else {
                                colorsToRender.push(colorClass);
                            }

                            return (
                                <div
                                    key={entry.issueNumber}
                                    className="history-table-row"
                                >
                                    <span className="history-period">
                                        {entry.issueNumber}
                                    </span>
                                    <span
                                        className={`history-number ${colorClass}`}
                                    >
                                        {number}
                                    </span>
                                    <span className="history-big-small">
                                        {bigSmall}
                                    </span>
                                    <span className="history-color">
                                        {colorsToRender.map((c, i) => (
                                            <span
                                                key={i}
                                                className={`color-dot ${c}`}
                                                style={{ margin: "0 2px" }}
                                            ></span>
                                        ))}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {activeBottomTab === "myHistory" && (
                <section className="my-prediction-history-section">
                    <h2>My Prediction History</h2>
                    {predictionHistory.length === 0 ? (
                        <p className="no-history-message">
                            No predictions made yet in this session.
                        </p>
                    ) : (
                        <div className="prediction-history-list">
                            {predictionHistory.map((entry, index) => (
                                <div
                                    key={`${entry.period}-${index}`}
                                    className={`prediction-history-item ${
                                        entry.outcome === "win"
                                            ? "win-theme"
                                            : "loss-theme"
                                    }`}
                                >
                                    <div className="history-item-period">
                                        Period: {entry.period}
                                    </div>

                                    <div className="history-item-details">
                                        <div className="result-history">
                                            <p>
                                                <strong>Predicted:</strong>{" "}
                                                {entry.predicted.type ===
                                                    "Color" &&
                                                    entry.predicted.value
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        entry.predicted.value.slice(
                                                            1
                                                        )}
                                                {entry.predicted.type ===
                                                    "Size" &&
                                                    entry.predicted.value}
                                                {entry.predicted.number !==
                                                    null &&
                                                    ` Number ${entry.predicted.number}`}
                                            </p>

                                            <p>
                                                <strong>Actual:</strong>{" "}
                                                {entry.actual.number} (
                                                {entry.actual.color},{" "}
                                                {entry.actual.size})
                                            </p>
                                        </div>

                                        <div className="result">
                                            <p className="outcome-text">
                                                {entry.outcome.toUpperCase()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

export default OneMinWingo;
