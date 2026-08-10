import React, { useState, useEffect, useRef } from 'react';
import {
  Navbar
} from './components/Navbar';
import {
  RecorderControls
} from './components/RecorderControls';
import {
  ActiveRecordingOverlay
} from './components/ActiveRecordingOverlay';
import {
  RecordingsLibrary
} from './components/RecordingsLibrary';
import {
  SettingsModal
} from './components/SettingsModal';
import {
  HotkeyListener
} from './components/HotkeyListener';
import {
  VideoSettings,
  AudioSettings,
  TimerOption,
  SaveSettings,
  HotkeyConfig,
  RecordingItem,
  UserAuth
} from './types';
import { initAuth, googleSignIn, logout, getAccessToken } from './lib/firebase';
import { encodeAudioBufferToMp3, encodeAudioBufferToWav } from './lib/mp3Encoder';
import { uploadToDrive } from './lib/driveService';
import {
  Monitor,
  Video,
  Mic,
  FolderDown,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Info
} from 'lucide-react';

export default function App() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'library'>('video');

  // Auth State
  const [auth, setAuth] = useState<UserAuth>({
    user: null,
    accessToken: null,
    loading: true,
  });

  // System Settings State
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    quality: '1080p',
    fps: 60,
    bitrate: 'high',
    audioSource: 'both',
  });

  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    format: 'mp3',
    source: 'both',
    bitrate: 192,
  });

  const [timerOption, setTimerOption] = useState<TimerOption>({
    enabled: false,
    durationSeconds: 60,
  });

  const [saveSettings, setSaveSettings] = useState<SaveSettings>({
    customPath: 'C:\\Users\\Public\\Recordings',
    directoryHandle: null,
    autoDownload: true,
    autoUploadDrive: true,
    driveFolderName: 'Ghi hinh',
  });

  const [hotkeys, setHotkeys] = useState<HotkeyConfig>({
    startStop: 'Alt+R',
    pauseResume: 'Alt+P',
    toggleMic: 'Alt+M',
    screenshot: 'Alt+S',
  });

  // Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [recordingType, setRecordingType] = useState<'video' | 'audio'>('video');
  const [micMuted, setMicMuted] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Saved Recordings List
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);

  // Refs for media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Segment timer and options refs
  const segmentStartTimeRef = useRef<Date>(new Date());
  const chunkSecondsElapsedRef = useRef<number>(0);
  const recordingTypeRef = useRef<'video' | 'audio'>('video');

  const authRef = useRef<UserAuth>(auth);
  const saveSettingsRef = useRef<SaveSettings>(saveSettings);
  const videoSettingsRef = useRef<VideoSettings>(videoSettings);
  const audioSettingsRef = useRef<AudioSettings>(audioSettings);

  useEffect(() => { authRef.current = auth; }, [auth]);
  useEffect(() => { saveSettingsRef.current = saveSettings; }, [saveSettings]);
  useEffect(() => { videoSettingsRef.current = videoSettings; }, [videoSettings]);
  useEffect(() => { audioSettingsRef.current = audioSettings; }, [audioSettings]);

  // Audio Buffer recorder for MP3 encoding
  const audioChunksForMp3Ref = useRef<Float32Array[]>([]);

  // Initialize Firebase OAuth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAuth({ user, accessToken: token, loading: false });
      },
      () => {
        setAuth({ user: null, accessToken: null, loading: false });
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle Google OAuth Sign in
  const handleDriveLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setAuth({ user: res.user, accessToken: res.accessToken, loading: false });
        showToast('Đã đăng nhập Google Drive thành công!');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      alert('Đăng nhập Google thất bại: ' + (err.message || 'Lỗi xác thực'));
    }
  };

  const handleDriveLogout = async () => {
    await logout();
    setAuth({ user: null, accessToken: null, loading: false });
    showToast('Đã đăng xuất tài khoản Google');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Process & save 15-minute chunk segment or final segment
  const saveChunkSegment = async (isFinalStop: boolean = false) => {
    if (!mediaRecorderRef.current) return;

    const segmentStart = new Date(segmentStartTimeRef.current);
    const chunkDuration = chunkSecondsElapsedRef.current || 1;

    if (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.requestData();
    }

    // Reset chunk timer and set new start time for continuous recording segment
    chunkSecondsElapsedRef.current = 0;
    segmentStartTimeRef.current = new Date();

    setTimeout(async () => {
      const chunksToProcess = [...recordedChunksRef.current];
      recordedChunksRef.current = []; // Clear buffer for next segment

      if (chunksToProcess.length === 0) return;

      const currentType = recordingTypeRef.current;
      const currentSaveSettings = saveSettingsRef.current;
      const currentVideoSettings = videoSettingsRef.current;
      const currentAudioSettings = audioSettingsRef.current;
      const currentAuth = authRef.current;

      let finalBlob: Blob;
      let fileExt = currentType === 'video' ? 'mp4' : currentAudioSettings.format;

      // Format filename as YYYY.MM.DD HH:MM:SS
      const pad = (n: number) => String(n).padStart(2, '0');
      const y = segmentStart.getFullYear();
      const m = pad(segmentStart.getMonth() + 1);
      const d = pad(segmentStart.getDate());
      const hh = pad(segmentStart.getHours());
      const mm = pad(segmentStart.getMinutes());
      const ss = pad(segmentStart.getSeconds());
      const title = `${y}.${m}.${d} ${hh}:${mm}:${ss}.${fileExt}`;

      if (currentType === 'video') {
        let mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/webm';
        }
        finalBlob = new Blob(chunksToProcess, { type: mimeType });
      } else {
        const rawAudioBlob = new Blob(chunksToProcess, { type: 'audio/webm' });
        try {
          const arrayBuffer = await rawAudioBlob.arrayBuffer();
          const tempCtx = new AudioContext();
          const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);

          if (currentAudioSettings.format === 'mp3') {
            finalBlob = await encodeAudioBufferToMp3(audioBuffer, currentAudioSettings.bitrate);
          } else {
            finalBlob = encodeAudioBufferToWav(audioBuffer);
          }
          tempCtx.close();
        } catch (e) {
          console.warn('Fallback audio blob processing:', e);
          finalBlob = rawAudioBlob;
        }
      }

      const blobUrl = URL.createObjectURL(finalBlob);
      const nowStr = new Date().toLocaleString('vi-VN');

      const newItem: RecordingItem = {
        id: Date.now().toString(),
        title,
        type: currentType,
        format: fileExt,
        blobUrl,
        blob: finalBlob,
        duration: chunkDuration,
        size: finalBlob.size,
        createdAt: nowStr,
        quality:
          currentType === 'video'
            ? `${currentVideoSettings.quality} ${currentVideoSettings.fps}fps`
            : `${currentAudioSettings.format.toUpperCase()} ${currentAudioSettings.bitrate}kbps`,
        localPath: currentSaveSettings.customPath,
      };

      setRecordings((prev) => [newItem, ...prev]);

      // Auto Download locally if enabled (replace colons with . for local Windows filename safety)
      if (currentSaveSettings.autoDownload) {
        const safeTitle = title.replace(/:/g, '.');
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = safeTitle;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      // Auto Upload to Google Drive if enabled
      if (currentSaveSettings.autoUploadDrive && currentAuth.accessToken) {
        handleUploadItemToDrive(newItem, currentAuth.accessToken);
      } else if (currentSaveSettings.autoUploadDrive && !currentAuth.accessToken) {
        showToast(`Đã lưu file "${title}". Vui lòng đăng nhập Google Drive để tự động upload!`);
      }

      showToast(`Đã lưu file (${chunkDuration}s): ${title}`);
    }, 250);
  };

  // Timer Counter & 15-minute Auto-chunking
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setSecondsElapsed((prev) => {
          const nextVal = prev + 1;
          chunkSecondsElapsedRef.current += 1;

          // Every 15 minutes (900 seconds), auto-save and upload current segment
          if (chunkSecondsElapsedRef.current >= 900) {
            saveChunkSegment(false);
          }

          // Auto-stop if Timer option is enabled and total duration reached
          if (timerOption.enabled && nextVal >= timerOption.durationSeconds) {
            handleStopRecording();
            showToast('Hẹn giờ hoàn tất: Đã tự động dừng và lưu file!');
          }
          return nextVal;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording, isPaused, timerOption]);

  // Start Screen Recording (Video MP4)
  const handleStartScreenRecording = async () => {
    try {
      recordedChunksRef.current = [];
      setSecondsElapsed(0);
      chunkSecondsElapsedRef.current = 0;
      segmentStartTimeRef.current = new Date();
      recordingTypeRef.current = 'video';
      setRecordingType('video');

      // Video Resolution Constraints
      let width = 1920;
      let height = 1080;
      if (videoSettings.quality === '720p') {
        width = 1280;
        height = 720;
      } else if (videoSettings.quality === '480p') {
        width = 854;
        height = 480;
      }

      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: videoSettings.fps },
        },
        audio: videoSettings.audioSource !== 'none' && videoSettings.audioSource !== 'mic',
      };

      // Get Screen Display stream
      const displayStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      let finalTracks: MediaStreamTrack[] = [...displayStream.getVideoTracks()];

      // Audio mixing setup
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();
      audioDestinationRef.current = destination;

      let hasAudioTrack = false;

      // Mix System Audio
      if (displayStream.getAudioTracks().length > 0 && videoSettings.audioSource !== 'none') {
        const systemSource = audioCtx.createMediaStreamSource(new MediaStream([displayStream.getAudioTracks()[0]]));
        systemSource.connect(destination);
        hasAudioTrack = true;
      }

      // Mix Microphone Audio if requested
      if (videoSettings.audioSource === 'both' || videoSettings.audioSource === 'mic') {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          const micSource = audioCtx.createMediaStreamSource(micStream);
          const micGain = audioCtx.createGain();
          micGainNodeRef.current = micGain;
          micSource.connect(micGain);
          micGain.connect(destination);
          hasAudioTrack = true;
        } catch (micErr) {
          console.warn('Không thể truy cập Microphone:', micErr);
        }
      }

      if (hasAudioTrack && destination.stream.getAudioTracks().length > 0) {
        finalTracks.push(destination.stream.getAudioTracks()[0]);
      }

      const combinedStream = new MediaStream(finalTracks);
      activeStreamRef.current = combinedStream;

      // Select Video MimeType
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond:
          videoSettings.bitrate === 'high'
            ? 8000000
            : videoSettings.bitrate === 'medium'
            ? 4000000
            : 2000000,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      // Handle screen sharing stop by user clicking browser stop button
      displayStream.getVideoTracks()[0].onended = () => {
        handleStopRecording();
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      showToast('Đã bắt đầu ghi màn hình!');
    } catch (err: any) {
      console.error('Start screen recording error:', err);
      alert('Không thể bắt đầu ghi màn hình: ' + (err.message || 'Lỗi quyền truy cập'));
    }
  };

  // Start Audio Recording (MP3 / WAV)
  const handleStartAudioRecording = async () => {
    try {
      recordedChunksRef.current = [];
      setSecondsElapsed(0);
      chunkSecondsElapsedRef.current = 0;
      segmentStartTimeRef.current = new Date();
      recordingTypeRef.current = 'audio';
      setRecordingType('audio');

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();
      audioDestinationRef.current = destination;

      let hasSource = false;

      // System audio
      if (audioSettings.source === 'both' || audioSettings.source === 'system') {
        try {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          displayStream.getVideoTracks().forEach((t) => t.stop()); // drop video track

          if (displayStream.getAudioTracks().length > 0) {
            const systemSource = audioCtx.createMediaStreamSource(new MediaStream([displayStream.getAudioTracks()[0]]));
            systemSource.connect(destination);
            hasSource = true;
          }
        } catch (e) {
          console.warn('System audio capture cancelled or not supported');
        }
      }

      // Mic audio
      if (audioSettings.source === 'both' || audioSettings.source === 'mic') {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          const micSource = audioCtx.createMediaStreamSource(micStream);
          const micGain = audioCtx.createGain();
          micGainNodeRef.current = micGain;
          micSource.connect(micGain);
          micGain.connect(destination);
          hasSource = true;
        } catch (e) {
          console.warn('Microphone capture error');
        }
      }

      if (!hasSource) {
        alert('Vui lòng cấp quyền truy cập âm thanh để ghi âm MP3');
        return;
      }

      const combinedStream = destination.stream;
      activeStreamRef.current = combinedStream;

      const mediaRecorder = new MediaRecorder(combinedStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      showToast('Đã bắt đầu ghi âm MP3!');
    } catch (err: any) {
      console.error('Start audio recording error:', err);
      alert('Lỗi ghi âm: ' + (err.message || 'Không thể mở âm thanh'));
    }
  };

  const handleStartRecording = () => {
    if (activeTab === 'video') {
      handleStartScreenRecording();
    } else {
      handleStartAudioRecording();
    }
  };

  const handlePauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const handleToggleMic = () => {
    if (micGainNodeRef.current) {
      if (micMuted) {
        micGainNodeRef.current.gain.value = 1;
        setMicMuted(false);
      } else {
        micGainNodeRef.current.gain.value = 0;
        setMicMuted(true);
      }
    }
  };

  // Stop Recording & Process File Export (MP4 / MP3)
  const handleStopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    setIsPaused(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop streams
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    saveChunkSegment(true);
  };

  // Upload item to Google Drive
  const handleUploadItemToDrive = async (item: RecordingItem, tokenOverride?: string) => {
    const token = tokenOverride || auth.accessToken;

    if (!token) {
      alert('Vui lòng đăng nhập Google Drive trước khi tải lên');
      handleDriveLogin();
      return;
    }

    setRecordings((prev) =>
      prev.map((r) => (r.id === item.id ? { ...r, uploadStatus: 'uploading' } : r))
    );

    try {
      const mimeType =
        item.type === 'video'
          ? 'video/mp4'
          : item.format === 'mp3'
          ? 'audio/mp3'
          : 'audio/wav';

      const driveRes = await uploadToDrive(token, item.blob, item.title, mimeType);

      setRecordings((prev) =>
        prev.map((r) =>
          r.id === item.id
            ? {
                ...r,
                uploadStatus: 'success',
                driveFileId: driveRes.id,
                driveViewLink: driveRes.webViewLink,
              }
            : r
        )
      );
      showToast(`Đã tải file "${item.title}" lên Google Drive!`);
    } catch (err: any) {
      console.error('Drive upload error:', err);
      setRecordings((prev) =>
        prev.map((r) =>
          r.id === item.id
            ? { ...r, uploadStatus: 'error', uploadError: err.message || 'Thất bại' }
            : r
        )
      );
    }
  };

  const handleDeleteItem = (id: string) => {
    setRecordings((prev) => {
      const item = prev.find((r) => r.id === id);
      if (item) URL.revokeObjectURL(item.blobUrl);
      return prev.filter((r) => r.id !== id);
    });
    showToast('Đã xóa file');
  };

  // Screenshot helper for video
  const handleTakeScreenshot = () => {
    if (!activeStreamRef.current) return;
    const videoTrack = activeStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    const video = document.createElement('video');
    video.srcObject = activeStreamRef.current;
    video.play();

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ManHinh_Chup_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
      }
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Global Hotkey Listener */}
      <HotkeyListener
        hotkeys={hotkeys}
        isRecording={isRecording}
        isPaused={isPaused}
        onStartStop={isRecording ? handleStopRecording : handleStartRecording}
        onPauseResume={isPaused ? handleResumeRecording : handlePauseRecording}
        onToggleMic={handleToggleMic}
        onTakeScreenshot={handleTakeScreenshot}
        setToastMessage={setToastMessage}
      />

      {/* Navigation Header */}
      <Navbar
        auth={auth}
        onLogin={handleDriveLogin}
        onLogout={handleDriveLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenShortcuts={() => setIsSettingsOpen(true)}
        saveSettings={saveSettings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recordingsCount={recordings.length}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Announcement */}
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Hệ Thống Ghi Màn Hình & Âm Thanh Chuẩn Windows
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-semibold border border-emerald-500/30">
                  Sẵn Sàng
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Hỗ trợ MP4 1080p 60fps, Ghi âm MP3 chuẩn, Hẹn giờ tự dừng & Đồng bộ kết nối Google Drive OAuth 2.0.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow"
          >
            Tùy Chỉnh Phím Tắt ({hotkeys.startStop})
          </button>
        </div>

        {/* Content Panels */}
        {activeTab === 'library' ? (
          <RecordingsLibrary
            recordings={recordings}
            onDelete={handleDeleteItem}
            onUploadToDrive={(item) => handleUploadItemToDrive(item)}
            auth={auth}
            saveSettings={saveSettings}
          />
        ) : (
          <RecorderControls
            activeTab={activeTab}
            videoSettings={videoSettings}
            setVideoSettings={setVideoSettings}
            audioSettings={audioSettings}
            setAudioSettings={setAudioSettings}
            timerOption={timerOption}
            setTimerOption={setTimerOption}
            saveSettings={saveSettings}
            setSaveSettings={setSaveSettings}
            hotkeys={hotkeys}
            isRecording={isRecording}
            isPaused={isPaused}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onPauseRecording={handlePauseRecording}
            onResumeRecording={handleResumeRecording}
            isDriveAuthenticated={!!auth.user}
            onDriveLogin={handleDriveLogin}
          />
        )}
      </main>

      {/* Active Recording HUD Overlay */}
      <ActiveRecordingOverlay
        isRecording={isRecording}
        isPaused={isPaused}
        recordingType={recordingType}
        secondsElapsed={secondsElapsed}
        timerOption={timerOption}
        audioStream={activeStreamRef.current}
        micMuted={micMuted}
        onToggleMic={handleToggleMic}
        onPause={handlePauseRecording}
        onResume={handleResumeRecording}
        onStop={handleStopRecording}
        onTakeScreenshot={handleTakeScreenshot}
        toastMessage={toastMessage}
        autoUploadDrive={saveSettings.autoUploadDrive}
      />

      {/* Settings & Hotkey Customization Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        videoSettings={videoSettings}
        setVideoSettings={setVideoSettings}
        audioSettings={audioSettings}
        setAudioSettings={setAudioSettings}
        saveSettings={saveSettings}
        setSaveSettings={setSaveSettings}
        hotkeys={hotkeys}
        setHotkeys={setHotkeys}
        auth={auth}
        onLogin={handleDriveLogin}
        onLogout={handleDriveLogout}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 Windows Screen & Audio Recorder Pro. All rights reserved.</p>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">Định dạng hỗ trợ: MP4, WEBM, MP3, WAV</span>
            <span>|</span>
            <span className="text-emerald-400">Google Drive API v3</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
