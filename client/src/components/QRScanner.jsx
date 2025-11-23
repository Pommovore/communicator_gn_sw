import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScan, onClose }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
        );

        scanner.render((decodedText) => {
            scanner.clear();
            onScan(decodedText);
        }, (error) => {
            // console.warn(error);
        });

        scannerRef.current = scanner;

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5-qrcode scanner. ", error);
                });
            }
        };
    }, [onScan]);

    return (
        <div className="hologram-box" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'black' }}>
            <div id="reader" style={{ width: '100%' }}></div>
            <button className="sw-btn danger" style={{ width: '100%', marginTop: '20px' }} onClick={onClose}>
                Close Scanner
            </button>
        </div>
    );
};

export default QRScanner;
