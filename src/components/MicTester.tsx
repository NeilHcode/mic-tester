import React, { useRef, useState } from "react";

export default function MicTester() {
  const [isRec, setIsRec] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafWaveRef = useRef<number | null>(null);
  const rafTickRef = useRef<number | null>(null);
  const startTsRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const btnStyle: React.CSSProperties = {
    padding: "10px 16px",
    borderRadius: 8,
    background: "#16a34a",
    color: "white",
    border: "none",
    cursor: "pointer",
  };
  const stopBtnStyle: React.CSSProperties = { ...btnStyle, background: "#dc2626" };

  async function start() {

    if (isRec) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    streamRef.current = stream;

    const actx = new AudioContext();
    audioCtxRef.current = actx;
    const src = actx.createMediaStreamSource(stream);
    const analyser = actx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    analyserRef.current = analyser;

    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioUrl(URL.createObjectURL(blob));
      cleanupStream();
    };
    mrRef.current = mr;

    startTsRef.current = performance.now();
    setElapsed(0);
    setIsRec(true);

    mr.start();

    drawWave();
    runTimer();
  }

  function runTimer() {
    const loop = () => {
      const ms = performance.now() - startTsRef.current;
      setElapsed(ms);
      if (ms >= 10_000) {
        stop();
        return;
      }
      rafTickRef.current = requestAnimationFrame(loop);
    };
    rafTickRef.current = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafTickRef.current) {
      cancelAnimationFrame(rafTickRef.current);
      rafTickRef.current = null;
    }
    if (rafWaveRef.current) {
      cancelAnimationFrame(rafWaveRef.current);
      rafWaveRef.current = null;
    }
    if (mrRef.current && mrRef.current.state !== "inactive") {
      mrRef.current.stop();
    }
    setIsRec(false);
  }

  function cleanupStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }

  function drawWave() {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const ctx2d = canvas.getContext("2d")!;
    const buffer = new Uint8Array(analyser.fftSize);

    const render = () => {
      analyser.getByteTimeDomainData(buffer);
      const { width, height } = canvas;
      ctx2d.clearRect(0, 0, width, height);
      ctx2d.fillStyle = "#0b1020";
      ctx2d.fillRect(0, 0, width, height);
      ctx2d.strokeStyle = "#22d3ee";
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      for (let i = 0; i < buffer.length; i++) {
        const x = (i / (buffer.length - 1)) * width;
        const y = (buffer[i] / 255) * height;
        i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();
      rafWaveRef.current = requestAnimationFrame(render);
    };
    render();
  }

  return (
    <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", color: "#e5e7eb" }}>
      <h2 style={{ marginBottom: 12, textAlign: "center" }}>Microphone Test</h2>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <canvas
          ref={canvasRef}
          width={700}
          height={200}
          style={{
            width: "100%",
            maxWidth: 700,
            background: "#0b1020",
            borderRadius: 12,
            boxShadow: "0 0 0 1px #1f2937 inset",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!isRec ? (
          <button style={btnStyle} onClick={start}>
            Start (max 10s)
          </button>
        ) : (
          <button style={stopBtnStyle} onClick={stop}>
            Stop
          </button>
        )}
        <span>{(Math.min(10_000, elapsed) / 1000).toFixed(1)} s</span>
      </div>

      {audioUrl && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <audio controls src={audioUrl} style={{ width: "100%", maxWidth: 700 }} />
          <a href={audioUrl} download="mic-test.webm" style={{ marginTop: 6 }}>
            Download recording
          </a>
        </div>
      )}

      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8, textAlign: "center" }}>
        Tip: use headphones to avoid feedback. Chrome/Edge recommended.
      </p>
    </div>
  );
}
