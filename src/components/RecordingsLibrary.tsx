import React, { useState } from 'react';
import {
  FolderDown,
  Video,
  Mic,
  Download,
  HardDrive,
  Trash2,
  ExternalLink,
  Play,
  FileText,
  Clock,
  Check,
  AlertCircle,
  Loader2,
  Share2
} from 'lucide-react';
import { RecordingItem, UserAuth, SaveSettings } from '../types';

interface RecordingsLibraryProps {
  recordings: RecordingItem[];
  onDelete: (id: string) => void;
  onUploadToDrive: (item: RecordingItem) => void;
  auth: UserAuth;
  saveSettings: SaveSettings;
}

export const RecordingsLibrary: React.FC<RecordingsLibraryProps> = ({
  recordings,
  onDelete,
  onUploadToDrive,
  auth,
  saveSettings,
}) => {
  const [filter, setFilter] = useState<'all' | 'video' | 'audio' | 'drive'>('all');
  const [previewItem, setPreviewItem] = useState<RecordingItem | null>(null);

  const filteredItems = recordings.filter((item) => {
    if (filter === 'video') return item.type === 'video';
    if (filter === 'audio') return item.type === 'audio';
    if (filter === 'drive') return !!item.driveFileId;
    return true;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownloadLocal = (item: RecordingItem) => {
    const a = document.createElement('a');
    a.href = item.blobUrl;
    a.download = item.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <FolderDown className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Thư Viện File Đã Ghi</h2>
            <p className="text-xs text-slate-400">
              Quản lý các video MP4 & âm thanh MP3 đã thu âm, tải về máy tính hoặc tải lên Google Drive
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700/80 text-xs font-medium">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'all' ? 'bg-slate-700 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất Cả ({recordings.length})
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'video' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Video MP4
          </button>
          <button
            onClick={() => setFilter('audio')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'audio' ? 'bg-purple-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Âm Thanh MP3
          </button>
          <button
            onClick={() => setFilter('drive')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'drive' ? 'bg-emerald-600 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trên Drive
          </button>
        </div>
      </div>

      {/* Record List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
          <FolderDown className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-300">Chưa có bản ghi nào</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Hãy bắt đầu ghi màn hình hoặc ghi âm bằng menu bên trên. Các file hoàn thành sẽ hiển thị tại đây để bạn phát lại hoặc tải lên Google Drive.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-4 hover:border-slate-600 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Item type badge & time */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                      item.type === 'video'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}
                  >
                    {item.type === 'video' ? <Video className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    {item.format.toUpperCase()}
                  </span>

                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatDuration(item.duration)}
                  </span>
                </div>

                {/* File Title */}
                <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h3>

                {/* Metadata details */}
                <div className="mt-2 text-[11px] text-slate-400 space-y-1">
                  <p>Kích thước: <span className="font-mono text-slate-300">{formatFileSize(item.size)}</span></p>
                  <p>Thời gian: {item.createdAt}</p>
                  {item.quality && <p>Chất lượng: <span className="text-slate-300">{item.quality}</span></p>}
                  <p className="truncate">Vị trí: <span className="text-amber-400/90">{saveSettings.customPath}</span></p>
                </div>

                {/* Drive Status Badge */}
                {item.driveViewLink ? (
                  <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-400">
                    <span className="flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Đã Tải Lên Google Drive
                    </span>
                    <a
                      href={item.driveViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-emerald-500/20 rounded transition-colors"
                      title="Mở file trên Google Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : item.uploadStatus === 'uploading' ? (
                  <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center space-x-2 text-xs text-blue-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tải lên Google Drive...</span>
                  </div>
                ) : item.uploadStatus === 'error' ? (
                  <div className="mt-3 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Thất bại: {item.uploadError || 'Lỗi tải lên Drive'}</span>
                  </div>
                ) : null}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-1.5">
                {/* Play preview */}
                <button
                  id={`btn-preview-${item.id}`}
                  onClick={() => setPreviewItem(item)}
                  className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                  title="Phát lại"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Xem</span>
                </button>

                {/* Local Download */}
                <button
                  id={`btn-download-${item.id}`}
                  onClick={() => handleDownloadLocal(item)}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                  title="Tải về máy tính"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải Về</span>
                </button>

                {/* Google Drive Upload */}
                {!item.driveViewLink && (
                  <button
                    id={`btn-upload-drive-${item.id}`}
                    onClick={() => onUploadToDrive(item)}
                    disabled={item.uploadStatus === 'uploading'}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                    title="Tải lên Google Drive"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Drive</span>
                  </button>
                )}

                {/* Delete */}
                <button
                  id={`btn-delete-${item.id}`}
                  onClick={() => onDelete(item.id)}
                  className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors ml-auto"
                  title="Xóa bản ghi"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full text-white shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-base truncate max-w-md">{previewItem.title}</h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2.5 py-1 rounded-lg bg-slate-800"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center min-h-[240px] mb-4">
              {previewItem.type === 'video' ? (
                <video src={previewItem.blobUrl} controls autoPlay className="w-full max-h-[400px]" />
              ) : (
                <div className="p-8 text-center w-full">
                  <Mic className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
                  <audio src={previewItem.blobUrl} controls autoPlay className="w-full mt-2" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Định dạng: <strong className="text-white uppercase">{previewItem.format}</strong> | Dung lượng:{' '}
                <strong className="text-white">{formatFileSize(previewItem.size)}</strong>
              </span>

              <button
                onClick={() => handleDownloadLocal(previewItem)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Tải File Về Máy PC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
