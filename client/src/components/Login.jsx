import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);
    const { login } = useContext(AuthContext);

    const playErrorSound = () => {
        // Simple beep using AudioContext
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); // Low pitch
        oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(false);

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                const data = await res.json();
                login(data.token, data.user);
            } else {
                throw new Error('Login failed');
            }
        } catch (err) {
            setError(true);
            playErrorSound();
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column'
        }}>
            <div className="hologram-box" style={{ width: '300px', textAlign: 'center' }}>
                <h2 className="hologram-text flicker">Identity Check</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="sw-input"
                        placeholder="Identity Code"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                    <input
                        type="password"
                        className="sw-input"
                        placeholder="Passcode"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button type="submit" className="sw-btn" style={{ width: '100%' }}>
                        Authenticate
                    </button>
                </form>
                {error && (
                    <div style={{ color: 'var(--sw-red)', marginTop: '10px', textTransform: 'uppercase' }} className="flicker">
                        Access Denied
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
