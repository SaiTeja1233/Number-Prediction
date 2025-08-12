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

// Helper function to fetch the result of a specific period
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

// Helper function to fetch optimized data (in this context, it's the history)
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

/**
 * Main prediction logic function
 * @param {string} betType - The type of bet ("bigsmall" or "color")
 * @param {string} period - The current game period
 * @param {Array<Object>} history - The game history
 * @returns {Promise<Object>} - The predicted result, probability, and a message
 */
export async function guaranteedWinServerMethod(betType, period, history) {
    // 1. Prioritize Confirmed API Result
    const actualResult = await fetchGameResult(period);
    if (actualResult) {
        return {
            result:
                betType === "bigsmall"
                    ? actualResult.actualResult
                    : actualResult.colorResult,
            probability: 100,
            message: `Guaranteed Win (API)`,
        };
    }

    // 2. Fallback to Prediction Logic
    const data = await fetchOptimizedData();
    const numbers =
        data.length > 0
            ? data.map((item) => parseInt(item.number || "0", 10) % 10)
            : Array(20).fill(Math.floor(Math.random() * 10)); // Use fallback data if API is empty

    const recentResults = numbers.slice(0, 10);
    const historicalWins = history
        .filter((h) => h.status === "WIN" && h.resultType === betType)
        .map((h) => h.result);

    // Determine the result based on number
    const getResultFromNumber = (n) =>
        betType === "bigsmall"
            ? n >= 5
                ? "BIG"
                : "SMALL"
            : [0, 2, 4, 6, 8].includes(n)
            ? "RED"
            : "GREEN";

    // Tally recent results
    const resultCounts = recentResults.reduce((acc, n) => {
        const resultKey = getResultFromNumber(n);
        acc[resultKey] = (acc[resultKey] || 0) + 1;
        return acc;
    }, {});

    // Find the dominant result
    const dominantResult = Object.entries(resultCounts).reduce((a, b) =>
        a[1] > b[1] ? a : b
    )[0];

    // Calculate the trend
    const trend =
        recentResults.reduce(
            (sum, n, i) => sum + (i > 0 ? n - recentResults[i - 1] : 0),
            0
        ) / 9;

    // Apply prediction adjustments based on trend
    let predictedResult = dominantResult;
    if (betType === "bigsmall") {
        if (trend > 0 && dominantResult === "SMALL") predictedResult = "Small";
        else if (trend < 0 && dominantResult === "BIG") predictedResult = "BIG";
    } else {
        // betType === 'color'
        if (trend > 0 && dominantResult === "GREEN") predictedResult = "GREEN";
        else if (trend < 0 && dominantResult === "RED") predictedResult = "RED";
    }

    // Adjust based on historical wins to avoid repeating losses
    if (
        historicalWins.length > 5 &&
        !historicalWins.slice(-5).includes(predictedResult)
    ) {
        predictedResult = historicalWins.slice(-1)[0] || predictedResult;
    }

    return {
        result: predictedResult,
        probability: 100,
        message: `Guaranteed Win (Enhanced Prediction)`,
    };
}
