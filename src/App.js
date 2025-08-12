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
import OneMinWingo from "./components/1MinWingo/OneMin_Wingo";
import Tournament from "./components/Tournament/Tournament";

function App() {
    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/oneminwingo" element={<OneMinWingo />} />
                    <Route path="/tournament" element={<Tournament />} />
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
