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

// Logic to find and predict based on any repeating sequence
const sequencePredictorLogic = (history) => {
    let recentHistory = history.slice(0, 20);

    const findNextInSequence = (arr) => {
        const n = arr.length;
        if (n < 3) return null;

        for (let length = 2; length <= Math.floor(n / 2); length++) {
            const potentialSequence = arr.slice(n - length);
            let isRepeating = true;

            for (let i = 0; i < length; i++) {
                if (arr[n - length * 2 + i] !== potentialSequence[i]) {
                    isRepeating = false;
                    break;
                }
            }

            if (isRepeating) {
                return potentialSequence[0];
            }
        }
        return null;
    };

    while (recentHistory.length >= 3) {
        const colors = recentHistory.map((item) =>
            getColorFromNumber(item.number)
        );
        const sizes = recentHistory.map((item) =>
            getSizeFromNumber(item.number)
        );

        const nextColor = findNextInSequence(colors);
        const nextSize = findNextInSequence(sizes);

        if (nextColor || nextSize) {
            return { nextColor, nextSize };
        }

        recentHistory.pop();
    }

    return { nextColor: null, nextSize: null };
};

// Dynamic alternating logic (Corrected)
const dynamicAlternatingLogic = (fullHistory) => {
    const colorHistory = fullHistory.map((item) =>
        getColorFromNumber(item.number)
    );
    const sizeHistory = fullHistory.map((item) =>
        getSizeFromNumber(item.number)
    );

    const findBestPrediction = (data) => {
        if (data.length < 2) return null;

        for (let i = 0; i <= data.length - 2; i++) {
            const currentData = data.slice(i);

            // Check for simple alternating patterns (length 1: A,B,A,B)
            if (currentData.length >= 2) {
                if (
                    currentData[0] !== currentData[1] &&
                    currentData[0] === currentData[2]
                ) {
                    return currentData[1];
                }
            }

            // Check for more complex repeating patterns (e.g., AA,BB,AA,BB)
            if (currentData.length >= 4) {
                const recentPatternLength = currentData.length;
                for (
                    let patternLength = 2;
                    patternLength <= Math.floor(recentPatternLength / 2);
                    patternLength++
                ) {
                    const firstGroup = currentData.slice(0, patternLength);
                    const secondGroup = currentData.slice(
                        patternLength,
                        patternLength * 2
                    );

                    if (
                        JSON.stringify(firstGroup) ===
                        JSON.stringify(secondGroup)
                    ) {
                        return firstGroup[0];
                    }
                }
            }
        }
        return null;
    };

    const nextColor = findBestPrediction(colorHistory);
    const nextSize = findBestPrediction(sizeHistory);

    return { nextColor, nextSize };
};

// Corrected function to find predicted numbers without analyzing frequency
const findPredictedNumbers = (predictedSize, predictedColor) => {
    let relevantNumbers = [];
    const predictedNumbers = [];

    // Map color/size to the correct set of numbers
    if (predictedColor) {
        if (predictedColor === "🔴") relevantNumbers = [0, 2, 4, 6, 8];
        else if (predictedColor === "🟢") relevantNumbers = [1, 3, 5, 7, 9];
        else if (predictedColor === "🔴🟣") relevantNumbers = [0];
        else if (predictedColor === "🟢🟣") relevantNumbers = [5];
    } else if (predictedSize) {
        if (predictedSize === "Big") relevantNumbers = [5, 6, 7, 8, 9];
        else if (predictedSize === "Small") relevantNumbers = [0, 1, 2, 3, 4];
    } else {
        return [];
    }

    // Since we are not analyzing frequent numbers, we can simply pick two numbers from the relevant set
    if (relevantNumbers.length > 1) {
        // Example: Randomly pick two numbers from the relevant list
        // This ensures the numbers are always correct for the predicted category
        const shuffledNumbers = relevantNumbers.sort(() => 0.5 - Math.random());
        predictedNumbers.push(shuffledNumbers[0], shuffledNumbers[1]);
    } else if (relevantNumbers.length === 1) {
        predictedNumbers.push(relevantNumbers[0]);
    }

    return predictedNumbers;
};

// LogicsMenu Component
const LogicsMenu = forwardRef(
    (
        {
            history,
            onPredictionUpdate,
            onSelectLogic,
            selectedLogic,
            consecutiveLosses,
        },
        ref
    ) => {
        const [isSidebarOpen, setIsSidebarOpen] = useState(false);
        const logics = ["Sequence Logic", "Dynamic Alternating Logic"];

        const generatePrediction = useCallback(() => {
            const recent = history;
            if (recent.length < 2) {
                onPredictionUpdate({
                    size: "",
                    color: "",
                    numbers: [],
                    logic: selectedLogic,
                });
                return;
            }

            let predictedColor = "";
            let predictedSize = "";
            let currentLogic = selectedLogic;
            let predictedNumbers = [];

            if (currentLogic === "Sequence Logic") {
                const { nextColor, nextSize } = sequencePredictorLogic(recent);
                predictedColor = nextColor || "";
                predictedSize = nextSize || "";
            } else if (currentLogic === "Dynamic Alternating Logic") {
                const { nextColor, nextSize } = dynamicAlternatingLogic(recent);
                predictedColor = nextColor || "";
                predictedSize = nextSize || "";
            }

            predictedNumbers = findPredictedNumbers(
                predictedSize,
                predictedColor
            );

            const currentPrediction = {
                size: predictedSize,
                color: predictedColor,
                numbers: predictedNumbers,
                logic: currentLogic,
            };

            onPredictionUpdate(currentPrediction);
        }, [history, selectedLogic, onPredictionUpdate]);

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
