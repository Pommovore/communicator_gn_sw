import React, { useRef, useState, useEffect } from 'react';

const CameraCapture = ({ onCapture, onCancel, mode = 'video' }) => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [recording, setRecording] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [isReviewing, setIsReviewing] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [isPlayingReview, setIsPlayingReview] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    useEffect(() => {
        const startStream = async () => {
            try {
                const constraints = {
                    video: mode !== 'audio',
                    audio: true
                };
                const s = await navigator.mediaDevices.getUserMedia(constraints);
                setStream(s);
                if (videoRef.current && mode !== 'audio') {
                    videoRef.current.srcObject = s;
                }
            } catch (err) {
                console.error("Error accessing media devices:", err);
                alert("Could not access camera/microphone. Please ensure permissions are granted.");
                onCancel();
            }
        };
        startStream();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [mode]);

    const startRecordingProcess = () => {
        setCountdown(3);
        let count = 3;
        const timer = setInterval(() => {
            count--;
            setCountdown(count);
            if (count === 0) {
                clearInterval(timer);
                if (mode === 'image') {
                    takePhoto();
                } else {
                    startRecording();
                }
            }
        }, 1000);
    };

    const startRecording = () => {
        chunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: mode === 'video' ? 'video/webm' : 'audio/webm' });
            setRecordedBlob(blob);
            setIsReviewing(true);
            setRecording(false);
        };

        recorder.start();
        setRecording(true);

        if (mode === 'video') {
            // Limit to 5 seconds for video
            setTimeout(() => {
                if (recorder.state === 'recording') {
                    recorder.stop();
                }
            }, 5000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const takePhoto = () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        canvas.toBlob(blob => {
            setRecordedBlob(blob);
            setIsReviewing(true);
        }, 'image/png');
    };

    const handleSend = () => {
        if (!recordedBlob) return;
        const ext = mode === 'image' ? 'png' : 'webm';
        const type = mode === 'image' ? 'image/png' : (mode === 'video' ? 'video/webm' : 'audio/webm');
        const file = new File([recordedBlob], `capture.${ext}`, { type });
        onCapture(file, mode);
    };

    const handleRetake = () => {
        setRecordedBlob(null);
        setIsReviewing(false);
        setCountdown(0);
        setIsPlayingReview(false);
    };

    if (isReviewing && recordedBlob) {
        const url = URL.createObjectURL(recordedBlob);
        return (
            <div className="hologram-box" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'black' }}>
                <h3 className="hologram-text" style={{ textAlign: 'center', margin: '10px 0' }}>REVIEW TRANSMISSION</h3>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', background: '#000' }}>
                    {mode === 'image' && <img src={url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />}
                    {mode === 'video' && (
                        <video
                            src={url}
                            controls={isPlayingReview}
                            autoPlay={isPlayingReview}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                    )}
                    {mode === 'audio' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            <div className="hologram-text" style={{ fontSize: '2rem' }}>AUDIO RECORDED</div>
                            {isPlayingReview && <audio src={url} controls autoPlay />}
                        </div>
                    )}
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(mode === 'video' || mode === 'audio') && !isPlayingReview && (
                        <button className="sw-btn" onClick={() => setIsPlayingReview(true)}>REVOIR {mode === 'video' ? 'LA VIDÉO' : "L'AUDIO"}</button>
                    )}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="sw-btn danger" style={{ flex: 1 }} onClick={handleRetake}>ANNULER</button>
                        <button className="sw-btn" style={{ flex: 1 }} onClick={handleSend}>ENVOYER</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="hologram-box" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'black' }}>
            {countdown > 0 && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, background: 'rgba(0,0,0,0.5)' }}>
                    <div className="hologram-text" style={{ fontSize: '10rem' }}>{countdown}</div>
                </div>
            )}

            {mode !== 'audio' && (
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', flex: 1, objectFit: 'cover' }} />
            )}
            {mode === 'audio' && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="flicker" style={{ fontSize: '3rem', color: 'var(--sw-blue)' }}>
                        {recording ? 'RECORDING...' : 'READY TO RECORD'}
                    </div>
                </div>
            )}

            <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-around' }}>
                <button className="sw-btn danger" onClick={onCancel} disabled={recording}>Cancel</button>

                {!recording && (
                    <button className="sw-btn" onClick={startRecordingProcess}>
                        {mode === 'image' ? 'SNAP' : 'REC'}
                    </button>
                )}

                {recording && mode === 'audio' && (
                    <button className="sw-btn danger" onClick={stopRecording}>STOP</button>
                )}
                {/* Video stops automatically after 5s, no manual stop needed per spec, but good to have just in case? Spec says "Ensuite elle lancera l’enregistrement de la vidéo de 5 secondes." implying fixed duration. */}
            </div>
        </div>
    );
};

export default CameraCapture;
