import React, { useEffect, useRef, useState } from 'react';
import {
  Pause,
  Play,
  Square,
  Mic,
  MicOff,
  Camera,
  Volume2,
  Clock,
  Radio,
  CheckCircle,
  HardDrive
} from 'lucide-react';
import { TimerOption } from '../types';

interface ActiveRecordingOverlayProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingType: 'video' | 'audio';
  secondsElapsed: number;
  timerOption: TimerOption;
  audioStream: MediaStream | null;
  micMuted: boolean;
  onToggleMic: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onTakeScreenshot?: () => void;
  toastMessage?: string | null;
  autoUploadDrive: boolean;
}

export const ActiveRecordingOverlay: React.FC<ActiveRecordingOverlayProps> = ({
  isRecording,
  isPaused,
  recordingType,
  secondsElapsed,
  timerOption,
  audioStream,
  micMuted,
  onToggleMic,
  onPause,
  onResume,
  onStop,
  onTakeScreenshot,
  toastMessage,
  autoUploadDrive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Format HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio Canvas visualizer
  useEffect(() => {
    if (!audioStream || !isRecording || isPaused) return;

    let audioCtx: AudioContext | null = null;
    let animId: number;

    try {
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(audioStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        setAudioLevel(Math.min(100, Math.round((sum / bufferLength / 128) * 100)));

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / bufferLength) * 1.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
              const barHeight = (dataArray[i] / 255) * canvas.height;
              const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
              gradient.addColorStop(0, '#3b82f6');
              gradient.addColorStop(1, '#10b981');

              ctx.fillStyle = gradient;
              ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
              x += barWidth;
            }
          }
        }

        animId = requestAnimationFrame(draw);
      };

      draw();
    } catch (e) {
      console.warn('Audio visualizer init error:', e);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioCtx) audioCtx.close();
    };
  }, [audioStream, isRecording, isPaused]);

  if (!isRecording) return null;

  // Timer countdown calculations
  const remainingSeconds = timerOption.enabled
    ? Math.max(0, timerOption.durationSeconds - secondsElapsed)
    : 0;
  const timerProgress = timerOption.enabled
    ? Math.min(100, (secondsElapsed / timerOption.durationSeconds) * 100)
    : 0;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-3 pointer-events-auto">
      {/* Toast popup */}
      {toastMessage && (
        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl border border-blue-500/50 shadow-2xl flex items-center space-x-2 animate-bounce text-xs font-semibold">
          <Radio className="w-4 h-4 text-blue-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Widget Box */}
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-white backdrop-blur-md min-w-[320px] max-w-md ring-1 ring-white/10">
        {/* Top bar with record dot & mode */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {isPaused ? 'ĐÃ TẠM DỪNG' : recordingType === 'video' ? 'ĐANG GHI MÀN HÌNH' : 'ĐANG GHI ÂM (MP3)'}
            </span>
          </div>

          {autoUploadDrive && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 font-semibold">
              <HardDrive className="w-3 h-3" /> Auto Drive
            </span>
          )}
        </div>

        {/* Live Timer Display */}
        <div className="py-3 flex items-center justify-between">
          <div>
            <p className="text-3xl font-mono font-bold tracking-tight text-white drop-shadow">
              {formatTime(secondsElapsed)}
            </p>
            {timerOption.enabled && (
              <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> Hẹn giờ còn: {formatTime(remainingSeconds)}
              </p>
            )}
          </div>

          {/* Canvas VU Meter / Waveform */}
          <div className="flex flex-col items-end">
            <canvas ref={canvasRef} width={80} height={32} className="rounded bg-slate-950/80 p-0.5" />
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">Vol: {audioLevel}%</span>
          </div>
        </div>

        {/* Progress bar if Timer active */}
        {timerOption.enabled && (
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-amber-500 h-full transition-all duration-300"
              style={{ width: `${timerProgress}%` }}
            />
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-between pt-1 gap-2">
          {/* Pause / Resume */}
          {isPaused ? (
            <button
              id="overlay-btn-resume"
              onClick={onResume}
              className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Tiếp Tục</span>
            </button>
          ) : (
            <button
              id="overlay-btn-pause"
              onClick={onPause}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Pause className="w-4 h-4" />
              <span>Tạm Dừng</span>
            </button>
          )}

          {/* Toggle Mic */}
          <button
            id="overlay-btn-mic"
            onClick={onToggleMic}
            className={`p-2 rounded-xl text-xs font-bold border transition-colors ${
              micMuted
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={micMuted ? 'Bật Micro' : 'Tắt Micro'}
          >
            {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Screenshot (if video) */}
          {recordingType === 'video' && onTakeScreenshot && (
            <button
              id="overlay-btn-screenshot"
              onClick={onTakeScreenshot}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-colors"
              title="Chụp ảnh màn hình"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}

          {/* Stop & Save */}
          <button
            id="overlay-btn-stop"
            onClick={onStop}
            className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg transition-colors"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Dừng & Lưu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
