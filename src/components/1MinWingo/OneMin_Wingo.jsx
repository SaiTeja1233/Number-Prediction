/* global BigInt */

import React, { useEffect, useState, useCallback, useRef } from "react";
import "./OneMinWingo.css";
import { useNavigate } from "react-router-dom";
import { getISTTime, fetchOptimizedData } from "../../predictionLogic";
import RefreshIcon from "./RefreshIcon";
import LoadingSpinner from "./LoadingSpinner";

// A custom chart component to render the SVG based on history data
const WinGoChart = ({ history, getColorFromNumber }) => {
    const chartRef = useRef(null);
    const [chartWidth, setChartWidth] = useState(0);

    useEffect(() => {
        const updateWidth = () => {
            if (chartRef.current) {
                setChartWidth(chartRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, []);

    const data = history;
    const padding = 1;
    const rowHeight = 40;
    const chartHeight = data.length * rowHeight + padding * 2;
    const numberPadding = 100;
    const numberWidth = (chartWidth - numberPadding - padding) / 10;
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    const getLineColor = (num) => {
        if (num === 0) return "#E94646";
        if (num === 5) return "#00A854";
        return getColorFromNumber(num) === "RED" ? "#E94646" : "#00A854";
    };

    return (
        <div ref={chartRef} style={{ width: "100%" }}>
            {chartWidth > 0 && (
                <svg width={chartWidth} height={chartHeight}>
                    {data.map((item, index) => {
                        const yPos = padding + index * rowHeight;
                        const resultNumber = parseInt(item.number);
                        const previousResult = data[index - 1]
                            ? parseInt(data[index - 1].number)
                            : null;

                        return (
                            <g key={item.issueNumber}>
                                <text
                                    x={padding}
                                    y={yPos + rowHeight / 2}
                                    textAnchor="start"
                                    alignmentBaseline="middle"
                                    fill="#243C65"
                                    fontSize="10"
                                    fontWeight="bold"
                                >
                                    {item.issueNumber}
                                </text>

                                {previousResult !== null && (
                                    <line
                                        x1={
                                            numberPadding +
                                            previousResult * numberWidth +
                                            numberWidth / 2
                                        }
                                        y1={yPos - rowHeight / 2}
                                        x2={
                                            numberPadding +
                                            resultNumber * numberWidth +
                                            numberWidth / 2
                                        }
                                        y2={yPos + rowHeight / 2}
                                        stroke="#2196F3"
                                        strokeWidth="0.8"
                                    />
                                )}

                                {numbers.map((num, i) => {
                                    const xPos =
                                        numberPadding +
                                        i * numberWidth +
                                        numberWidth / 2;
                                    const isResult = num === resultNumber;
                                    const circleFill = isResult
                                        ? getLineColor(num)
                                        : "transparent";
                                    const circleStroke = isResult
                                        ? getLineColor(num)
                                        : "#ccc";
                                    const textColor = isResult
                                        ? "#fff"
                                        : "#243C65";

                                    return (
                                        <g key={i}>
                                            <circle
                                                cx={xPos}
                                                cy={yPos + rowHeight / 2}
                                                r="8"
                                                fill={circleFill}
                                                stroke={circleStroke}
                                                strokeWidth="1"
                                                opacity={isResult ? 1 : 0.6}
                                            />
                                            <text
                                                x={xPos}
                                                y={yPos + rowHeight / 2 + 1}
                                                textAnchor="middle"
                                                alignmentBaseline="middle"
                                                fill={textColor}
                                                fontSize="10"
                                                fontWeight="bold"
                                            >
                                                {num}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        );
                    })}
                </svg>
            )}
        </div>
    );
};

// Custom popup component for win/loss message
const PredictionGlassPopup = ({
    period,
    prediction,
    actualResult,
    resultType,
    onClose,
}) => {
    // Auto-close the popup after a few seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000); // 3 seconds instead of 5

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="glass-popup-overlay">
            <div className="glass-popup">
                <h2>Game Result</h2>
                <p>
                    <strong>Period Number:</strong> {period}
                </p>
                <p>
                    <strong>Your Prediction:</strong> {prediction}
                </p>
                <p>
                    <strong>Actual Result:</strong> {actualResult}
                </p>
                <div className={`result-status ${resultType}`}>
                    {resultType.toUpperCase()}
                </div>
            </div>
        </div>
    );
};

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
    const [activeView, setActiveView] = useState("chart");
    const [predictionRecords, setPredictionRecords] = useState([]);
    const [popupData, setPopupData] = useState(null);
    const navigate = useNavigate();

    const lastEvaluatedPeriodRef = useRef(null);

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

    const calculateAndPredict = useCallback(
        (data, mode) => {
            if (!Array.isArray(data) || data.length === 0) {
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
                    if (getColorFromNumber(number) === "RED") {
                        colorScores.RED += weight;
                    } else {
                        colorScores.GREEN += weight;
                    }
                });
                mainPrediction =
                    colorScores.RED > colorScores.GREEN ? "RED" : "GREEN";

                const targetNumbers =
                    mainPrediction === "GREEN" ? oddNumbers : evenNumbers;
                const numberFrequencyMap = relevantHistory.reduce(
                    (acc, item) => {
                        const num = parseInt(item.number);
                        if (targetNumbers.includes(num)) {
                            acc[num] = (acc[num] || 0) + 1;
                        }
                        return acc;
                    },
                    {}
                );
                const sortedNumbers = Object.keys(numberFrequencyMap)
                    .sort(
                        (a, b) => numberFrequencyMap[b] - numberFrequencyMap[a]
                    )
                    .map(Number);
                predictedNumbers = sortedNumbers.slice(0, 2);
                if (predictedNumbers.length < 2) {
                    const existingNumbers = new Set(predictedNumbers);
                    const numbersToAdd = targetNumbers
                        .filter((num) => !existingNumbers.has(num))
                        .sort((a, b) => b - a);
                    predictedNumbers = [
                        ...predictedNumbers,
                        ...numbersToAdd,
                    ].slice(0, 2);
                }
            } else if (mode === "SIZE") {
                const allNumbers = relevantHistory.map((item) =>
                    parseInt(item.number)
                );
                const sumOfNumbers = allNumbers.reduce(
                    (sum, num) => sum + num,
                    0
                );
                const lastDigitOfSum = sumOfNumbers % 10;
                mainPrediction = lastDigitOfSum >= 5 ? "BIG" : "SMALL";

                const targetNumbers =
                    mainPrediction === "BIG"
                        ? [5, 6, 7, 8, 9]
                        : [0, 1, 2, 3, 4];
                const numberFrequencyMap = relevantHistory.reduce(
                    (acc, item) => {
                        const num = parseInt(item.number);
                        if (targetNumbers.includes(num)) {
                            acc[num] = (acc[num] || 0) + 1;
                        }
                        return acc;
                    },
                    {}
                );
                const sortedNumbers = Object.keys(numberFrequencyMap)
                    .sort(
                        (a, b) => numberFrequencyMap[b] - numberFrequencyMap[a]
                    )
                    .map(Number);
                predictedNumbers = sortedNumbers.slice(0, 2);
                if (predictedNumbers.length < 2) {
                    const existingNumbers = new Set(predictedNumbers);
                    const numbersToAdd = targetNumbers
                        .filter((num) => !existingNumbers.has(num))
                        .sort((a, b) => b - a);
                    predictedNumbers = [
                        ...predictedNumbers,
                        ...numbersToAdd,
                    ].slice(0, 2);
                }
            } else if (mode === "STREAK") {
                const lastResult = relevantHistory[0];
                const lastNumber = parseInt(lastResult.number);
                const lastColor = getColorFromNumber(lastNumber);
                const lastSize = getSizeFromNumber(lastNumber);

                let streakCount = 0;
                let lastValue = null;

                if (lastResult) {
                    // Determine the most recent streak
                    if (lastColor === "RED" || lastColor === "GREEN") {
                        lastValue = lastColor;
                        for (const item of relevantHistory) {
                            if (
                                getColorFromNumber(parseInt(item.number)) ===
                                lastValue
                            ) {
                                streakCount++;
                            } else {
                                break;
                            }
                        }
                        if (streakCount >= 2) {
                            // Consider a streak of at least 2
                            mainPrediction = lastColor;
                            predictedNumbers =
                                lastColor === "GREEN" ? [5, 7, 9] : [0, 2, 8];
                        }
                    }

                    if (
                        streakCount < 2 &&
                        (lastSize === "BIG" || lastSize === "SMALL")
                    ) {
                        lastValue = lastSize;
                        streakCount = 0;
                        for (const item of relevantHistory) {
                            if (
                                getSizeFromNumber(parseInt(item.number)) ===
                                lastValue
                            ) {
                                streakCount++;
                            } else {
                                break;
                            }
                        }
                        if (streakCount >= 2) {
                            mainPrediction = lastSize;
                            predictedNumbers =
                                lastSize === "BIG" ? [5, 7, 9] : [0, 2, 4];
                        }
                    }
                }

                // If no streak is found or it's too short, fallback to COLOR mode
                if (streakCount < 2) {
                    predictionType = "COLOR";
                    return calculateAndPredict(data, "COLOR");
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
        },
        [getColorFromNumber, getSizeFromNumber]
    );

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
│ 🎯 WINGO  : 1 Min WinGo
│ ⏳ PERIOD  : ${nextPeriod}
│ 🔮 PREDICTION : ${predictionText} (${aiPredictionDisplay.type})
│ 🔢 NUMBERS  : ${predictedNumbersText}
╰⚬──────────────────⚬╯
`;
            try {
                await navigator.clipboard.writeText(textToCopy);
                alert("Prediction copied to clipboard!");
            } catch (err) {
                console.error("Failed to copy text: ", err);
                alert("Failed to copy prediction.");
            }
        }
    };

    const handleResult = useCallback(
        (period, prediction, actualResult, resultType) => {
            setPopupData({
                period,
                prediction,
                actualResult,
                resultType,
            });

            setTimeout(() => {
                setPopupData(null);
            }, 3000);
        },
        []
    );

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

                        if (
                            lastPrediction &&
                            lastEvaluatedPeriodRef.current !==
                                lastPrediction.period
                        ) {
                            lastEvaluatedPeriodRef.current =
                                lastPrediction.period;

                            const lastActualEntry = list.find(
                                (item) =>
                                    item.issueNumber === lastPrediction.period
                            );
                            if (lastActualEntry) {
                                const lastActualNumber = parseInt(
                                    lastActualEntry.number
                                );

                                setPredictionRecords((prevRecords) => {
                                    let isCorrect = false;
                                    let actualResult = "";

                                    if (lastPrediction.type === "COLOR") {
                                        const actualColor =
                                            getColorFromNumber(
                                                lastActualNumber
                                            );
                                        isCorrect =
                                            lastPrediction.mainPrediction ===
                                            actualColor;
                                        actualResult = actualColor;
                                    } else if (lastPrediction.type === "SIZE") {
                                        const actualSize =
                                            getSizeFromNumber(lastActualNumber);
                                        isCorrect =
                                            lastPrediction.mainPrediction ===
                                            actualSize;
                                        actualResult = actualSize;
                                    } else if (
                                        lastPrediction.type === "STREAK"
                                    ) {
                                        const actualColor =
                                            getColorFromNumber(
                                                lastActualNumber
                                            );
                                        const actualSize =
                                            getSizeFromNumber(lastActualNumber);
                                        if (
                                            lastPrediction.mainPrediction ===
                                                actualColor ||
                                            lastPrediction.mainPrediction ===
                                                actualSize
                                        ) {
                                            isCorrect = true;
                                        }
                                        actualResult = `${actualColor}/${actualSize}`; // Display both for streak
                                    }

                                    // Cycle through the modes on a loss, stay on win
                                    setPredictionMode((prevMode) => {
                                        if (isCorrect) {
                                            return prevMode;
                                        } else {
                                            switch (prevMode) {
                                                case "COLOR":
                                                    return "SIZE";
                                                case "SIZE":
                                                    return "STREAK";
                                                case "STREAK":
                                                    return "COLOR";
                                                default:
                                                    return "COLOR";
                                            }
                                        }
                                    });

                                    const currentPrediction = {
                                        period: lastPrediction.period,
                                        prediction:
                                            lastPrediction.mainPrediction,
                                        type: lastPrediction.type,
                                        actualNumber: lastActualNumber,
                                        actualResult: actualResult,
                                        isWin: isCorrect,
                                    };

                                    handleResult(
                                        lastPrediction.period,
                                        lastPrediction.mainPrediction,
                                        actualResult,
                                        isCorrect ? "win" : "loss"
                                    );

                                    return [currentPrediction, ...prevRecords];
                                });
                            }
                        }
                    } else if (!isRetry) {
                        setTimeout(() => fetchHistory(true), 1000);
                    }
                } else {
                    throw new Error("Unexpected data format or empty list");
                }
            } catch (err) {
                setError("Failed to load data");
            }
        },
        [
            latestPeriod,
            lastPrediction,
            getColorFromNumber,
            getSizeFromNumber,
            handleResult,
        ]
    );

    const handleRefresh = () => {
        setIsShaking(true);
        fetchHistory();
        setAiPredictionDisplay(null);
        setPredictionMode("COLOR");
        setLastPrediction(null);
        setIsFadingOut(false);
        setPredictionRecords([]);
        setPopupData(null);
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

            if (remainingSeconds === 59) {
                fetchHistory();
                setAiPredictionDisplay(null);
                setIsFadingOut(false);
            }
        }, 1000);

        fetchHistory();

        return () => clearInterval(interval);
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
            {popupData && (
                <PredictionGlassPopup
                    period={popupData.period}
                    prediction={popupData.prediction}
                    actualResult={popupData.actualResult}
                    resultType={popupData.resultType}
                    onClose={() => setPopupData(null)}
                />
            )}
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

            {!aiPredictionDisplay && (
                <div className="svg-frame">
                    <LoadingSpinner />
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
                        type="button"
                        onClick={handleRefresh}
                        className={`refresh-btn ${isShaking ? "shake" : ""}`}
                    >
                        <RefreshIcon className="refresh-svg" />
                        Refresh
                    </button>

                    {aiPredictionDisplay && (
                        <button
                            onClick={handleCopyPrediction}
                            className="copy-btn"
                            onBlur={(e) => e.currentTarget.blur()}
                        >
                            <span>PREDICTION</span>
                            <span>COPIED!</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="view-tabs">
                <button
                    onClick={() => setActiveView("chart")}
                    className={activeView === "chart" ? "active-tab" : ""}
                >
                    Chart
                </button>
                <button
                    onClick={() => setActiveView("history")}
                    className={activeView === "history" ? "active-tab" : ""}
                >
                    History
                </button>

                <button
                    onClick={() => setActiveView("prediction-history")}
                    className={
                        activeView === "prediction-history" ? "active-tab" : ""
                    }
                >
                    Prediction History
                </button>
            </div>
            {activeView === "chart" && (
                <div className="chart-container">
                    <WinGoChart
                        history={history}
                        getColorFromNumber={getColorFromNumber}
                    />
                </div>
            )}

            {activeView === "history" && (
                <div className="oneMintable-container">
                    <table className="oneMinhistory-table">
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th>Number</th>
                                <th>Big/Small</th>
                                <th>Color</th>
                            </tr>
                        </thead>

                        <tbody>
                            {history.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="4"
                                        style={{ textAlign: "center" }}
                                    >
                                        Loading...
                                    </td>
                                </tr>
                            ) : (
                                history.map((item) => {
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
                                                ) : getColorFromNumber(
                                                      number
                                                  ) === "GREEN" ? (
                                                    <>🟢</>
                                                ) : (
                                                    <>🔴</>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            {activeView === "prediction-history" && (
                <div className="tableResult-container">
                    <table className="historyResult-table">
                        <thead>
                            <tr>
                                <th>Period</th>
                                <th>Prediction</th>
                                <th> Result</th>
                                <th>Outcome</th>
                            </tr>
                        </thead>
                        <tbody>
                            {predictionRecords.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="4"
                                        style={{
                                            textAlign: "center",
                                            fontStyle: "italic",
                                            padding: "20px",
                                        }}
                                    >
                                        No prediction history yet.
                                    </td>
                                </tr>
                            ) : (
                                predictionRecords.map((record, index) => (
                                    <tr key={index}>
                                        <td>{record.period}</td>
                                        <td>
                                            {record.prediction} ({record.type})
                                        </td>
                                        <td>
                                            {record.actualNumber} (
                                            {record.actualResult})
                                        </td>
                                        <td
                                            className={
                                                record.isWin
                                                    ? "outcome-win"
                                                    : "outcome-loss"
                                            }
                                        >
                                            {record.isWin ? "WIN" : "LOSS"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default OneMinWingo;
