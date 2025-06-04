// src/App.jsx - This is correct for your current goal
import React from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Register from "./components/RegisterForm";
import Login from "./components/LoginForm";
import OneMinWingo from "./components/Wingo/OneMinWingo";
import CoinWave from "./components/Coinwin/CoinWave";

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    {/* This route is correctly defined */}
                    <Route path="/OneMinWingo" element={<OneMinWingo />} />
                    <Route path="/CoinWave" element={<CoinWave />} />

                    <Route
                        path="*"
                        element={<Navigate to="/login" replace />}
                    />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
