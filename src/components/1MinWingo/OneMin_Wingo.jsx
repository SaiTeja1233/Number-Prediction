/* global BigInt */

import React, { useEffect, useState, useCallback } from "react";
import "./OneMinWingo.css";
import { useNavigate } from "react-router-dom";
import { getISTTime, fetchOptimizedData } from "../../predictionLogic";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OneMinWingo = () => {
    const [latestPeriod, setLatestPeriod] = useState("");
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(59);

    const [aiPredictionDisplay, setAiPredictionDisplay] = useState(null);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    const [predictionMode, setPredictionMode] = useState("COLOR");
    const [lastPrediction, setLastPrediction] = useState(null);

    const navigate = useNavigate();

    const backToDashboard = () => {
        navigate(-1);
    };

    const getSizeFromNumber = useCallback((number) => {
        return number >= 5 ? "BIG" : "SMALL";
    }, []);

    const getColorFromNumber = useCallback((number) => {
        if (number === 0) return "RED";
        if (number === 5) return "GREEN";
        return number % 2 === 0 ? "RED" : "GREEN";
    }, []);

    const calculateAndPredict = useCallback((data, mode) => {
        if (!Array.isArray(data) || data.length === 0) {
            console.log("No numbers to calculate for AI prediction.");
            setAiPredictionDisplay(null);
            return;
        }

        const nextPeriodBigInt = BigInt(data[0].issueNumber) + 1n;
        const nextPeriod = String(nextPeriodBigInt);
        const relevantHistory = data.slice(0, 50);

        let mainPrediction = "";
        let predictedNumbers = [];
        let predictionType = mode;

        if (mode === "COLOR") {
            const colorScores = { RED: 0, GREEN: 0 };
            const evenNumbers = [0, 2, 4, 6, 8];
            const oddNumbers = [1, 3, 5, 7, 9];

            relevantHistory.forEach((item, index) => {
                const number = parseInt(item.number);
                const weight = 50 - index;
                if (evenNumbers.includes(number)) colorScores.RED += weight;
                if (oddNumbers.includes(number)) colorScores.GREEN += weight;
            });

            let alternatingPatternCount = 0;
            for (let i = 0; i < relevantHistory.length - 1; i++) {
                const currentIsEven = evenNumbers.includes(
                    parseInt(relevantHistory[i].number)
                );
                const nextIsEven = evenNumbers.includes(
                    parseInt(relevantHistory[i + 1].number)
                );
                if (currentIsEven !== nextIsEven) alternatingPatternCount++;
                else break;
            }

            if (alternatingPatternCount >= 3) {
                const latestNumber = parseInt(data[0].number);
                mainPrediction = evenNumbers.includes(latestNumber)
                    ? "GREEN"
                    : "RED";
            } else {
                const sortedColors = Object.keys(colorScores).sort(
                    (a, b) => colorScores[b] - colorScores[a]
                );
                mainPrediction = sortedColors[0];
            }

            const targetNumbers =
                mainPrediction === "GREEN" ? oddNumbers : evenNumbers;
            const numberFrequencyMap = relevantHistory.reduce((acc, item) => {
                const num = parseInt(item.number);
                if (targetNumbers.includes(num)) {
                    acc[num] = (acc[num] || 0) + 1;
                }
                return acc;
            }, {});
            const sortedNumbers = Object.keys(numberFrequencyMap)
                .sort((a, b) => numberFrequencyMap[b] - numberFrequencyMap[a])
                .map(Number);
            predictedNumbers = sortedNumbers.slice(0, 2);
            if (predictedNumbers.length < 2) {
                const existingNumbers = new Set(predictedNumbers);
                const numbersToAdd = targetNumbers
                    .filter((num) => !existingNumbers.has(num))
                    .sort((a, b) => b - a);
                predictedNumbers = [...predictedNumbers, ...numbersToAdd].slice(
                    0,
                    2
                );
            }
        } else if (mode === "SIZE") {
            const allNumbers = relevantHistory.map((item) =>
                parseInt(item.number)
            );
            const sumOfNumbers = allNumbers.reduce((sum, num) => sum + num, 0);
            const lastDigitOfSum = sumOfNumbers % 10;
            mainPrediction = lastDigitOfSum >= 5 ? "BIG" : "SMALL";

            const targetNumbers =
                mainPrediction === "BIG" ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
            const numberFrequencyMap = relevantHistory.reduce((acc, item) => {
                const num = parseInt(item.number);
                if (targetNumbers.includes(num)) {
                    acc[num] = (acc[num] || 0) + 1;
                }
                return acc;
            }, {});
            const sortedNumbers = Object.keys(numberFrequencyMap)
                .sort((a, b) => numberFrequencyMap[b] - numberFrequencyMap[a])
                .map(Number);
            predictedNumbers = sortedNumbers.slice(0, 2);
            if (predictedNumbers.length < 2) {
                const existingNumbers = new Set(predictedNumbers);
                const numbersToAdd = targetNumbers
                    .filter((num) => !existingNumbers.has(num))
                    .sort((a, b) => b - a);
                predictedNumbers = [...predictedNumbers, ...numbersToAdd].slice(
                    0,
                    2
                );
            }
        }

        setAiPredictionDisplay({
            period: nextPeriod,
            mainPrediction: mainPrediction,
            associatedNumbers: predictedNumbers,
            type: predictionType,
            outcome: null,
            actual: null,
        });

        setLastPrediction({
            period: nextPeriod,
            mainPrediction: mainPrediction,
            type: predictionType,
        });
    }, []);

    const handleAiPredict = () => {
        calculateAndPredict(history, predictionMode);
        setIsFadingOut(false);
    };

    const handleCopyPrediction = async () => {
        if (aiPredictionDisplay) {
            const nextPeriod = aiPredictionDisplay.period;
            const predictionText = aiPredictionDisplay.mainPrediction;
            const predictedNumbersText =
                aiPredictionDisplay.associatedNumbers.join(", ");

            const textToCopy = `
╭⚬──────────────────⚬╮
│ 🎯 WINGO      : 1 Min WinGo
│ ⏳ PERIOD      : ${nextPeriod}
│ 🔮 PREDICTION : ${predictionText} (${aiPredictionDisplay.type})
│ 🔢 NUMBERS     : ${predictedNumbersText}
╰⚬──────────────────⚬╯
`;
            try {
                await navigator.clipboard.writeText(textToCopy);
                toast.success("Prediction copied to clipboard! 📋", {
                    position: "top-center",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
            } catch (err) {
                console.error("Failed to copy text: ", err);
                toast.error("Failed to copy. Please try again.", {
                    position: "top-center",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                });
            }
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

                        if (lastPrediction) {
                            const lastActualNumber = parseInt(
                                list.find(
                                    (item) =>
                                        item.issueNumber ===
                                        lastPrediction.period
                                )?.number
                            );
                            if (
                                lastActualNumber !== undefined &&
                                !isNaN(lastActualNumber)
                            ) {
                                let isCorrect = false;
                                let message = "";

                                // Styling for smaller text in toasts
                                const toastStyle = {
                                    fontSize: "14px", // Adjust this value as needed
                                };

                                if (lastPrediction.type === "COLOR") {
                                    const actualColor =
                                        getColorFromNumber(lastActualNumber);
                                    isCorrect =
                                        lastPrediction.mainPrediction ===
                                        actualColor;
                                    message = isCorrect
                                        ? ` WIN: Prediction "${lastPrediction.mainPrediction}" was correct!`
                                        : `LOSS:Switching to SIZE prediction mode.`;

                                    if (isCorrect) {
                                        toast.success(message, {
                                            style: toastStyle,
                                            autoClose: 3000,
                                        });
                                    } else {
                                        toast.error(message, {
                                            style: toastStyle,
                                            autoClose: 3000,
                                        });
                                    }
                                } else if (lastPrediction.type === "SIZE") {
                                    const actualSize =
                                        getSizeFromNumber(lastActualNumber);
                                    isCorrect =
                                        lastPrediction.mainPrediction ===
                                        actualSize;
                                    message = isCorrect
                                        ? ` WIN: Prediction "${lastPrediction.mainPrediction}" was correct!`
                                        : `LOSS:Switching to COLOR prediction mode.`;

                                    if (isCorrect) {
                                        toast.success(message, {
                                            style: toastStyle,
                                            autoClose: 3000,
                                        });
                                    } else {
                                        toast.error(message, {
                                            style: toastStyle,
                                            autoClose: 3000,
                                        });
                                    }
                                }

                                if (!isCorrect) {
                                    setPredictionMode(
                                        lastPrediction.type === "COLOR"
                                            ? "SIZE"
                                            : "COLOR"
                                    );
                                }
                            }
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
        [latestPeriod, lastPrediction, getColorFromNumber, getSizeFromNumber]
    );

    const handleRefresh = () => {
        setIsShaking(true);
        fetchHistory();
        setAiPredictionDisplay(null);
        setPredictionMode("COLOR");
        setLastPrediction(null);
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
        aiPredictionDisplay?.type === "COLOR"
            ? aiPredictionDisplay.mainPrediction?.toLowerCase()
            : aiPredictionDisplay?.type === "SIZE"
            ? aiPredictionDisplay.mainPrediction?.toLowerCase() === "small"
                ? "bg-small"
                : "bg-big"
            : ""
    } ${isFadingOut ? "is-fading-out" : ""}`.trim();

    return (
        <div className="one-min-wrapper">
            <ToastContainer />
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

            {aiPredictionDisplay && (
                <div className={cardClassName}>
                    <div className="ai-prediction-card-header">
                        <div className="ai-prediction-card-indicator"></div>
                        <p className="wingo-period">
                            Period: {aiPredictionDisplay.period}
                        </p>
                    </div>
                    <h3 className="wingo-prediction-text">
                        {aiPredictionDisplay.mainPrediction}
                    </h3>
                    <p className="wingo-prediction-numbers">
                        {aiPredictionDisplay.associatedNumbers.join(", ")}
                    </p>
                </div>
            )}
            {error && (
                <p style={{ color: "red", textAlign: "center" }}>{error}</p>
            )}
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
