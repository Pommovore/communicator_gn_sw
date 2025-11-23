import React, { useContext, useState, useEffect } from 'react';
import { AuthContext, SocketContext } from '../App';
import CameraCapture from './CameraCapture';
import QRScanner from './QRScanner';
import AdminPanel from './AdminPanel';
import QRCode from 'qrcode'; // We need to install this package too!

const Dashboard = () => {
    const { user, logout, token } = useContext(AuthContext);
    const socket = useContext(SocketContext);

    const [contacts, setContacts] = useState([]);
    const [documents, setDocuments] = useState([]);
    const [view, setView] = useState('main'); // main, camera, scanner, admin, text
    const [captureMode, setCaptureMode] = useState('video');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [selectedContact, setSelectedContact] = useState(null);
    const [incomingDoc, setIncomingDoc] = useState(null);
    const [textMessage, setTextMessage] = useState('');
    const [objectQrText, setObjectQrText] = useState('');
    const [docQrData, setDocQrData] = useState(null);
    const [viewingText, setViewingText] = useState(null);

    const formatTimestamp = (filename) => {
        try {
            const match = filename.match(/(\d{8})_(\d{4})\./);
            if (match) {
                const dateStr = match[1];
                const timeStr = match[2];
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                const hour = timeStr.substring(0, 2);
                const minute = timeStr.substring(2, 4);
                return `${day}/${month}/${year} ${hour}:${minute}`;
            }
        } catch (e) { return ''; }
        return '';
    };

    const viewTextFile = async (filename) => {
        try {
            const res = await fetch(`/uploads/${filename}`);
            const text = await res.text();
            setViewingText(text);
            setView('view_text');
        } catch (err) {
            console.error(err);
            alert('Failed to load text file');
        }
    };

    useEffect(() => {
        // Load initial data
        fetchContacts();
        fetchDocuments();
        generateQr();

        if (socket) {
            socket.on('receive_message', (msg) => {
                // If it's a document push
                if (msg.documentId) {
                    setIncomingDoc(msg);
                    // Play notification sound
                    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'); // Placeholder
                    audio.play().catch(e => console.log('Audio play failed', e));
                }
            });

            // Listen for new contact additions
            socket.on('contact_added', (data) => {
                // Add the new contact to the list
                setContacts(prev => [...prev, data.contact]);
                // Play notification sound
                const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
                audio.play().catch(e => console.log('Audio play failed', e));
            });
        }

        return () => {
            if (socket) {
                socket.off('receive_message');
                socket.off('contact_added');
            }
        };
    }, [socket]);

    const fetchContacts = async () => {
        const res = await fetch('/api/contacts', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setContacts(await res.json());
    };

    const fetchDocuments = async () => {
        const res = await fetch('/api/documents', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setDocuments(await res.json());
    };

    const generateQr = async () => {
        try {
            const url = await QRCode.toDataURL(user.qr_code);
            setQrDataUrl(url);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCapture = async (file, type) => {
        // Upload file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        if (selectedContact) {
            formData.append('recipientId', selectedContact.id);
        }

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                // If we selected a contact, send it
                if (selectedContact) {
                    socket.emit('send_message', {
                        to: selectedContact.id,
                        from: user.id,
                        type: type,
                        content: 'New Document',
                        documentId: data.id
                    });
                    alert('Sent!');
                } else {
                    alert('Saved to library');
                }
                fetchDocuments();
            }
        } catch (err) {
            console.error(err);
            alert('Upload failed');
        }
        setView('main');
        setSelectedContact(null);
        setTextMessage('');
    };

    const handleTextSend = () => {
        if (!textMessage) return;
        const file = new File([textMessage], "message.txt", { type: "text/plain" });
        handleCapture(file, 'text');
    };

    const handleScan = async (data) => {
        setView('main');
        // Check if it's a contact or just text
        try {
            const res = await fetch('/api/contacts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ qr_code: data })
            });
            if (res.ok) {
                alert('Contact Added!');
                fetchContacts();
            } else {
                // If not a user, maybe just show it?
                alert(`Scanned: ${data}`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const generateObjectQr = async () => {
        if (!objectQrText) return;
        try {
            const url = await QRCode.toDataURL(objectQrText);
            setQrDataUrl(url); // Re-use the main QR display for now or create a new one? 
            // Let's create a temporary view for it
            setDocQrData(url);
            setView('show_qr');
        } catch (err) { console.error(err); }
    };

    const showDocumentQr = async (docId) => {
        try {
            const url = await QRCode.toDataURL(docId);
            setDocQrData(url);
            setView('show_qr');
        } catch (err) { console.error(err); }
    };

    const startCapture = (mode, contact = null) => {
        setSelectedContact(contact);
        if (mode === 'text') {
            setView('text');
        } else {
            setCaptureMode(mode);
            setView('camera');
        }
    };

    return (
        <div style={{ padding: '10px', height: '100vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="hologram-text">{user.username} [{user.role}]</h3>
                <button className="sw-btn danger" onClick={logout}>LOGOUT</button>
            </div>

            {incomingDoc && (
                <div className="alert-overlay">
                    <div className="alert-box">
                        <h3>INCOMING TRANSMISSION</h3>
                        <p>From: {incomingDoc.from}</p>
                        <p>Type: {incomingDoc.type}</p>
                        <button className="sw-btn" onClick={() => {
                            fetchDocuments();
                            setIncomingDoc(null);
                        }}>ACCEPT</button>
                        <button className="sw-btn danger" onClick={() => setIncomingDoc(null)}>IGNORE</button>
                    </div>
                </div>
            )}

            {/* Identity Card */}
            <div className="hologram-box" style={{ marginBottom: '20px', textAlign: 'center' }}>
                <img src={qrDataUrl} alt="ID QR" style={{ width: '150px', border: '2px solid var(--sw-blue)' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--sw-blue)' }}>{user.qr_code}</p>
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                <button className="sw-btn" onClick={() => setView('scanner')}>SCAN QR</button>
                <button className="sw-btn" onClick={() => setView('object_qr')}>GEN OBJECT QR</button>
                {(user.role === 'ADMIN' || user.role === 'OPERATOR') && (
                    <button className="sw-btn" style={{ gridColumn: 'span 2' }} onClick={() => setView('admin')}>ADMIN PANEL</button>
                )}
            </div>

            {/* Contacts */}
            <div className="hologram-box" style={{ marginBottom: '20px' }}>
                <h4 className="hologram-text">CONTACTS</h4>
                {contacts.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', padding: '5px' }}>
                        <span>{c.username}</span>
                        <div>
                            <button className="sw-btn" style={{ padding: '5px' }} onClick={() => startCapture('text', c)}>TXT</button>
                            <button className="sw-btn" style={{ padding: '5px' }} onClick={() => startCapture('video', c)}>VID</button>
                            <button className="sw-btn" style={{ padding: '5px' }} onClick={() => startCapture('audio', c)}>AUD</button>
                            <button className="sw-btn" style={{ padding: '5px' }} onClick={() => startCapture('image', c)}>IMG</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Documents */}
            <div className="hologram-box">
                <h4 className="hologram-text">DATABANKS</h4>
                {documents.map(d => (
                    <div key={d.id} style={{ marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ color: 'var(--sw-yellow)' }}>
                                {d.filename} <br />
                                <span style={{ fontSize: '0.8em', color: '#aaa' }}>{formatTimestamp(d.filename)}</span>
                            </div>
                            <button className="sw-btn" style={{ padding: '2px 5px', fontSize: '0.8em' }} onClick={() => showDocumentQr(d.id)}>QR</button>
                        </div>
                        {d.type === 'image' && <img src={`/uploads/${d.filename}`} style={{ maxWidth: '100%', marginTop: '5px' }} />}
                        {d.type === 'video' && <video src={`/uploads/${d.filename}`} controls style={{ maxWidth: '100%', marginTop: '5px' }} />}
                        {d.type === 'audio' && <audio src={`/uploads/${d.filename}`} controls style={{ marginTop: '5px', width: '100%' }} />}
                        {d.type === 'text' && (
                            <div style={{ background: '#111', padding: '5px', marginTop: '5px', border: '1px solid #333' }}>
                                <button className="sw-btn" style={{ padding: '5px', fontSize: '0.9em' }} onClick={() => viewTextFile(d.filename)}>VIEW TEXT</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {view === 'camera' && (
                <CameraCapture
                    mode={captureMode}
                    onCancel={() => setView('main')}
                    onCapture={handleCapture}
                />
            )}

            {view === 'scanner' && (
                <QRScanner
                    onClose={() => setView('main')}
                    onScan={handleScan}
                />
            )}

            {view === 'admin' && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'black' }}>
                    <AdminPanel onBack={() => setView('main')} />
                </div>
            )}

            {view === 'text' && (
                <div className="hologram-box" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'black', display: 'flex', flexDirection: 'column' }}>
                    <h3 className="hologram-text">SEND TEXT MESSAGE</h3>
                    <textarea
                        className="sw-input"
                        style={{ flex: 1, resize: 'none' }}
                        value={textMessage}
                        onChange={e => setTextMessage(e.target.value)}
                        placeholder="Enter your message..."
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button className="sw-btn danger" style={{ flex: 1 }} onClick={() => { setView('main'); setTextMessage(''); }}>CANCEL</button>
                        <button className="sw-btn" style={{ flex: 1 }} onClick={handleTextSend}>SEND</button>
                    </div>
                </div>
            )}

            {view === 'object_qr' && (
                <div className="hologram-box" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'black', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 className="hologram-text">GENERATE OBJECT QR</h3>
                    <input
                        className="sw-input"
                        value={objectQrText}
                        onChange={e => setObjectQrText(e.target.value)}
                        placeholder="Enter Object Name/ID"
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button className="sw-btn danger" style={{ flex: 1 }} onClick={() => setView('main')}>CANCEL</button>
                        <button className="sw-btn" style={{ flex: 1 }} onClick={generateObjectQr}>GENERATE</button>
                    </div>
                </div>
            )}

            {view === 'show_qr' && (
                <div className="hologram-box" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 className="hologram-text">QR CODE</h3>
                    <img src={docQrData} alt="QR" style={{ width: '250px', border: '2px solid var(--sw-blue)' }} />
                    <button className="sw-btn" style={{ marginTop: '20px', width: '200px' }} onClick={() => setView('main')}>CLOSE</button>
                </div>
            )}

            {view === 'view_text' && (
                <div className="hologram-box" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'black', display: 'flex', flexDirection: 'column', padding: '20px' }}>
                    <h3 className="hologram-text">TEXT TRANSMISSION</h3>
                    <div style={{ flex: 1, overflow: 'auto', background: '#111', border: '1px solid var(--sw-blue)', padding: '15px', marginTop: '10px', marginBottom: '10px', color: 'var(--sw-blue)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {viewingText}
                    </div>
                    <button className="sw-btn" onClick={() => { setView('main'); setViewingText(null); }}>RETOUR</button>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
