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
} from "../../predictionLogic";

// The simple prediction function with upgraded logic
// This function now incorporates the color chart patterns you provided
const simplePrediction = (numbers) => {
    // Convert numbers to colors based on your logic
    const colors = numbers.map(getColorFromNumber);

    // Get the last few colors to check for patterns
    const lastColor = colors[0];
    const secondLastColor = colors.length > 1 ? colors[1] : null;
    const thirdLastColor = colors.length > 2 ? colors[2] : null;

    // Reverse the colors to easily check for patterns (e.g., [🟢, 🔴, 🟢, 🔴] becomes [🔴, 🟢, 🔴, 🟢])
    const reversedColors = colors.slice(0, 7).reverse();
    const patternString = reversedColors.join("");

    // --- Start of Color Chart Pattern Logic ---

    // 1. ABAB / BABA - Alternating Pattern
    if (
        patternString.startsWith("🔴🟢🔴🟢") ||
        patternString.startsWith("🟢🔴🟢🔴")
    ) {
        return lastColor === "🟢" ? "🔴" : "🟢"; // Predict the opposite
    }

    // 2. AABB / BBAA - Double Block Pattern
    if (
        patternString.startsWith("🔴🔴🟢🟢") ||
        patternString.startsWith("🟢🟢🔴🔴")
    ) {
        return lastColor === "🟢" ? "🔴" : "🟢"; // Predict the next in the sequence
    }

    // 3. ABBB / BAAA - One-and-Block Pattern
    if (
        patternString.startsWith("🔴🟢🟢🟢") ||
        patternString.startsWith("🟢🔴🔴🔴")
    ) {
        return lastColor === "🟢" ? "🟢" : "🔴"; // Predict the repeating color
    }

    // 4. AAABBB / BBBAAA - Triple Block Pattern
    if (
        patternString.startsWith("🔴🔴🔴🟢🟢🟢") ||
        patternString.startsWith("🟢🟢🟢🔴🔴🔴")
    ) {
        return lastColor === "🟢" ? "🟢" : "🔴"; // Predict the next in the sequence
    }

    // 5. AAAAA / BBBBB - Dragon Trend
    if (patternString.startsWith("🔴🔴🔴🔴🔴")) {
        return "🔴";
    }
    if (patternString.startsWith("🟢🟢🟢🟢🟢")) {
        return "🟢";
    }

    // --- End of Color Chart Pattern Logic ---

    // Original Prediction Logic (as a fallback)
    // A. Size Prediction
    const lastNumber = numbers[0];
    const secondLastNumber = numbers.length > 1 ? numbers[1] : null;
    if (secondLastNumber !== null) {
        if (lastNumber > secondLastNumber) return "Small";
        if (lastNumber < secondLastNumber) return "Big";
        if (lastNumber === secondLastNumber) return "Small";
    }

    // B. Color Parity Prediction (Fallback if no other pattern is found)
    if (thirdLastColor !== null) {
        if (
            lastColor === secondLastColor &&
            secondLastColor === thirdLastColor
        ) {
            return lastColor === "🟢" ? "🔴" : "🟢";
        }
    }

    // C. Tertiary Fallback to size
    return lastNumber >= 5 ? "Small" : "Big";
};

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
    const [isReversed, setIsReversed] = useState(false); // **-- NEW STATE --**

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
                            } else if (activePredictionType === "simple") {
                                const simplePredictedResult = simplePrediction(
                                    history.map((item) => parseInt(item.number))
                                );
                                if (
                                    simplePredictedResult.includes("Big") &&
                                    actualSize !== "Big"
                                ) {
                                    lastPredictionLost = true;
                                } else if (
                                    simplePredictedResult.includes("Small") &&
                                    actualSize !== "Small"
                                ) {
                                    lastPredictionLost = true;
                                } else if (
                                    simplePredictedResult.includes("🔴") &&
                                    actualColor !== "🔴"
                                ) {
                                    lastPredictionLost = true;
                                } else if (
                                    simplePredictedResult.includes("🟢") &&
                                    actualColor !== "🟢"
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

    const handleSimplePredict = useCallback(() => {
        if (history.length > 1) {
            const numbers = history.map((item) => parseInt(item.number));
            const prediction = simplePrediction(numbers);
            setSimplePredictionResult(prediction);
        } else {
            setSimplePredictionResult(
                "Not enough history for this prediction."
            );
        }
        setGuaranteedPrediction(null);
        setActivePredictionType("simple");
    }, [history]);

    // **-- NEW FUNCTION: Handle Update button click --**
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

    const handleCopyClick = async () => {
        const getPredictionText = (originalResult) => {
            if (isReversed) {
                if (originalResult === "Big") return "Small";
                if (originalResult === "Small") return "Big";
                if (originalResult === "RED" || originalResult === "🔴")
                    return "GREEN";
                if (originalResult === "GREEN" || originalResult === "🟢")
                    return "RED";
            }
            return originalResult;
        };

        const getPredictionNumbers = (originalResult) => {
            const result = isReversed
                ? getPredictionText(originalResult)
                : originalResult;

            if (result === "Big" || result === "BIG") {
                return [5, 9];
            } else if (result === "Small" || result === "SMALL") {
                return [0, 4];
            } else if (result === "RED" || result === "🔴") {
                return [2, 6];
            } else if (result === "GREEN" || result === "🟢") {
                return [1, 7];
            }
            return [];
        };

        let originalResult = null;
        if (activePredictionType === "guaranteed" && guaranteedPrediction) {
            originalResult = guaranteedPrediction.result;
        } else if (
            activePredictionType === "simple" &&
            simplePredictionResult
        ) {
            originalResult = simplePredictionResult;
        }

        const predictionText = getPredictionText(originalResult);
        const predictedNumbers = getPredictionNumbers(originalResult);

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
        const getNumbersToDisplay = (prediction) => {
            if (prediction === "Big") return [5, 9];
            if (prediction === "Small") return [0, 4];
            if (prediction === "RED" || prediction === "🔴") return [2, 6];
            if (prediction === "GREEN" || prediction === "🟢") return [1, 7];
            return [];
        };

        const getReversedPrediction = (original) => {
            if (original === "Big") return "Small";
            if (original === "Small") return "Big";
            if (original === "RED" || original === "🔴") return "Green";
            if (original === "GREEN" || original === "🟢") return "Red";
            return original;
        };

        let result = null;
        let originalResult = null;

        if (activePredictionType === "guaranteed" && guaranteedPrediction) {
            originalResult = guaranteedPrediction.result;
        } else if (
            activePredictionType === "simple" &&
            simplePredictionResult
        ) {
            originalResult = simplePredictionResult;
        }

        if (originalResult) {
            result = isReversed
                ? getReversedPrediction(originalResult)
                : originalResult;
            const numbers = getNumbersToDisplay(result);
            const displayColor =
                result.includes("Green") || result.includes("🟢")
                    ? "green"
                    : result.includes("Red") || result.includes("🔴")
                    ? "red"
                    : "";

            return (
                <div className="prediction-box-right">
                    <div className={`prediction ${displayColor}`}>{result}</div>
                    <div className="prediction-Num">{numbers.join(" , ")}</div>
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
                <button
                    className="button button-secondary"
                    onClick={handleSimplePredict}
                >
                    Simple Prediction
                </button>
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
