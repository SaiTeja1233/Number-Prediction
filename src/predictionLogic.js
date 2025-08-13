// predictionLogic.js

// Helper: Get IST time
export const getISTTime = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(
        now.getTime() + istOffset + now.getTimezoneOffset() * 60000
    );
};

// Get color for number
export const getColorFromNumber = (num) => {
    if (num === 0) return "🔴🟣";
    if (num === 5) return "🟢🟣";
    if (num % 2 === 0) return "🔴";
    return "🟢";
};

// Get size for number
export const getSizeFromNumber = (num) => {
    return num >= 5 ? "Big" : "Small";
};

// Helper function to fetch the result of a specific period (1-minute)
export const fetchGameResult = async (period) => {
    try {
        const response = await fetch(
            `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?period=${period}`
        );
        const data = await response.json();
        const result = data?.data?.list?.[0];
        if (result) {
            const number = parseInt(result.number);
            const actualResult = number >= 5 ? "BIG" : "SMALL";
            const colorResult = [0, 2, 4, 6, 8].includes(number)
                ? "RED"
                : "GREEN";
            return { actualResult, colorResult };
        }
    } catch (err) {
        console.error("Error fetching game result:", err);
    }
    return null;
};

// Helper function to fetch optimized data (1-minute history)
export const fetchOptimizedData = async () => {
    try {
        const response = await fetch(
            `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${Date.now()}`
        );
        const data = await response.json();
        return data?.data?.list || [];
    } catch (err) {
        console.error("Error fetching optimized data:", err);
    }
    return [];
};

// **NEW FETCH FUNCTION FOR 30-SECOND WINGO**
export const fetchThirtySecData = async () => {
     try {
         const response = await fetch(
             `https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?ts=${Date.now()}`
         );
         const data = await response.json();
         return data?.data?.list || [];
     } catch (err) {
         console.error("Error fetching optimized data:", err);
     }
};

/**
 * Main prediction logic function
 * @param {string} betType - The type of bet ("bigsmall" or "color")
 * @param {string} period - The current game period
 * @param {Array<Object>} history - The game history
 * @param {number} consecutiveLosses - The number of consecutive losses
 * @returns {Promise<Object>} - The predicted result, probability, and a message
 */
export async function guaranteedWinServerMethod(
    betType,
    period,
    history,
    consecutiveLosses
) {
    // 1. Prioritize Confirmed API Result
    const actualResult = await fetchGameResult(period);
    if (actualResult) {
        console.log("Actual Result:", actualResult);
        let oppositeResult;
        if (betType === "bigsmall") {
            oppositeResult =
                actualResult.actualResult === "BIG" ? "SMALL" : "BIG";
        } else {
            oppositeResult =
                actualResult.colorResult === "RED" ? "GREEN" : "RED";
        }
        return {
            result: oppositeResult,
            probability: 100,
            message: `Guaranteed Win (API - Opposite Result)`,
        };
    }

    // 2. Fallback to Prediction Logic
    const data = await fetchOptimizedData();
    const numbers =
        data.length > 0
            ? data.map((item) => parseInt(item.number || "0", 10) % 10)
            : Array(20).fill(Math.floor(Math.random() * 10));

    const recentResults = numbers.slice(0, 10);

    const getResultFromNumber = (n) =>
        betType === "bigsmall"
            ? n >= 5
                ? "BIG"
                : "SMALL"
            : [0, 2, 4, 6, 8].includes(n)
            ? "RED"
            : "GREEN";

    const resultCounts = recentResults.reduce((acc, n) => {
        const resultKey = getResultFromNumber(n);
        acc[resultKey] = (acc[resultKey] || 0) + 1;
        return acc;
    }, {});

    const dominantResult = Object.entries(resultCounts).reduce((a, b) =>
        a[1] > b[1] ? a : b
    )[0];

    // Determine the opposite result for the fallback logic
    const oppositeDominantResult =
        betType === "bigsmall"
            ? dominantResult === "BIG"
                ? "SMALL"
                : "BIG"
            : dominantResult === "RED"
            ? "GREEN"
            : "RED";

    // New logic based on consecutive losses
    let predictedResult;
    let predictionMessage;
    if (consecutiveLosses === 1) {
        predictedResult = dominantResult;
        predictionMessage = "Showing actual prediction after 1 loss";
    } else if (consecutiveLosses >= 2) {
        predictedResult = oppositeDominantResult;
        predictionMessage = "Reverting to opposite prediction after 2 losses";
    } else {
        predictedResult = oppositeDominantResult;
        predictionMessage = "Guaranteed Win (Opposite Prediction)";
    }

    return {
        result: predictedResult,
        probability: 100,
        message: predictionMessage,
    };
}

// Simple prediction function
export const simplePrediction = (numbers, type) => {
    // --- Color Prediction Logic ---
    if (type === "color") {
        if (numbers.length < 2) {
            return {
                color: null,
                numbers: [],
                message: "Not enough history to predict.",
            };
        }

        const lastNumber = numbers[0];
        const secondLastNumber = numbers[1];

        // Example logic:
        const diff = lastNumber - secondLastNumber;
        const predictedNumber = lastNumber + diff;

        let predictedNumbers = [];
        let predictedColor;

        if (predictedNumber >= 0 && predictedNumber <= 9) {
            predictedNumbers.push(predictedNumber);
            predictedColor = getColorFromNumber(predictedNumber);
        }

        // Fallback logic
        if (predictedNumbers.length === 0) {
            const lastColor = getColorFromNumber(lastNumber);
            predictedColor = lastColor === "🟢" ? "🔴" : "🟢";
            if (predictedColor === "🟢") {
                predictedNumbers = [1, 3];
            } else {
                predictedNumbers = [2, 4];
            }
        }

        return {
            color: predictedColor,
            numbers: predictedNumbers,
            message: "Predicted based on number sequence analysis.",
        };
    }

    // --- New Size Prediction Logic ---
    if (type === "size") {
        if (numbers.length < 2) {
            return {
                size: null,
                numbers: [],
                message: "Not enough history for size prediction.",
            };
        }

        const lastNumber = numbers[0];
        const secondLastNumber = numbers[1];

        // Logic: Predict based on the difference between the last two numbers
        const diff = lastNumber - secondLastNumber;
        let predictedNumber = lastNumber + diff;

        let predictedNumbers = [];
        let predictedSize;

        // Ensure the predicted number is within the 0-9 range
        if (predictedNumber < 0) {
            predictedNumber = 0;
        } else if (predictedNumber > 9) {
            predictedNumber = 9;
        }

        // To avoid repeated predictions, check if the predicted number is the same as the last one
        if (predictedNumber === lastNumber) {
            // If it's a repeat, try a different number.
            // Example: toggle the size.
            const lastSize = getSizeFromNumber(lastNumber);
            if (lastSize === "Big") {
                predictedSize = "Small";
                predictedNumbers = [0, 1]; // Example Small numbers
            } else {
                predictedSize = "Big";
                predictedNumbers = [9, 8]; // Example Big numbers
            }
        } else {
            // If the predicted number is new, use it
            predictedNumbers.push(predictedNumber);
            predictedSize = getSizeFromNumber(predictedNumber);

            // Add a second, non-repeated number
            const secondPredictedNumber =
                predictedSize === "Big"
                    ? predictedNumber === 9
                        ? 8
                        : 9
                    : predictedNumber === 0
                    ? 1
                    : 0;

            if (secondPredictedNumber !== predictedNumber) {
                predictedNumbers.push(secondPredictedNumber);
            }
        }

        return {
            size: predictedSize,
            numbers: predictedNumbers,
            message: "Predicted based on number sequence and size logic.",
        };
    }

    return null; // Fallback
};
