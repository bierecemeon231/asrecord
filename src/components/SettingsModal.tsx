import React, { useState } from 'react';
import {
  X,
  Settings,
  Keyboard,
  HardDrive,
  Folder,
  Sliders,
  Check,
  RotateCcw,
  LogIn,
  LogOut,
  Sparkles
} from 'lucide-react';
import {
  VideoSettings,
  AudioSettings,
  SaveSettings,
  HotkeyConfig,
  UserAuth
} from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSettings: VideoSettings;
  setVideoSettings: React.Dispatch<React.SetStateAction<VideoSettings>>;
  audioSettings: AudioSettings;
  setAudioSettings: React.Dispatch<React.SetStateAction<AudioSettings>>;
  saveSettings: SaveSettings;
  setSaveSettings: React.Dispatch<React.SetStateAction<SaveSettings>>;
  hotkeys: HotkeyConfig;
  setHotkeys: React.Dispatch<React.SetStateAction<HotkeyConfig>>;
  auth: UserAuth;
  onLogin: () => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  videoSettings,
  setVideoSettings,
  audioSettings,
  setAudioSettings,
  saveSettings,
  setSaveSettings,
  hotkeys,
  setHotkeys,
  auth,
  onLogin,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'recording' | 'storage' | 'hotkeys'>('recording');
  const [bindingKey, setBindingKey] = useState<keyof HotkeyConfig | null>(null);

  if (!isOpen) return null;

  // Handle Hotkey Keydown Rebinding
  const handleStartRebind = (keyName: keyof HotkeyConfig) => {
    setBindingKey(keyName);
  };

  const handleKeyDownRebind = (e: React.KeyboardEvent) => {
    if (!bindingKey) return;
    e.preventDefault();
    e.stopPropagation();

    // Prevent ESC from binding
    if (e.key === 'Escape') {
      setBindingKey(null);
      return;
    }

    const keys: string[] = [];
    if (e.altKey) keys.push('Alt');
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.shiftKey) keys.push('Shift');

    const keyName = e.key.toUpperCase();
    if (!['ALT', 'CONTROL', 'SHIFT', 'META'].includes(keyName)) {
      keys.push(keyName);
    }

    if (keys.length > 0) {
      const shortcutStr = keys.join('+');
      setHotkeys((prev) => ({ ...prev, [bindingKey]: shortcutStr }));
      setBindingKey(null);
    }
  };

  const handleResetDefaultHotkeys = () => {
    setHotkeys({
      startStop: 'Alt+R',
      pauseResume: 'Alt+P',
      toggleMic: 'Alt+M',
      screenshot: 'Alt+S',
    });
  };

  const handleSelectFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker();
        setSaveSettings((prev) => ({
          ...prev,
          directoryHandle: handle,
          customPath: `Thư mục chọn: ${handle.name}`,
        }));
      } catch (e) {}
    } else {
      const path = prompt('Nhập đường dẫn lưu file trên máy tính Windows:', saveSettings.customPath);
      if (path) {
        setSaveSettings((prev) => ({ ...prev, customPath: path }));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onKeyDown={bindingKey ? handleKeyDownRebind : undefined}
        tabIndex={bindingKey ? 0 : -1}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">Cài Đặt Hệ Thống & Phím Tắt</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inner Nav Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900 px-5 pt-3">
          <button
            onClick={() => setActiveTab('recording')}
            className={`pb-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'recording'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Chất Lượng Video/Âm Thanh</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`pb-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'storage'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Lưu File & Google Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('hotkeys')}
            className={`pb-3 px-4 font-semibold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'hotkeys'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Phím Tắt Tùy Chỉnh</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Recording Quality */}
          {activeTab === 'recording' && (
            <div className="space-y-6">
              {/* Video Quality */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Cấu hình Ghi Hình (Video MP4)
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Độ Phân Giải:</label>
                    <select
                      value={videoSettings.quality}
                      onChange={(e) =>
                        setVideoSettings((prev) => ({ ...prev, quality: e.target.value as any }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="1080p">1080p Full HD (1920x1080)</option>
                      <option value="720p">720p HD (1280x720)</option>
                      <option value="480p">480p SD (854x480)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Tốc độ Khung Hình (FPS):</label>
                    <select
                      value={videoSettings.fps}
                      onChange={(e) =>
                        setVideoSettings((prev) => ({ ...prev, fps: Number(e.target.value) as any }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value={60}>60 FPS (Mượt mà / Chơi game)</option>
                      <option value={30}>30 FPS (Tiêu chuẩn / Học tập)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Mức Bitrate Nén Video:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'high', label: 'Cao (8 Mbps)' },
                      { id: 'medium', label: 'Vừa (4 Mbps)' },
                      { id: 'low', label: 'Tiết kiệm (2 Mbps)' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setVideoSettings((prev) => ({ ...prev, bitrate: b.id as any }))}
                        className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                          videoSettings.bitrate === b.id
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Audio MP3 Quality */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Cấu hình Ghi Âm (MP3 / WAV)
                </h4>

                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">Bitrate Âm Thanh MP3:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { kbps: 320, label: '320 kbps (Cực nét)' },
                      { kbps: 192, label: '192 kbps (Chuẩn)' },
                      { kbps: 128, label: '128 kbps (Nhẹ)' },
                    ].map((b) => (
                      <button
                        key={b.kbps}
                        onClick={() => setAudioSettings((prev) => ({ ...prev, bitrate: b.kbps as any }))}
                        className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                          audioSettings.bitrate === b.kbps
                            ? 'bg-purple-600 border-purple-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Storage & Drive */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              {/* Local Folder */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Thư Mục Lưu File Windows
                </h4>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={saveSettings.customPath}
                    onChange={(e) => setSaveSettings((prev) => ({ ...prev, customPath: e.target.value }))}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="VD: C:\Users\Videos\ScreenRecordings"
                  />
                  <button
                    onClick={handleSelectFolder}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    Chọn Thư Mục
                  </button>
                </div>
              </div>

              {/* Google Drive Auth */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Google Drive OAuth 2.0</span>
                  {auth.user && (
                    <span className="text-emerald-400 text-xs font-semibold">Đã xác thực thành công</span>
                  )}
                </h4>

                {auth.user ? (
                  <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {auth.user.photoURL && (
                        <img src={auth.user.photoURL} className="w-8 h-8 rounded-full" alt="Avatar" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-white">{auth.user.displayName}</p>
                        <p className="text-xs text-slate-400">{auth.user.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={onLogout}
                      className="px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Đăng Xuất
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-3">
                    <p className="text-xs text-slate-300">
                      Đăng nhập tài khoản Google để ứng dụng tự động tải trực tiếp các file ghi màn hình và file âm thanh MP3 lên Google Drive của bạn. Bạn chỉ cần xác thực duy nhất 1 lần đầu.
                    </p>
                    <button
                      onClick={onLogin}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2"
                    >
                      <HardDrive className="w-4 h-4" /> Đăng Nhập Xác Thực Google Drive
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-300">Tên thư mục tạo trên Google Drive:</span>
                  <input
                    type="text"
                    value={saveSettings.driveFolderName}
                    onChange={(e) =>
                      setSaveSettings((prev) => ({ ...prev, driveFolderName: e.target.value }))
                    }
                    className="w-48 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Hotkeys */}
          {activeTab === 'hotkeys' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Cấu Hình Phím Tắt Tùy Chỉnh
                </h4>

                <button
                  onClick={handleResetDefaultHotkeys}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Khôi phục mặc định
                </button>
              </div>

              {bindingKey && (
                <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-300 text-xs font-semibold animate-pulse text-center">
                  👉 Hãy nhấn tổ hợp phím bạn muốn gán trên bàn phím (VD: Alt+R, Ctrl+F9, v.v.). Nhấn Esc để hủy.
                </div>
              )}

              <div className="space-y-3">
                {[
                  { key: 'startStop', label: 'Bắt đầu / Dừng Ghi' },
                  { key: 'pauseResume', label: 'Tạm dừng / Tiếp tục' },
                  { key: 'toggleMic', label: 'Bật / Tắt Microphone' },
                  { key: 'screenshot', label: 'Chụp ảnh màn hình' },
                ].map((hk) => (
                  <div
                    key={hk.key}
                    className="flex items-center justify-between bg-slate-800/60 p-3 rounded-xl border border-slate-700/60"
                  >
                    <span className="text-xs font-semibold text-slate-300">{hk.label}</span>

                    <div className="flex items-center space-x-3">
                      <kbd className="px-3 py-1 bg-slate-900 border border-slate-600 rounded-lg font-mono font-bold text-amber-400 text-xs shadow-inner">
                        {hotkeys[hk.key as keyof HotkeyConfig]}
                      </kbd>

                      <button
                        onClick={() => handleStartRebind(hk.key as keyof HotkeyConfig)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        {bindingKey === hk.key ? 'Đang chờ phím...' : 'Đổi Phím'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg"
          >
            Hoàn Tất & Lưu Cài Đặt
          </button>
        </div>
      </div>
    </div>
  );
};
