// wingoUtils.js

// --- Constants ---
const PREDICTION_TYPE = {
    COLOR: "Color",
    SIZE: "Size",
    NUMBER: "Number",
};

const COLORS = {
    GREEN: "green",
    RED: "red",
    VIOLET: "violet",
};

const SIZES = {
    SMALL: "Small",
    BIG: "Big",
};

const CONSECUTIVE_LOSS_THRESHOLDS = {
    FORCE_COLOR: 4,
    FALLBACK_COLOR: 1,
    SWITCH_TYPE_AFTER_LOSS: 2,
};

// --- Utility Functions ---

export function getISTTime() {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(utcTime + istOffset);
}

export function startTimer(setTimer, fetchDataCallback) {
    function updateTimer() {
        const now = getISTTime();
        const seconds = now.getSeconds();
        const count = 59 - seconds;
        setTimer((count < 10 ? "0" : "") + count);
        if (count <= 1) {
            fetchDataCallback();
        }
    }
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => {
        clearInterval(timerInterval);
    };
}

export function getSizeFromNumber(num) {
    if (num >= 0 && num <= 4) {
        return SIZES.SMALL;
    } else if (num >= 5 && num <= 9) {
        return SIZES.BIG;
    }
    return "";
}

export function getHistoryColorClass(num) {
    if (num === 0) {
        return "red-violet";
    } else if (num === 5) {
        return "green-violet";
    } else if (num % 2 !== 0) {
        return COLORS.GREEN;
    } else {
        return COLORS.RED;
    }
}

export function getNormalizedResult(number) {
    const color = getHistoryColorClass(number).replace("-violet", "");
    const size = getSizeFromNumber(number);
    return { number, color, size };
}

function getMostFrequentColor(data) {
    const colorCounts = { [COLORS.GREEN]: 0, [COLORS.RED]: 0 };
    for (const entry of data) {
        const normalized = getNormalizedResult(parseInt(entry.number));
        const baseColor =
            normalized.color === "violet"
                ? parseInt(entry.number) === 0
                    ? COLORS.RED
                    : COLORS.GREEN
                : normalized.color;
        colorCounts[baseColor]++;
    }

    if (colorCounts[COLORS.GREEN] > colorCounts[COLORS.RED]) {
        return COLORS.GREEN;
    } else if (colorCounts[COLORS.RED] > colorCounts[COLORS.GREEN]) {
        return COLORS.RED;
    } else {
        return null;
    }
}

function detectDragonBreakPatterns(
    historicalData,
    property,
    minDragonLength = 5
) {
    const breakPoints = new Map();
    const propertyValues =
        property === "size"
            ? [SIZES.BIG, SIZES.SMALL]
            : [COLORS.GREEN, COLORS.RED];

    for (const val of propertyValues) {
        breakPoints.set(val, new Map());
    }

    let currentStreakLength = 0;
    let currentStreakValue = null;

    for (let i = historicalData.length - 1; i >= 0; i--) {
        const entryValue = historicalData[i][property];

        if (entryValue === currentStreakValue) {
            currentStreakLength++;
        } else {
            if (
                currentStreakLength >= minDragonLength &&
                currentStreakValue !== null
            ) {
                const prevBreaks = breakPoints.get(currentStreakValue);
                prevBreaks.set(
                    currentStreakLength,
                    (prevBreaks.get(currentStreakLength) || 0) + 1
                );
            }
            currentStreakValue = entryValue;
            currentStreakLength = 1;
        }
    }
    if (currentStreakLength >= minDragonLength && currentStreakValue !== null) {
        const prevBreaks = breakPoints.get(currentStreakValue);
        prevBreaks.set(
            currentStreakLength,
            (prevBreaks.get(currentStreakLength) || 0) + 1
        );
    }

    const dragonBreakAnalysis = new Map();

    for (const [value, lengthsCountMap] of breakPoints.entries()) {
        let mostFrequentLength = 0;
        let maxCount = 0;
        let totalBreaks = 0;

        for (const [length, count] of lengthsCountMap.entries()) {
            totalBreaks += count;
            if (count > maxCount) {
                maxCount = count;
                mostFrequentLength = length;
            }
        }
        if (totalBreaks > 0 && maxCount > 0) {
            dragonBreakAnalysis.set(value, {
                breakPoint: mostFrequentLength,
                confidence: maxCount / totalBreaks,
            });
        }
    }
    return dragonBreakAnalysis;
}

// --- Main Prediction Logic ---
export function getLatestEntryPrediction(
    historicalData,
    nextPeriodIssueNumber,
    forceNumberPrediction = false,
    previousPredictionInfo = {
        consecutiveLosses: 0,
        lastPredictionType: null,
        lastPredictionWasLoss: false,
    }
) {
    const defaultPrediction = {
        type: PREDICTION_TYPE.COLOR,
        value: COLORS.GREEN,
        strategy: "Default (No strong pattern or insufficient history)",
        predictedNumber: null,
        recommendedNumbers: [],
        secondaryColor: null,
    };

    if (!historicalData || historicalData.length < 5) {
        return defaultPrediction;
    }

    let finalPrediction = { ...defaultPrediction };

    let derivedNumber = null;
    if (nextPeriodIssueNumber) {
        const periodStr = nextPeriodIssueNumber.toString().trim();
        if (periodStr.length > 0) {
            const lastDigit = parseInt(periodStr[periodStr.length - 1]);
            if (!isNaN(lastDigit)) {
                derivedNumber = lastDigit;
                finalPrediction.predictedNumber = derivedNumber;
            }
        }
    }

    if (forceNumberPrediction && derivedNumber !== null) {
        finalPrediction.type = PREDICTION_TYPE.NUMBER;
        finalPrediction.value = derivedNumber;
        finalPrediction.strategy = `Forced Number Prediction after losses (Derived from Next Period Last Digit ${derivedNumber})`;
        finalPrediction.recommendedNumbers = [derivedNumber];
        if (derivedNumber === 0 || derivedNumber === 5) {
            finalPrediction.secondaryColor = COLORS.VIOLET;
        }
        return finalPrediction;
    }

    const fullNormalizedHistory = historicalData.map((entry) =>
        getNormalizedResult(parseInt(entry.number))
    );

    const recentResultsForPatterns = fullNormalizedHistory
        .slice(0, 6)
        .reverse();


    // --- Pattern Candidates Collection ---
    const patternCandidates = [];

    const addPattern = (type, value, strategy, priority) => {
        patternCandidates.push({ type, value, strategy, priority });
    };

    // --- NEW: Dragon Detection and Pre-emptive Break Prediction (ULTRA-HIGH PRIORITY) ---
    const dragonBreakAnalysisSize = detectDragonBreakPatterns(
        fullNormalizedHistory,
        "size",
        5
    );
    const dragonBreakAnalysisColor = detectDragonBreakPatterns(
        fullNormalizedHistory,
        "color",
        5
    );

    if (fullNormalizedHistory.length > 0) {
        let currentSizeStreakValue = fullNormalizedHistory[0].size;
        let currentSizeStreakLength = 0;
        for (let i = 0; i < fullNormalizedHistory.length; i++) {
            if (fullNormalizedHistory[i].size === currentSizeStreakValue) {
                currentSizeStreakLength++;
            } else {
                break;
            }
        }

        const sizeBreakInfo = dragonBreakAnalysisSize.get(
            currentSizeStreakValue
        );
        if (sizeBreakInfo && sizeBreakInfo.confidence > 0.6) {
            if (currentSizeStreakLength === sizeBreakInfo.breakPoint - 1) {
                const predictedSize =
                    currentSizeStreakValue === SIZES.BIG
                        ? SIZES.SMALL
                        : SIZES.BIG;
                addPattern(
                    PREDICTION_TYPE.SIZE,
                    predictedSize,
                    `Dragon Break Prediction: Current ${currentSizeStreakValue} streak at ${currentSizeStreakLength}, historically breaks at ${sizeBreakInfo.breakPoint}. Predicting ${predictedSize}.`,
                    200
                );
            }
        }
    }

    if (fullNormalizedHistory.length > 0) {
        let currentColorStreakValue = fullNormalizedHistory[0].color;
        let currentColorStreakLength = 0;
        for (let i = 0; i < fullNormalizedHistory.length; i++) {
            if (fullNormalizedHistory[i].color === currentColorStreakValue) {
                currentColorStreakLength++;
            } else {
                break;
            }
        }

        const colorBreakInfo = dragonBreakAnalysisColor.get(
            currentColorStreakValue
        );
        if (colorBreakInfo && colorBreakInfo.confidence > 0.6) {
            if (currentColorStreakLength === colorBreakInfo.breakPoint - 1) {
                const predictedColor =
                    currentColorStreakValue === COLORS.GREEN
                        ? COLORS.RED
                        : COLORS.GREEN;
                addPattern(
                    PREDICTION_TYPE.COLOR,
                    predictedColor,
                    `Dragon Break Prediction: Current ${currentColorStreakValue} streak at ${currentColorStreakLength}, historically breaks at ${colorBreakInfo.breakPoint}. Predicting ${predictedColor}.`,
                    190
                );
            }
        }
    }

    // --- Active Predefined Pattern Detection (HIGHER PRIORITIES) ---

    // NEW Custom Pattern: B S B B (Oldest to Newest) -> ?
    if (
        recentResultsForPatterns.length >= 4 &&
        recentResultsForPatterns[0].size === SIZES.BIG &&
        recentResultsForPatterns[1].size === SIZES.SMALL &&
        recentResultsForPatterns[2].size === SIZES.BIG &&
        recentResultsForPatterns[3].size === SIZES.BIG
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            SIZES.SMALL,
            "Active Size Pattern: B S B B (Oldest to Newest) -> S",
            99
        );
    }

    // 1. Triple Repeat Pattern (e.g., Y X X X -> Predict X) - Priority 100
    if (recentResultsForPatterns.length >= 4) {
        if (
            recentResultsForPatterns[1].size ===
                recentResultsForPatterns[2].size &&
            recentResultsForPatterns[2].size ===
                recentResultsForPatterns[3].size &&
            recentResultsForPatterns[0].size !==
                recentResultsForPatterns[1].size
        ) {
            addPattern(
                PREDICTION_TYPE.SIZE,
                recentResultsForPatterns[3].size,
                "Active Size Pattern: Y X X X (Oldest to Newest) -> X",
                100
            );
        }
    }

    // 2. Double Alternating Pattern: (B S S B -> Predict S) - Priority 90
    if (
        recentResultsForPatterns.length >= 4 &&
        recentResultsForPatterns[0].size === SIZES.BIG &&
        recentResultsForPatterns[1].size === SIZES.SMALL &&
        recentResultsForPatterns[2].size === SIZES.SMALL &&
        recentResultsForPatterns[3].size === SIZES.BIG
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            SIZES.SMALL,
            "Active Size Pattern: B S S B (Oldest to Newest) -> S",
            90
        );
    }
    // 3. Double Alternating Pattern: (S B B S -> Predict B) - Priority 90
    if (
        recentResultsForPatterns.length >= 4 &&
        recentResultsForPatterns[0].size === SIZES.SMALL &&
        recentResultsForPatterns[1].size === SIZES.BIG &&
        recentResultsForPatterns[2].size === SIZES.BIG &&
        recentResultsForPatterns[3].size === SIZES.SMALL
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            SIZES.BIG,
            "Active Size Pattern: S B B S (Oldest to Newest) -> B",
            90
        );
    }
    // 4. Double Alternating Pattern: (S S B B -> Predict S) - Priority 90
    if (
        recentResultsForPatterns.length >= 4 &&
        recentResultsForPatterns[0].size === SIZES.SMALL &&
        recentResultsForPatterns[1].size === SIZES.SMALL &&
        recentResultsForPatterns[2].size === SIZES.BIG &&
        recentResultsForPatterns[3].size === SIZES.BIG
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            SIZES.SMALL,
            "Active Size Pattern: S S B B (Oldest to Newest) -> S",
            90
        );
    }
    // 5. Double Alternating Pattern: (B B S S -> Predict B) - Priority 90
    if (
        recentResultsForPatterns.length >= 4 &&
        recentResultsForPatterns[0].size === SIZES.BIG &&
        recentResultsForPatterns[1].size === SIZES.BIG &&
        recentResultsForPatterns[2].size === SIZES.SMALL &&
        recentResultsForPatterns[3].size === SIZES.SMALL
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            SIZES.BIG,
            "Active Size Pattern: B B S S (Oldest to Newest) -> B",
            90
        );
    }
    // 6. Double Alternating Pattern: (B B S B -> Predict S) - Priority 90
    if (
        recentResultsForPatterns.length >= 4 &&
        recentResultsForPatterns[0].size === SIZES.BIG &&
        recentResultsForPatterns[1].size === SIZES.BIG &&
        recentResultsForPatterns[2].size === SIZES.SMALL &&
        recentResultsForPatterns[3].size === SIZES.BIG
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            SIZES.SMALL,
            "Active Size Pattern: B B S B (Oldest to Newest) -> S",
            90
        );
    }
    // 7. Double Alternating Pattern: (S S B S -> Predict B) - Priority 90
    if (
        recentResultsForPatterns.length >= 4 &&
        recentResultsForPatterns[0].size === SIZES.SMALL &&
        recentResultsForPatterns[1].size === SIZES.SMALL &&
        recentResultsForPatterns[2].size === SIZES.BIG &&
        recentResultsForPatterns[3].size === SIZES.SMALL
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            SIZES.BIG,
            "Active Size Pattern: S S B S (Oldest to Newest) -> B",
            90
        );
    }

    // 8. Cyclic Size Pattern (2-step Alternation) (e.g. S B S B S -> Predict B) - Priority 80
    if (
        recentResultsForPatterns.length >= 5 &&
        recentResultsForPatterns[0].size === recentResultsForPatterns[2].size &&
        recentResultsForPatterns[2].size === recentResultsForPatterns[4].size &&
        recentResultsForPatterns[1].size === recentResultsForPatterns[3].size &&
        recentResultsForPatterns[0].size !== recentResultsForPatterns[1].size
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            recentResultsForPatterns[3].size,
            "Active Cyclic Size Pattern (2-step Alternation) (Oldest to Newest)",
            80
        );
    }

    // 9. Two Consecutive Repeats then Flip (e.g. S S B B -> Predict S) - Priority 70
    if (
        recentResultsForPatterns.length >= 4 &&
        recentResultsForPatterns[0].size === recentResultsForPatterns[1].size &&
        recentResultsForPatterns[2].size === recentResultsForPatterns[3].size &&
        recentResultsForPatterns[0].size !== recentResultsForPatterns[2].size
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            recentResultsForPatterns[0].size,
            "Active Repeating Double Size Pattern Detected (Oldest to Newest)",
            70
        );
    }

    // --- Fallback Patterns (LOWER PRIORITIES) ---

    // "Alternative Pattern" - Simple Alternating Size Pattern (e.g. Small → Big → ?Small) - Priority 20
    if (
        recentResultsForPatterns.length >= 2 &&
        recentResultsForPatterns[0].size !== recentResultsForPatterns[1].size
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            recentResultsForPatterns[0].size,
            "Fallback: Simple Alternating Size Pattern (Oldest to Newest)",
            20
        );
    }
    // "Simple Repeat Pattern" - Simple Repeating Size Pattern (e.g. Small → Small → ?Small) - Priority 10
    if (
        recentResultsForPatterns.length >= 2 &&
        recentResultsForPatterns[0].size === recentResultsForPatterns[1].size
    ) {
        addPattern(
            PREDICTION_TYPE.SIZE,
            recentResultsForPatterns[0].size,
            "Fallback: Simple Repeating Size Pattern (Oldest to Newest)",
            10
        );
    }
    // --- Detect Color Patterns (Also with their own priority hierarchy) ---
    // Three Repeats → Flip (e.g. R R R G G G -> Predict R) - Priority 60
    if (
        recentResultsForPatterns.length >= 6 &&
        recentResultsForPatterns[0].color ===
            recentResultsForPatterns[1].color &&
        recentResultsForPatterns[1].color ===
            recentResultsForPatterns[2].color &&
        recentResultsForPatterns[3].color ===
            recentResultsForPatterns[4].color &&
        recentResultsForPatterns[4].color ===
            recentResultsForPatterns[5].color &&
        recentResultsForPatterns[0].color !== recentResultsForPatterns[3].color
    ) {
        addPattern(
            PREDICTION_TYPE.COLOR,
            recentResultsForPatterns[0].color,
            "Color Pattern: 3-Step Flip Detected (Oldest to Newest)",
            60
        );
    }
    // Zigzag Color Pattern (e.g. G R G R -> Predict G) - Priority 55
    else if (
        recentResultsForPatterns.length >= 4 &&
        recentResultsForPatterns[0].color ===
            recentResultsForPatterns[2].color &&
        recentResultsForPatterns[1].color ===
            recentResultsForPatterns[3].color &&
        recentResultsForPatterns[0].color !== recentResultsForPatterns[1].color
    ) {
        addPattern(
            PREDICTION_TYPE.COLOR,
            recentResultsForPatterns[2].color,
            "Color Pattern: Zigzag Alternating Detected (Oldest to Newest)",
            55
        );
    }
    // Simple Alternating Color Pattern (e.g. G R -> ?G) - Priority 5
    else if (
        recentResultsForPatterns.length >= 2 &&
        recentResultsForPatterns[0].color !== recentResultsForPatterns[1].color
    ) {
        addPattern(
            PREDICTION_TYPE.COLOR,
            recentResultsForPatterns[0].color,
            "Color Pattern: Simple Alternating (Oldest to Newest)",
            5
        );
    }
    // Simple Repeating Color Pattern (e.g. G G -> ?G) - Priority 1
    else if (
        recentResultsForPatterns.length >= 2 &&
        recentResultsForPatterns[0].color === recentResultsForPatterns[1].color
    ) {
        addPattern(
            PREDICTION_TYPE.COLOR,
            recentResultsForPatterns[0].color,
            "Color Pattern: Simple Repeating (Oldest to Newest)",
            1
        );
    }

    // --- Select Best Pattern Candidate ---
    let bestPattern = null;
    if (patternCandidates.length > 0) {
        patternCandidates.sort((a, b) => b.priority - a.priority);
        bestPattern = patternCandidates[0];
    }

    // --- Applying Prediction Rules ---

    // Rule 1: If 4 or more consecutive losses, prioritize Color prediction strongly.
    if (
        previousPredictionInfo.consecutiveLosses >=
        CONSECUTIVE_LOSS_THRESHOLDS.FORCE_COLOR
    ) {
        let predictionValue = null;
        let predictionStrategy = `Forced Color after ${previousPredictionInfo.consecutiveLosses} Losses`;

        if (bestPattern && bestPattern.type === PREDICTION_TYPE.COLOR) {
            predictionValue = bestPattern.value;
            predictionStrategy += ` (${bestPattern.strategy})`;
        } else {
            const mostFrequentColorInLast10 = getMostFrequentColor(
                historicalData.slice(0, 10)
            );
            if (mostFrequentColorInLast10) {
                predictionValue = mostFrequentColorInLast10;
                predictionStrategy += ` (Most Frequent in Last 10)`;
            } else if (derivedNumber !== null) {
                const derivedOutcome = getNormalizedResult(derivedNumber);
                predictionValue = derivedOutcome.color;
                predictionStrategy += ` (Derived from Period Last Digit ${derivedNumber})`;
                finalPrediction.predictedNumber = derivedNumber;
            } else {
                predictionValue = defaultPrediction.value;
                predictionStrategy += ` (Default fallback)`;
            }
        }
        finalPrediction.type = PREDICTION_TYPE.COLOR;
        finalPrediction.value = predictionValue;
        finalPrediction.strategy = predictionStrategy;
    }
    // Rule 2: If 1 consecutive loss, prioritize Color prediction
    else if (
        previousPredictionInfo.consecutiveLosses ===
        CONSECUTIVE_LOSS_THRESHOLDS.FALLBACK_COLOR
    ) {
        let predictionValue = null;
        let predictionStrategy = `Fallback: Color after 1 Loss`;

        if (bestPattern && bestPattern.type === PREDICTION_TYPE.COLOR) {
            predictionValue = bestPattern.value;
            predictionStrategy += ` (${bestPattern.strategy})`;
        } else {
            const mostFrequentColorInLast10 = getMostFrequentColor(
                historicalData.slice(0, 10)
            );
            if (mostFrequentColorInLast10) {
                predictionValue = mostFrequentColorInLast10;
                predictionStrategy += ` (Most Frequent in Last 10)`;
            } else if (derivedNumber !== null) {
                const derivedOutcome = getNormalizedResult(derivedNumber);
                predictionValue = derivedOutcome.color;
                predictionStrategy += ` (Derived from Period Last Digit ${derivedNumber})`;
                finalPrediction.predictedNumber = derivedNumber;
            } else {
                predictionValue = defaultPrediction.value;
                predictionStrategy += ` (Default fallback)`;
            }
        }
        finalPrediction.type = PREDICTION_TYPE.COLOR;
        finalPrediction.value = predictionValue;
        finalPrediction.strategy = predictionStrategy;
    }
    // Rule 3: If previous was Color loss, force Size prediction (unless Rule 1 or 2 applied)
    else if (
        previousPredictionInfo.lastPredictionWasLoss &&
        previousPredictionInfo.lastPredictionType === PREDICTION_TYPE.COLOR
    ) {
        let predictionValue = null;
        let predictionStrategy = `Fallback: Size after Color Loss`;

        if (bestPattern && bestPattern.type === PREDICTION_TYPE.SIZE) {
            predictionValue = bestPattern.value;
            predictionStrategy += ` (${bestPattern.strategy})`;
        } else {
            if (bestPattern && bestPattern.type === PREDICTION_TYPE.COLOR) {
                predictionValue = bestPattern.value;
                finalPrediction.type = PREDICTION_TYPE.COLOR;
                predictionStrategy = `Fallback: Color Pattern (No Size Pattern) after Color Loss (${bestPattern.strategy})`;
            } else if (derivedNumber !== null) {
                predictionValue = derivedNumber;
                finalPrediction.type = PREDICTION_TYPE.NUMBER;
                predictionStrategy = `Fallback: Derived from Period Last Digit after Color Loss (${derivedNumber})`;
                finalPrediction.predictedNumber = derivedNumber;
            } else {
                finalPrediction = {
                    ...defaultPrediction,
                    strategy:
                        "Fallback: Default after Color Loss (No specific patterns)",
                };
            }
        }

        if (
            finalPrediction.type !== PREDICTION_TYPE.NUMBER &&
            finalPrediction.type !== PREDICTION_TYPE.COLOR
        ) {
            finalPrediction.type = PREDICTION_TYPE.SIZE;
            finalPrediction.value = predictionValue;
            finalPrediction.strategy = predictionStrategy;
        }
    }
    // New Rule: If 2 consecutive losses AND last prediction type was NOT this type, try to switch
    else if (
        previousPredictionInfo.consecutiveLosses >=
            CONSECUTIVE_LOSS_THRESHOLDS.SWITCH_TYPE_AFTER_LOSS &&
        bestPattern &&
        previousPredictionInfo.lastPredictionType !== bestPattern.type
    ) {
        finalPrediction.type = bestPattern.type;
        finalPrediction.value = bestPattern.value;
        finalPrediction.strategy = `Switch to ${bestPattern.type} after ${previousPredictionInfo.consecutiveLosses} losses (${bestPattern.strategy})`;
    }
    // Rule 4: Default prioritization (Best detected pattern > Derived Number > Default)
    else if (bestPattern) {
        finalPrediction.type = bestPattern.type;
        finalPrediction.value = bestPattern.value;
        finalPrediction.strategy = bestPattern.strategy;
    } else if (derivedNumber !== null) {
        finalPrediction.type = PREDICTION_TYPE.NUMBER;
        finalPrediction.value = derivedNumber;
        finalPrediction.strategy = `Derived from Next Period Last Digit (${derivedNumber})`;
    } else {
        finalPrediction = { ...defaultPrediction };
    }

    // Post-processing: If prediction is still default, try Most Frequent Color or Derived Color
    if (finalPrediction.strategy.includes("Default")) {
        const mostFrequentColorInLast10 = getMostFrequentColor(
            historicalData.slice(0, 10)
        );
        if (mostFrequentColorInLast10) {
            finalPrediction.type = PREDICTION_TYPE.COLOR;
            finalPrediction.value = mostFrequentColorInLast10;
            finalPrediction.strategy = `Color (Most Frequent in Last 10) - No Strong Pattern Detected`;
        } else if (derivedNumber !== null) {
            const derivedOutcome = getNormalizedResult(derivedNumber);
            finalPrediction.type = PREDICTION_TYPE.COLOR;
            finalPrediction.value = derivedOutcome.color;
            finalPrediction.strategy = `Color (Derived from Period Last Digit) - No Strong Pattern Detected`;
            finalPrediction.predictedNumber = derivedNumber;
        }
    }

    // --- Determine Recommended Numbers for Highlighting ---
    const allNumbers = [...Array(10).keys()];
    let recommendedNumbers = [];

    if (finalPrediction.type === PREDICTION_TYPE.COLOR) {
        if (finalPrediction.value === COLORS.GREEN) {
            recommendedNumbers = allNumbers.filter(
                (num) => num % 2 !== 0 && num !== 5
            );
            if (getHistoryColorClass(5).includes(COLORS.GREEN)) {
                recommendedNumbers.push(5);
            }
        } else if (finalPrediction.value === COLORS.RED) {
            recommendedNumbers = allNumbers.filter(
                (num) => num % 2 === 0 && num !== 0
            );
            if (getHistoryColorClass(0).includes(COLORS.RED)) {
                recommendedNumbers.push(0);
            }
        }
        if (
            finalPrediction.predictedNumber === 0 &&
            finalPrediction.value === COLORS.RED
        ) {
            finalPrediction.secondaryColor = COLORS.VIOLET;
        } else if (
            finalPrediction.predictedNumber === 5 &&
            finalPrediction.value === COLORS.GREEN
        ) {
            finalPrediction.secondaryColor = COLORS.VIOLET;
        }
    } else if (finalPrediction.type === PREDICTION_TYPE.SIZE) {
        let sizeNumbers = [];
        if (finalPrediction.value === SIZES.BIG) {
            sizeNumbers = allNumbers.filter((num) => num >= 5 && num <= 9);
        } else if (finalPrediction.value === SIZES.SMALL) {
            sizeNumbers = allNumbers.filter((num) => num >= 0 && num <= 4);
        }

        const sizeNumbersInLast10Periods = historicalData
            .slice(0, 10)
            .map((entry) => parseInt(entry.number))
            .filter((num) => sizeNumbers.includes(num));

        const frequencyMap = {};
        let maxFrequency = 0;
        let mostFrequentNumbersInSize = [];

        if (sizeNumbersInLast10Periods.length > 0) {
            for (const num of sizeNumbersInLast10Periods) {
                frequencyMap[num] = (frequencyMap[num] || 0) + 1;
                if (frequencyMap[num] > maxFrequency) {
                    maxFrequency = frequencyMap[num];
                    mostFrequentNumbersInSize = [num];
                } else if (frequencyMap[num] === maxFrequency) {
                    mostFrequentNumbersInSize.push(num);
                }
            }

            if (mostFrequentNumbersInSize.length > 0) {
                const numberFromSizePrediction = Math.min(
                    ...mostFrequentNumbersInSize
                );
                recommendedNumbers = [numberFromSizePrediction];
                finalPrediction.predictedNumber = numberFromSizePrediction;
                finalPrediction.strategy += ` (Specific Number: Most frequent ${numberFromSizePrediction} in last 10)`;
            } else {
                recommendedNumbers = sizeNumbers;
                finalPrediction.strategy += ` (No dominant specific number found in last 10, recommending all in size)`;
            }
        } else {
            recommendedNumbers = sizeNumbers;
            finalPrediction.strategy += ` (No recent numbers in this size, recommending all)`;
        }

        if (finalPrediction.predictedNumber === 0)
            finalPrediction.secondaryColor = COLORS.VIOLET;
        else if (finalPrediction.predictedNumber === 5)
            finalPrediction.secondaryColor = COLORS.VIOLET;
    } else if (
        finalPrediction.type === PREDICTION_TYPE.NUMBER &&
        finalPrediction.value !== null
    ) {
        recommendedNumbers = [finalPrediction.value];
        if (finalPrediction.value === 0) {
            finalPrediction.secondaryColor = COLORS.VIOLET;
        } else if (finalPrediction.value === 5) {
            finalPrediction.secondaryColor = COLORS.VIOLET;
        }
    }

    if (
        finalPrediction.predictedNumber === null &&
        recommendedNumbers.length === 1
    ) {
        finalPrediction.predictedNumber = recommendedNumbers[0];
    }

    finalPrediction.recommendedNumbers = recommendedNumbers;
    return finalPrediction;
}
