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

// The simple prediction function
const simplePrediction = (numbers) => {
    if (numbers.length < 2) {
        return "Not enough numbers to predict";
    }

    const lastNumber = numbers[0];
    const secondLastNumber = numbers[1];

    if (lastNumber > secondLastNumber) {
        if (lastNumber > 5) {
            return "Small";
        } else {
            return "Big or Small";
        }
    } else if (lastNumber < secondLastNumber) {
        if (lastNumber < 5) {
            return "Big";
        } else {
            return "Big or Small";
        }
    } else {
        if (lastNumber > 5) {
            return "Big";
        } else if (lastNumber < 5) {
            return "Small";
        } else {
            return "Big or Small";
        }
    }
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

                        // Corrected logic:
                        if (history.length > 0) {
                            const lastResultNumber = parseInt(
                                history[0].number
                            );
                            const actualSize =
                                getSizeFromNumber(lastResultNumber);
                            const actualColor =
                                getColorFromNumber(lastResultNumber);
                            let lastPredictionLost = false;

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

                            if (lastPredictionLost) {
                                setBetType(
                                    betType === "bigsmall"
                                        ? "color"
                                        : "bigsmall"
                                );
                            } else {
                                setBetType("bigsmall");
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
        [latestPeriod, history, betType, guaranteedPrediction]
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
        const getPredictionText = () => {
            if (activePredictionType === "guaranteed" && guaranteedPrediction) {
                return guaranteedPrediction.result;
            }
            if (activePredictionType === "simple" && simplePredictionResult) {
                return simplePredictionResult;
            }
            return "N/A";
        };

        const getPredictionNumbers = () => {
            if (activePredictionType === "guaranteed" && guaranteedPrediction) {
                const result = guaranteedPrediction.result;
                const betTypeFromPrediction = ["BIG", "SMALL"].includes(result)
                    ? "bigsmall"
                    : "color";

                if (betTypeFromPrediction === "bigsmall") {
                    return result === "BIG" ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
                } else {
                    return result === "RED" ? [0, 2, 4, 6, 8] : [1, 3, 5, 7, 9];
                }
            }
            return [];
        };

        const predictionText = getPredictionText();
        const predictedNumbers = getPredictionNumbers();

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
        if (activePredictionType === "guaranteed" && guaranteedPrediction) {
            const result = guaranteedPrediction.result;
            const numbers =
                guaranteedPrediction.result === "BIG" ||
                guaranteedPrediction.result === "SMALL"
                    ? result === "BIG"
                        ? [5, 6, 7, 8, 9]
                        : [0, 1, 2, 3, 4]
                    : result === "RED"
                    ? [0, 2, 4, 6, 8]
                    : [1, 3, 5, 7, 9];

            const displayColor =
                result === "GREEN" ? "green" : result === "RED" ? "red" : "";

            return (
                <div className="prediction-box-right">
                    <div className={`prediction ${displayColor}`}>{result}</div>
                    <div className="prediction-Num">{numbers.join(" , ")}</div>
                </div>
            );
        } else if (
            activePredictionType === "simple" &&
            simplePredictionResult
        ) {
            return (
                <div className="prediction-box-right">
                    <div className="prediction">{simplePredictionResult}</div>
                    <div className="prediction-Num">
                        {/* No specific numbers for simple prediction */}
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
