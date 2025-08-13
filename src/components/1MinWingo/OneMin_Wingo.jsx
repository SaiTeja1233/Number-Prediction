/* global BigInt */

import React, { useEffect, useState, useCallback } from "react";
import "./OneMinWingo.css";
import { useNavigate } from "react-router-dom";

// Import the prediction logic functions
import {
    getISTTime,
    getColorFromNumber,
    getSizeFromNumber,
    guaranteedWinServerMethod,
    fetchOptimizedData,
    simplePrediction,
} from "../../predictionLogic";

const OneMinWingo = () => {
    const [latestPeriod, setLatestPeriod] = useState("");
    const [history, setHistory] = useState([]);
    const [error, setError] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(56);
    const [copyMessage, setCopyMessage] = useState(null);
    const [betType, setBetType] = useState("bigsmall");

    const [guaranteedPrediction, setGuaranteedPrediction] = useState(null);
    const [simplePredictionResult, setSimplePredictionResult] = useState(null);
    const [activePredictionType, setActivePredictionType] = useState(null);
    const [isReversed, setIsReversed] = useState(false);

    const navigate = useNavigate();

    const backToDashboard = () => {
        navigate("/dashboard");
    };

    const fetchHistory = useCallback(
        async (isRetry = false) => {
            try {
                const list = await fetchOptimizedData();
                if (Array.isArray(list) && list.length > 0) {
                    const currentPeriod = list[0]?.issueNumber;
                    if (currentPeriod && currentPeriod !== latestPeriod) {
                        setLatestPeriod(currentPeriod);

                        if (history.length > 0) {
                            const lastResultNumber = parseInt(list[0].number);
                            const actualSize =
                                getSizeFromNumber(lastResultNumber);
                            const actualColor =
                                getColorFromNumber(lastResultNumber);

                            let lastPredictionLost = false;

                            if (activePredictionType === "guaranteed") {
                                const predictedResult =
                                    betType === "bigsmall"
                                        ? guaranteedPrediction?.result
                                        : guaranteedPrediction?.result === "RED"
                                        ? "🔴"
                                        : "🟢";

                                if (
                                    betType === "bigsmall" &&
                                    predictedResult &&
                                    predictedResult.toLowerCase() !==
                                        actualSize.toLowerCase()
                                ) {
                                    lastPredictionLost = true;
                                } else if (
                                    betType === "color" &&
                                    predictedResult &&
                                    predictedResult !== actualColor
                                ) {
                                    lastPredictionLost = true;
                                }
                            } else if (activePredictionType === "simple_size") {
                                const numbers = history.map((item) =>
                                    parseInt(item.number)
                                );
                                const simplePredictedResult = simplePrediction(
                                    numbers,
                                    "size"
                                );
                                if (
                                    simplePredictedResult &&
                                    simplePredictedResult.size.toLowerCase() !==
                                        actualSize.toLowerCase()
                                ) {
                                    lastPredictionLost = true;
                                }
                            } else if (
                                activePredictionType === "simple_color"
                            ) {
                                const numbers = history.map((item) =>
                                    parseInt(item.number)
                                );
                                const simplePredictedResult = simplePrediction(
                                    numbers,
                                    "color"
                                );
                                if (
                                    simplePredictedResult &&
                                    simplePredictedResult.color !== actualColor
                                ) {
                                    lastPredictionLost = true;
                                }
                            }

                            if (lastPredictionLost) {
                                setBetType(
                                    betType === "bigsmall"
                                        ? "color"
                                        : "bigsmall"
                                );
                            }
                        }

                        setHistory(list);
                        setError(null);
                    } else if (!isRetry) {
                        setTimeout(() => fetchHistory(true), 2000);
                    }
                } else {
                    throw new Error("Unexpected data format or empty list");
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setError("Failed to load data");
            }
        },
        [
            latestPeriod,
            history,
            betType,
            guaranteedPrediction,
            activePredictionType,
        ]
    );

    const handleGuaranteedPredict = useCallback(async () => {
        if (history.length === 0) {
            setGuaranteedPrediction({
                result: "Not enough history to predict.",
            });
            setSimplePredictionResult(null);
            setActivePredictionType("guaranteed");
            return;
        }

        const nextPeriod = latestPeriod
            ? String(BigInt(latestPeriod) + 1n)
            : null;
        const prediction = await guaranteedWinServerMethod(
            betType,
            nextPeriod,
            history
        );
        setGuaranteedPrediction(prediction);
        setSimplePredictionResult(null);
        setActivePredictionType("guaranteed");
    }, [history, betType, latestPeriod]);

    const handleSimpleColorPredict = useCallback(() => {
        if (history.length > 1) {
            const numbers = history.map((item) => parseInt(item.number));
            const prediction = simplePrediction(numbers, "color");
            setSimplePredictionResult(prediction);
        } else {
            setSimplePredictionResult({
                color: null,
                numbers: [],
                message: "Not enough history for this prediction.",
            });
        }
        setGuaranteedPrediction(null);
        setActivePredictionType("simple_color");
    }, [history]);

    const handleSimpleSizePredict = useCallback(() => {
        if (history.length > 1) {
            const numbers = history.map((item) => parseInt(item.number));
            const prediction = simplePrediction(numbers, "size");
            setSimplePredictionResult(prediction);
        } else {
            setSimplePredictionResult({
                size: null,
                numbers: [],
                message: "Not enough history for this prediction.",
            });
        }
        setGuaranteedPrediction(null);
        setActivePredictionType("simple_size");
    }, [history]);

    const handleUpdateClick = () => {
        setIsReversed((prev) => !prev);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = getISTTime();
            const seconds = now.getSeconds();
            const remainingSeconds = (59 - seconds + 56) % 60;
            setSecondsLeft(remainingSeconds);

            if (remainingSeconds === 1) {
                fetchHistory();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [fetchHistory]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const getNumbersToDisplay = (prediction) => {
        if (prediction === "Big" || prediction === "BIG") return [5, 9];
        if (prediction === "Small" || prediction === "SMALL") return [0, 4];
        if (prediction === "RED" || prediction === "🔴") return [2, 6];
        if (prediction === "GREEN" || prediction === "🟢") return [1, 7];
        return [];
    };

    const handleCopyClick = async () => {
        const getPredictionText = (originalResult) => {
            if (isReversed) {
                if (originalResult === "Big" || originalResult === "BIG")
                    return "Small";
                if (originalResult === "Small" || originalResult === "SMALL")
                    return "Big";
                if (originalResult === "RED" || originalResult === "🔴")
                    return "GREEN";
                if (originalResult === "GREEN" || originalResult === "🟢")
                    return "RED";
                if (originalResult === "Green") return "Red";
                if (originalResult === "Red") return "Green";
            }
            return originalResult;
        };

        let originalResult = null;
        let predictedNumbers = [];

        if (activePredictionType === "guaranteed" && guaranteedPrediction) {
            originalResult = guaranteedPrediction.result;
            predictedNumbers = getNumbersToDisplay(originalResult);
        } else if (
            activePredictionType === "simple_size" &&
            simplePredictionResult &&
            simplePredictionResult.size
        ) {
            originalResult = simplePredictionResult.size;
            predictedNumbers = simplePredictionResult.numbers;
        } else if (
            activePredictionType === "simple_color" &&
            simplePredictionResult &&
            simplePredictionResult.color
        ) {
            originalResult = simplePredictionResult.color;
            predictedNumbers = simplePredictionResult.numbers;
        }

        const predictionText = getPredictionText(originalResult);

        const currentDate = getISTTime();
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const year = currentDate.getFullYear();
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 || 12;
        const formattedDateTime = `${month}/${day}/${year}, ${formattedHours}:${minutes} ${ampm}`;
        const nextPeriod = latestPeriod
            ? String(BigInt(latestPeriod) + 1n)
            : "-----";

        const textToCopy = `
╭⭑───────────────⭑╮
 📅 DATE : ${formattedDateTime}
╰⭑───────────────⭑╯
╭⚬──────────────────⚬╮
│ 🎯 WINGO      : 1 MinWinGo
│ ⏳ PERIOD     : ${nextPeriod}
│ 🔮 PREDICTION : ${predictionText}
│ 🎲 NUMBER     : ${predictedNumbers.join(", ")}
╰⚬──────────────────⚬╯
`;

        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopyMessage("Copied!");
            setTimeout(() => {
                setCopyMessage(null);
            }, 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
            setCopyMessage("Failed to copy");
        }
    };

    const getPredictionBoxContent = () => {
        const getReversedPrediction = (original) => {
            if (original === "Big" || original === "BIG") return "Small";
            if (original === "Small" || original === "SMALL") return "Big";
            if (original === "RED" || original === "🔴") return "GREEN";
            if (original === "GREEN" || original === "🟢") return "RED";
            return original;
        };

        let result = null;
        let originalResult = null;
        let numbersToDisplay = [];

        if (activePredictionType === "guaranteed" && guaranteedPrediction) {
            originalResult = guaranteedPrediction.result;
            numbersToDisplay = getNumbersToDisplay(originalResult);
        } else if (
            activePredictionType === "simple_size" &&
            simplePredictionResult &&
            simplePredictionResult.size
        ) {
            originalResult = simplePredictionResult.size;
            numbersToDisplay = simplePredictionResult.numbers;
        } else if (
            activePredictionType === "simple_color" &&
            simplePredictionResult &&
            simplePredictionResult.color
        ) {
            originalResult = simplePredictionResult.color;
            numbersToDisplay = simplePredictionResult.numbers;
        }

        if (originalResult) {
            result = isReversed
                ? getReversedPrediction(originalResult)
                : originalResult;
            const displayColor =
                result.includes("Green") || result.includes("🟢")
                    ? "green"
                    : result.includes("Red") || result.includes("🔴")
                    ? "red"
                    : "";

            return (
                <div className="prediction-box-right">
                    <div className={`prediction ${displayColor}`}>{result}</div>
                    <div className="prediction-Num">
                        {numbersToDisplay.join(" , ")}
                    </div>
                </div>
            );
        }

        return (
            <div className="prediction-box-right">
                <div className="prediction">No Prediction</div>
                <div className="prediction-Num">
                    {/* No specific numbers initially */}
                </div>
            </div>
        );
    };

    return (
        <div className="one-min-wrapper">
            <div className="Wingo-header">
                <img
                    src="back (1).png"
                    alt="back"
                    onClick={backToDashboard}
                    style={{ width: "20px" }}
                />
                <h2>1 Minute WinGo Prediction</h2>
            </div>

            <div className="Topline"></div>

            <div className="prediction-box">
                <div className="prediction-box-left">
                    <p>Time remaining</p>
                    <div className="digital-timer-container">
                        <div className="timer-box">0</div>
                        <div className="timer-box">0</div>
                        <div className="colon">:</div>
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
                {getPredictionBoxContent()}
            </div>

            <div className="button-container">
                <button
                    className="button button-primary"
                    onClick={handleGuaranteedPredict}
                >
                    Guaranteed Win Prediction
                </button>
                <div className="simple-prediction-buttons">
                    <button
                        className="button button-secondary"
                        onClick={handleSimpleColorPredict}
                    >
                        Color Prediction
                    </button>
                    <button
                        className="button button-secondary"
                        onClick={handleSimpleSizePredict}
                    >
                        Size Prediction
                    </button>
                </div>
               

                <button
                    className="button button-tertiary"
                    onClick={handleCopyClick}
                >
                    Copy
                </button>
                <button
                    className="button button-update"
                    onClick={handleUpdateClick}
                >
                    Update
                </button>
            </div>

            {copyMessage && <p className="copy-message">{copyMessage}</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {history.length === 0 ? (
                <p>Loading...</p>
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

export default OneMinWingo;
