import React, { useEffect } from 'react';
import { HotkeyConfig } from '../types';

interface HotkeyListenerProps {
  hotkeys: HotkeyConfig;
  isRecording: boolean;
  isPaused: boolean;
  onStartStop: () => void;
  onPauseResume: () => void;
  onToggleMic: () => void;
  onTakeScreenshot: () => void;
  setToastMessage: (msg: string | null) => void;
}

export const HotkeyListener: React.FC<HotkeyListenerProps> = ({
  hotkeys,
  isRecording,
  isPaused,
  onStartStop,
  onPauseResume,
  onToggleMic,
  onTakeScreenshot,
  setToastMessage,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
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

      const currentPressed = keys.join('+');

      // Check against hotkeys
      if (currentPressed === hotkeys.startStop) {
        e.preventDefault();
        onStartStop();
        showToast(isRecording ? 'Đã dừng ghi màn hình' : 'Đã bắt đầu ghi');
      } else if (currentPressed === hotkeys.pauseResume && isRecording) {
        e.preventDefault();
        onPauseResume();
        showToast(isPaused ? 'Đã tiếp tục ghi' : 'Đã tạm dừng ghi');
      } else if (currentPressed === hotkeys.toggleMic && isRecording) {
        e.preventDefault();
        onToggleMic();
        showToast('Đã chuyển đổi trạng thái Micro');
      } else if (currentPressed === hotkeys.screenshot && isRecording) {
        e.preventDefault();
        onTakeScreenshot();
        showToast('Đã chụp ảnh màn hình!');
      }
    };

    const showToast = (text: string) => {
      setToastMessage(text);
      setTimeout(() => setToastMessage(null), 2500);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hotkeys, isRecording, isPaused, onStartStop, onPauseResume, onToggleMic, onTakeScreenshot]);

  return null;
};
