import React from 'react';
import {
  Video,
  Mic,
  Settings,
  HardDrive,
  Keyboard,
  CheckCircle2,
  LogIn,
  LogOut,
  FolderDown,
  Monitor
} from 'lucide-react';
import { UserAuth, SaveSettings } from '../types';

interface NavbarProps {
  auth: UserAuth;
  onLogin: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
  saveSettings: SaveSettings;
  activeTab: 'video' | 'audio' | 'library';
  setActiveTab: (tab: 'video' | 'audio' | 'library') => void;
  recordingsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  auth,
  onLogin,
  onLogout,
  onOpenSettings,
  onOpenShortcuts,
  saveSettings,
  activeTab,
  setActiveTab,
  recordingsCount,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand logo & title */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/20">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Windows Screen & Audio Recorder
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                PRO Win11
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Ghi hình 1080p, Ghi âm MP3, Hẹn giờ & Tự động lưu Google Drive
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            id="tab-btn-video"
            onClick={() => setActiveTab('video')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'video'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Ghi Màn Hình</span>
          </button>

          <button
            id="tab-btn-audio"
            onClick={() => setActiveTab('audio')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'audio'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Chỉ Ghi Âm (MP3)</span>
          </button>

          <button
            id="tab-btn-library"
            onClick={() => setActiveTab('library')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'library'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FolderDown className="w-4 h-4" />
            <span>Thư Viện</span>
            {recordingsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-400 text-slate-950 font-bold text-xs rounded-full">
                {recordingsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Action Controls & Google Drive Status */}
        <div className="flex items-center space-x-3">
          {/* Shortcuts button */}
          <button
            id="btn-shortcuts"
            onClick={onOpenShortcuts}
            title="Phím tắt tùy chỉnh"
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700/80 transition-colors flex items-center space-x-1"
          >
            <Keyboard className="w-4 h-4" />
            <span className="text-xs font-medium hidden md:inline">Phím Tắt</span>
          </button>

          {/* Settings button */}
          <button
            id="btn-settings"
            onClick={onOpenSettings}
            title="Cài đặt hệ thống"
            className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700/80 transition-colors flex items-center space-x-1"
          >
            <Settings className="w-4 h-4" />
            <span className="text-xs font-medium hidden md:inline">Cài Đặt</span>
          </button>

          {/* Google Drive Status & OAuth Button */}
          <div className="pl-2 border-l border-slate-700/80 flex items-center">
            {auth.user ? (
              <div className="flex items-center space-x-2 bg-slate-800/90 pl-2 pr-1.5 py-1 rounded-lg border border-slate-700">
                <div className="relative">
                  {auth.user.photoURL ? (
                    <img
                      src={auth.user.photoURL}
                      alt={auth.user.displayName || 'Google Account'}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <HardDrive className="w-5 h-5 text-emerald-400" />
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-slate-200 truncate max-w-[100px]">
                    {auth.user.displayName || auth.user.email}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Drive Đã Kết Nối
                  </p>
                </div>
                <button
                  id="btn-drive-logout"
                  onClick={onLogout}
                  title="Đăng xuất Google Drive"
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-drive-login"
                onClick={onLogin}
                className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-medium shadow-sm transition-all border border-blue-400/30"
              >
                <HardDrive className="w-4 h-4 text-emerald-300" />
                <span className="whitespace-nowrap">Đăng Nhập Google Drive</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
