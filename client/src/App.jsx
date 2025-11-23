import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import io from 'socket.io-client';

export const AuthContext = React.createContext(null);
export const SocketContext = React.createContext(null);

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (token) {
            // Verify token and get user data (simplified)
            fetch('/api/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Invalid token');
                })
                .then(userData => {
                    setUser(userData);
                    const newSocket = io('/', {
                        auth: { token }
                    });
                    setSocket(newSocket);
                    newSocket.emit('join', userData.id);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    setToken(null);
                });
        }
    }, [token]);

    const login = (newToken, userData) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        if (socket) socket.disconnect();
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, token }}>
            <SocketContext.Provider value={socket}>
                <Router>
                    <div className="app-container">
                        <Routes>
                            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
                        </Routes>
                    </div>
                </Router>
            </SocketContext.Provider>
        </AuthContext.Provider>
    );
}

export default App;
