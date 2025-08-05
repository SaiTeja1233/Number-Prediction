import React, {
    useState,
    useCallback,
    forwardRef,
    useImperativeHandle,
} from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import "./LogicsMenu.css";

// Helper functions
const getColorFromNumber = (num) => {
    if (num === 0) return "🔴🟣";
    if (num === 5) return "🟢🟣";
    return num % 2 === 0 ? "🔴" : "🟢";
};

const getSizeFromNumber = (num) => (num >= 5 ? "Big" : "Small");

const getNextPattern = (sequence) => {
    if (sequence.length < 6) return null;

    for (let len = 6; len >= 3; len--) {
        const lastPattern = sequence.slice(0, len).join("");
        for (let i = len; i <= sequence.length - len * 2; i++) {
            const potentialPattern = sequence.slice(i, i + len).join("");
            if (potentialPattern === lastPattern) {
                return sequence[i + len];
            }
        }
    }
    return null;
};

const getMajority = (sequence) => {
    if (sequence.length === 0) return null;
    const counts = {};
    for (const item of sequence) {
        counts[item] = (counts[item] || 0) + 1;
    }

    const sortedCounts = Object.entries(counts).sort(([, a], [, b]) => b - a);
    return sortedCounts.length > 0 ? sortedCounts[0][0] : null;
};

const getAlternateNext = (sequence) => {
    if (sequence.length >= 2 && sequence[0] !== sequence[1]) {
        const lastItem = sequence[0];
        const secondLastItem = sequence[1];
        if (lastItem === "🔴" && secondLastItem === "🟢") {
            return "🔴";
        }
        if (lastItem === "🟢" && secondLastItem === "🔴") {
            return "🟢";
        }
        if (lastItem === "Big" && secondLastItem === "Small") {
            return "Big";
        }
        if (lastItem === "Small" && secondLastItem === "Big") {
            return "Small";
        }
    }
    return null;
};

// --- MATHEMATICAL LOGICS HELPER FUNCTIONS ---

const getArithmeticPrediction = (numbers) => {
    if (numbers.length < 5) return null;
    const lastFive = numbers.slice(0, 5).reverse();
    const differences = lastFive
        .map((n, i) => (i > 0 ? n - lastFive[i - 1] : null))
        .slice(1);
    const isArithmetic = differences.every((diff) => diff === differences[0]);
    if (isArithmetic) {
        const nextNumber = lastFive[4] + differences[0];
        return (nextNumber >= 0 ? nextNumber : 10 + nextNumber) % 10;
    }
    return null;
};

const getLastTwoSumPrediction = (numbers) => {
    if (numbers.length < 5) return null;
    for (let i = 2; i < 5; i++) {
        if (numbers[i] !== (numbers[i - 1] + numbers[i - 2]) % 10) {
            return null;
        }
    }
    return (numbers[0] + numbers[1]) % 10;
};

const getLastDigitRepetition = (numbers) => {
    if (numbers.length < 5) return null;
    const lastFive = numbers.slice(0, 5);
    const lastDigits = lastFive.map((n) => n % 10);
    const firstDigit = lastDigits[0];
    const secondDigit = lastDigits[1];
    if (lastDigits[2] === firstDigit && lastDigits[3] === secondDigit) {
        return lastDigits[0];
    }
    return null;
};

// Main component
const LogicsMenu = forwardRef(
    ({ history, onPredictionUpdate, onSelectLogic, selectedLogic }, ref) => {
        const [isSidebarOpen, setIsSidebarOpen] = useState(false);
        const [lastPrediction, setLastPrediction] = useState(null);

        const logics = [
            "AI Predictor",
            "Sequence Logic",
            "Majority Logic",
            "Alternate Logic",
            "Mathematical Logic",
        ];

        const generatePrediction = useCallback(() => {
            const recent = history.slice(0, 20);
            if (recent.length < 6) {
                onPredictionUpdate({
                    size: "",
                    color: "",
                    numbers: [],
                    logic: selectedLogic,
                });
                return;
            }

            const numbers = recent.map((item) => parseInt(item.number));
            const colorSeq = numbers.map(getColorFromNumber);
            const sizeSeq = numbers.map(getSizeFromNumber);

            let predictedColor = "";
            let predictedSize = "";
            let predictedNumbers = [];
            let predictedNumber = null;
            let currentLogic = selectedLogic;

            // --- AI PREDICTOR LOGIC START ---
            if (selectedLogic === "AI Predictor") {
                const recentWithoutLast = history
                    .slice(1, 21)
                    .map((item) => parseInt(item.number));
                const lastNumber = parseInt(history[0].number);
                let bestFitLogic = null;

                const testLogics = [
                    "Sequence Logic",
                    "Mathematical Logic",
                    "Alternate Logic",
                    "Majority Logic",
                ];

                for (const logic of testLogics) {
                    let testPredictedNumber = null;
                    let testPredictedColor = "";
                    let testPredictedSize = "";

                    const testNumbers = recentWithoutLast;
                    const testColorSeq = testNumbers.map(getColorFromNumber);
                    const testSizeSeq = testNumbers.map(getSizeFromNumber);

                    switch (logic) {
                        case "Sequence Logic":
                            testPredictedColor = getNextPattern(testColorSeq);
                            testPredictedSize = getNextPattern(testSizeSeq);
                            break;
                        case "Mathematical Logic":
                            testPredictedNumber =
                                getArithmeticPrediction(testNumbers);
                            if (testPredictedNumber === null) {
                                testPredictedNumber =
                                    getLastTwoSumPrediction(testNumbers);
                            }
                            if (testPredictedNumber === null) {
                                testPredictedNumber =
                                    getLastDigitRepetition(testNumbers);
                            }
                            break;
                        case "Alternate Logic":
                            testPredictedColor = getAlternateNext(testColorSeq);
                            testPredictedSize = getAlternateNext(testSizeSeq);
                            break;
                        case "Majority Logic":
                            testPredictedColor = getMajority(testColorSeq);
                            testPredictedSize = getMajority(testSizeSeq);
                            break;
                        default:
                            break;
                    }

                    if (
                        testPredictedNumber !== null &&
                        testPredictedNumber === lastNumber
                    ) {
                        bestFitLogic = logic;
                        break;
                    }

                    if (testPredictedColor && testPredictedSize) {
                        if (
                            testPredictedColor ===
                                getColorFromNumber(lastNumber) &&
                            testPredictedSize === getSizeFromNumber(lastNumber)
                        ) {
                            bestFitLogic = logic;
                            break;
                        }
                    }
                }

                currentLogic = bestFitLogic || "Majority Logic";
            }
            // --- AI PREDICTOR LOGIC END ---

            // Use the determined logic for the final prediction
            switch (currentLogic) {
                case "Sequence Logic":
                    predictedColor = getNextPattern(colorSeq);
                    predictedSize = getNextPattern(sizeSeq);
                    break;
                case "Majority Logic":
                    predictedColor = getMajority(colorSeq);
                    predictedSize = getMajority(sizeSeq);
                    break;
                case "Alternate Logic":
                    predictedColor = getAlternateNext(colorSeq);
                    predictedSize = getAlternateNext(sizeSeq);
                    break;
                case "Mathematical Logic":
                    predictedNumber = getArithmeticPrediction(numbers);
                    if (predictedNumber === null) {
                        predictedNumber = getLastTwoSumPrediction(numbers);
                    }
                    if (predictedNumber === null) {
                        predictedNumber = getLastDigitRepetition(numbers);
                    }
                    break;
                default:
                    break;
            }

            // If a single number was predicted (from Mathematical Logic)
            if (predictedNumber !== null) {
                predictedNumbers = [predictedNumber];
                predictedColor = getColorFromNumber(predictedNumber);
                predictedSize = getSizeFromNumber(predictedNumber);
            } else {
                if (!predictedColor && !predictedSize) {
                    predictedColor = getMajority(colorSeq);
                    predictedSize = getMajority(sizeSeq);
                }

                let candidateNumbers = [];
                if (predictedColor) {
                    if (predictedColor === "🔴")
                        candidateNumbers = [0, 2, 4, 6, 8];
                    else if (predictedColor === "🟢")
                        candidateNumbers = [1, 3, 5, 7, 9];
                    else if (predictedColor === "🔴🟣") candidateNumbers = [0];
                    else if (predictedColor === "🟢🟣") candidateNumbers = [5];
                } else {
                    candidateNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                }

                if (predictedSize) {
                    candidateNumbers = candidateNumbers.filter(
                        (n) =>
                            (predictedSize === "Big" && n >= 5) ||
                            (predictedSize === "Small" && n < 5)
                    );
                }

                const freqMap = {};
                const filteredNumbers = numbers.filter((n) =>
                    candidateNumbers.includes(n)
                );

                filteredNumbers.forEach((num) => {
                    freqMap[num] = (freqMap[num] || 0) + 1;
                });

                const sortedFilteredNumbers = Object.keys(freqMap)
                    .sort((a, b) => freqMap[b] - freqMap[a])
                    .slice(0, 2)
                    .map(Number);

                predictedNumbers =
                    sortedFilteredNumbers.length > 0
                        ? sortedFilteredNumbers
                        : candidateNumbers.slice(0, 2);
            }

            if (
                lastPrediction &&
                JSON.stringify(predictedNumbers.sort()) ===
                    JSON.stringify(lastPrediction.numbers.sort())
            ) {
                if (predictedSize === "Big") {
                    predictedSize = "Small";
                } else if (predictedSize === "Small") {
                    predictedSize = "Big";
                }

                let candidateNumbers = [];
                if (predictedColor) {
                    if (predictedColor === "🔴")
                        candidateNumbers = [0, 2, 4, 6, 8];
                    else if (predictedColor === "🟢")
                        candidateNumbers = [1, 3, 5, 7, 9];
                    else if (predictedColor === "🔴🟣") candidateNumbers = [0];
                    else if (predictedColor === "🟢🟣") candidateNumbers = [5];
                } else {
                    candidateNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                }

                if (predictedSize) {
                    candidateNumbers = candidateNumbers.filter(
                        (n) =>
                            (predictedSize === "Big" && n >= 5) ||
                            (predictedSize === "Small" && n < 5)
                    );
                }

                const freqMap = {};
                const filteredNumbers = numbers.filter((n) =>
                    candidateNumbers.includes(n)
                );

                filteredNumbers.forEach((num) => {
                    freqMap[num] = (freqMap[num] || 0) + 1;
                });

                const sortedFilteredNumbers = Object.keys(freqMap)
                    .sort((a, b) => freqMap[b] - freqMap[a])
                    .slice(0, 2)
                    .map(Number);

                predictedNumbers =
                    sortedFilteredNumbers.length > 0
                        ? sortedFilteredNumbers
                        : candidateNumbers.slice(0, 2);
            }

            const currentPrediction = {
                size: predictedSize,
                color: predictedColor,
                numbers: predictedNumbers,
                logic: selectedLogic,
            };

            onPredictionUpdate(currentPrediction);
            setLastPrediction(currentPrediction);
        }, [history, selectedLogic, onPredictionUpdate, lastPrediction]);

        useImperativeHandle(ref, () => ({
            generatePrediction: () => {
                generatePrediction();
            },
        }));

        const handleLogicClick = (logic) => {
            onSelectLogic(logic);
            setIsSidebarOpen(false);
        };

        return (
            <div className="logics-menu-wrapper">
                <div className="logics-menu-bar desktop">
                    {logics.map((logic, index) => (
                        <div
                            key={index}
                            className={`logics-menu-item ${
                                selectedLogic === logic ? "active" : ""
                            }`}
                            onClick={() => handleLogicClick(logic)}
                        >
                            {logic}
                        </div>
                    ))}
                </div>
                <div className="logics-menu-mobile-toggle">
                    <FaBars onClick={() => setIsSidebarOpen(true)} />
                </div>
                <div
                    className={`logics-sidebar-overlay ${
                        isSidebarOpen ? "open" : ""
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
                <div
                    className={`logics-sidebar ${isSidebarOpen ? "open" : ""}`}
                >
                    <div className="logics-sidebar-header">
                        <h3>Logics Menu</h3>
                        <FaTimes
                            onClick={() => setIsSidebarOpen(false)}
                            className="close-btn"
                        />
                    </div>
                    <div className="logics-sidebar-content">
                        {logics.map((logic, index) => (
                            <div
                                key={index}
                                className={`logics-sidebar-item ${
                                    selectedLogic === logic ? "active" : ""
                                }`}
                                onClick={() => handleLogicClick(logic)}
                            >
                                {logic}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
);

export default LogicsMenu;
