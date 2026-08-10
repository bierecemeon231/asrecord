import React, { useState, useEffect } from 'react';
import {
  Video,
  Mic,
  MicOff,
  Volume2,
  Clock,
  Folder,
  HardDrive,
  Play,
  Square,
  Pause,
  Sliders,
  Sparkles,
  Check,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import {
  VideoSettings,
  AudioSettings,
  TimerOption,
  SaveSettings,
  HotkeyConfig,
  AudioSourceOption
} from '../types';

interface RecorderControlsProps {
  activeTab: 'video' | 'audio';
  videoSettings: VideoSettings;
  setVideoSettings: React.Dispatch<React.SetStateAction<VideoSettings>>;
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
  timerOption: TimerOption;
  setTimerOption: React.Dispatch<React.SetStateAction<TimerOption>>;
  saveSettings: SaveSettings;
  setSaveSettings: React.Dispatch<React.SetStateAction<SaveSettings>>;
  hotkeys: HotkeyConfig;
  isRecording: boolean;
  isPaused: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  isDriveAuthenticated: boolean;
  onDriveLogin: () => void;
}

export const RecorderControls: React.FC<RecorderControlsProps> = ({
  activeTab,
  videoSettings,
  setVideoSettings,
  audioSettings,
  setAudioSettings,
  timerOption,
  setTimerOption,
  saveSettings,
  setSaveSettings,
  hotkeys,
  isRecording,
  isPaused,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  isDriveAuthenticated,
  onDriveLogin,
}) => {
  const [micTested, setMicTested] = useState<boolean>(false);
  const [micLevel, setMicLevel] = useState<number>(0);
  const [customMinutes, setCustomMinutes] = useState<number>(5);

  // Test microphone volume level if audio source includes mic
  useEffect(() => {
    let audioCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let animId: number;

    const testMic = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animId = requestAnimationFrame(update);
        };
        update();
        setMicTested(true);
      } catch (err) {
        setMicTested(false);
      }
    };

    if (
      (activeTab === 'video' && (videoSettings.audioSource === 'both' || videoSettings.audioSource === 'mic')) ||
      (activeTab === 'audio' && (audioSettings.source === 'both' || audioSettings.source === 'mic'))
    ) {
      testMic();
    } else {
      setMicLevel(0);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close();
    };
  }, [activeTab, videoSettings.audioSource, audioSettings.source]);

  // Handle directory selection
  const handleSelectFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker();
        setSaveSettings((prev) => ({
          ...prev,
          directoryHandle: handle,
          customPath: `Thư mục chọn: ${handle.name}`,
        }));
      } catch (e) {
        // User cancelled or not supported
      }
    } else {
      const path = prompt('Nhập đường dẫn thư mục lưu trên máy tính (VD: C:\\Recordings):', saveSettings.customPath);
      if (path) {
        setSaveSettings((prev) => ({ ...prev, customPath: path }));
      }
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl backdrop-blur-sm">
      {/* Mode Title & Header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
        <div className="flex items-center space-x-3">
          {activeTab === 'video' ? (
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Video className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Mic className="w-6 h-6" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">
              {activeTab === 'video' ? 'Cấu Hình Ghi Hình Màn Hình (MP4)' : 'Cấu Hình Ghi Âm Tự Động (MP3)'}
            </h2>
            <p className="text-xs text-slate-400">
              {activeTab === 'video'
                ? 'Ghi lại toàn màn hình, cửa sổ ứng dụng hoặc tab trình duyệt kèm âm thanh hệ thống và micro'
                : 'Thu âm cực nét từ Microphone & Âm thanh hệ thống máy tính, tự động xuất file MP3 chất lượng cao'}
            </p>
          </div>
        </div>

        {/* Hotkey hint badge */}
        <div className="hidden lg:flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs text-slate-300">
          <span className="text-slate-400">Phím tắt nhanh:</span>
          <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-600 font-mono text-blue-400 font-bold">
            {hotkeys.startStop}
          </kbd>
          <span className="text-slate-400">(Bắt đầu / Dừng)</span>
        </div>
      </div>

      {/* Grid Configuration Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 1. Quality / Audio Format Options */}
        {activeTab === 'video' ? (
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Chất Lượng Video</span>
              <span className="text-blue-400 font-mono">{videoSettings.quality} ({videoSettings.fps} FPS)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['1080p', '720p', '480p'] as const).map((q) => (
                <button
                  key={q}
                  id={`quality-btn-${q}`}
                  onClick={() => setVideoSettings((prev) => ({ ...prev, quality: q }))}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    videoSettings.quality === q
                      ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {q === '1080p' ? '1080p FHD' : q === '720p' ? '720p HD' : '480p SD'}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">Tốc độ khung hình (FPS):</span>
              <div className="flex space-x-2">
                {([30, 60] as const).map((fps) => (
                  <button
                    key={fps}
                    onClick={() => setVideoSettings((prev) => ({ ...prev, fps }))}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      videoSettings.fps === fps
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 font-bold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Định Dạng Đầu Ra</span>
              <span className="text-purple-400 font-bold uppercase">{audioSettings.format}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['mp3', 'wav'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setAudioSettings((prev) => ({ ...prev, format: fmt }))}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                    audioSettings.format === fmt
                      ? 'bg-purple-600 border-purple-400 text-white shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {fmt === 'mp3' ? 'MP3 (Phổ biến)' : 'WAV (Gốc)'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              {audioSettings.format === 'mp3'
                ? 'Xuất file MP3 nén chất lượng cao 192kbps, tương thích mọi thiết bị'
                : 'Xuất file WAV nguyên bản không nén chất lượng phòng thu'}
            </p>
          </div>
        )}

        {/* 2. Audio Source & Microphone Toggle */}
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Nguồn Âm Thanh</span>
            <Volume2 className="w-4 h-4 text-slate-400" />
          </label>

          {activeTab === 'video' ? (
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'both', label: 'Hệ thống + Mic' },
                { id: 'system', label: 'Chỉ Hệ thống' },
                { id: 'mic', label: 'Chỉ Micro' },
                { id: 'none', label: 'Tắt Âm Thanh' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() =>
                    setVideoSettings((prev) => ({ ...prev, audioSource: opt.id as AudioSourceOption }))
                  }
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all text-left truncate ${
                    videoSettings.audioSource === opt.id
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'both', label: 'Cả Hai' },
                { id: 'system', label: 'Hệ Thống' },
                { id: 'mic', label: 'Micro' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() =>
                    setAudioSettings((prev) => ({ ...prev, source: opt.id as any }))
                  }
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-all text-center ${
                    audioSettings.source === opt.id
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Mic Level indicator */}
          {micTested && (
            <div className="pt-1">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Tín hiệu Micro:</span>
                <span className="font-mono text-emerald-400">{micLevel}%</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Timer & Auto-stop Settings */}
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-3">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" /> Hẹn Giờ Dừng Tự Động
            </span>
            <input
              type="checkbox"
              checked={timerOption.enabled}
              onChange={(e) => setTimerOption((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-700 border-slate-600 cursor-pointer"
            />
          </label>

          {timerOption.enabled ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { sec: 15, label: '15 Giây' },
                  { sec: 30, label: '30 Giây' },
                  { sec: 60, label: '1 Phút' },
                  { sec: 300, label: '5 Phút' },
                  { sec: 600, label: '10 Phút' },
                  { sec: 1800, label: '30 Phút' },
                ].map((opt) => (
                  <button
                    key={opt.sec}
                    onClick={() => setTimerOption((prev) => ({ ...prev, durationSeconds: opt.sec }))}
                    className={`py-1 px-1.5 rounded text-[11px] font-medium border transition-all ${
                      timerOption.durationSeconds === opt.sec
                        ? 'bg-amber-600 border-amber-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom Minutes Input */}
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-xs text-slate-400">Tùy chỉnh:</span>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={Math.round(timerOption.durationSeconds / 60) || 1}
                  onChange={(e) => {
                    const mins = Math.max(1, parseInt(e.target.value) || 1);
                    setTimerOption((prev) => ({ ...prev, durationSeconds: mins * 60 }));
                  }}
                  className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white text-center focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400">phút ({timerOption.durationSeconds}s)</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 pt-2 italic">
              Đang tắt hẹn giờ. Bạn có thể tự dừng bất kỳ lúc nào bằng nút Dừng hoặc phím tắt {hotkeys.startStop}.
            </p>
          )}
        </div>
      </div>

      {/* Storage Location & Google Drive Options Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800 mb-8">
        {/* Save Location picker */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Vị Trí Lưu File Máy Tính</p>
              <p className="text-xs text-slate-400 truncate max-w-[240px] sm:max-w-[320px]">
                {saveSettings.customPath}
              </p>
            </div>
          </div>
          <button
            id="btn-choose-folder"
            onClick={handleSelectFolder}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            Đổi Thư Mục
          </button>
        </div>

        {/* Google Drive Auto Upload switch */}
        <div className="flex items-center justify-between border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                Tải Lên Google Drive Tự Động
                {isDriveAuthenticated && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-semibold">
                    Đã Xác Thực
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-400">
                {isDriveAuthenticated
                  ? 'Tự động gửi file lên Google Drive ngay sau khi kết thúc ghi'
                  : 'Yêu cầu đăng nhập Google OAuth 2.0 (chỉ xác thực 1 lần)'}
              </p>
            </div>
          </div>

          {isDriveAuthenticated ? (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={saveSettings.autoUploadDrive}
                onChange={(e) =>
                  setSaveSettings((prev) => ({ ...prev, autoUploadDrive: e.target.checked }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          ) : (
            <button
              id="btn-drive-login-controls"
              onClick={onDriveLogin}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
            >
              Đăng Nhập Drive
            </button>
          )}
        </div>
      </div>

      {/* Main Big Record Button Section */}
      <div className="flex flex-col items-center justify-center space-y-4 pt-2">
        {!isRecording ? (
          <button
            id="btn-start-recording"
            onClick={onStartRecording}
            className="group relative flex items-center space-x-3 px-10 py-5 bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-rose-600/30 hover:shadow-rose-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="w-5 h-5 bg-white rounded-full flex items-center justify-center animate-pulse">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full" />
            </span>
            <span>{activeTab === 'video' ? 'BẮT ĐẦU GHI MÀN HÌNH' : 'BẮT ĐẦU GHI ÂM (MP3)'}</span>
            <span className="ml-2 text-xs font-mono bg-black/30 px-2 py-0.5 rounded border border-white/20">
              {hotkeys.startStop}
            </span>
          </button>
        ) : (
          <div className="flex items-center space-x-4">
            {isPaused ? (
              <button
                id="btn-resume-recording"
                onClick={onResumeRecording}
                className="flex items-center space-x-2 px-6 py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm shadow-lg transition-all"
              >
                <Play className="w-5 h-5" />
                <span>Tiếp Tục ({hotkeys.pauseResume})</span>
              </button>
            ) : (
              <button
                id="btn-pause-recording"
                onClick={onPauseRecording}
                className="flex items-center space-x-2 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-sm shadow-lg transition-all"
              >
                <Pause className="w-5 h-5" />
                <span>Tạm Dừng ({hotkeys.pauseResume})</span>
              </button>
            )}

            <button
              id="btn-stop-recording"
              onClick={onStopRecording}
              className="flex items-center space-x-2 px-8 py-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm shadow-xl transition-all"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>DỪNG & LƯU FILE ({hotkeys.startStop})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
