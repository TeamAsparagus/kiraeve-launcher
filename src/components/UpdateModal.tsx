import React, { useState } from 'react';
import { ArrowDownCircle, RefreshCw, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUpdate?: Update | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  initialUpdate = null,
}) => {
  const [update, setUpdate] = useState<Update | null>(initialUpdate);
  const [checking, setChecking] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [downloadedMB, setDownloadedMB] = useState<string>('0');
  const [totalMB, setTotalMB] = useState<string>('0');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [upToDate, setUpToDate] = useState<boolean>(false);

  // Sync initialUpdate when opened
  React.useEffect(() => {
    if (initialUpdate) {
      setUpdate(initialUpdate);
      setUpToDate(false);
    }
  }, [initialUpdate]);

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    try {
      setChecking(true);
      setError(null);
      setUpToDate(false);
      setStatusMessage('กำลังตรวจสอบเวอร์ชันล่าสุดจาก GitHub Releases...');

      const foundUpdate = await check();
      if (foundUpdate) {
        setUpdate(foundUpdate);
        setUpToDate(false);
        setStatusMessage(`พบเวอร์ชันใหม่ v${foundUpdate.version}`);
      } else {
        setUpdate(null);
        setUpToDate(true);
        setStatusMessage('คุณกำลังใช้งานเวอร์ชันล่าสุดอยู่แล้ว');
      }
    } catch (err: any) {
      console.error('Update check failed:', err);
      setError(err?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์อัปเดตได้');
    } finally {
      setChecking(false);
    }
  };

  const handleStartUpdate = async () => {
    if (!update) return;

    try {
      setDownloading(true);
      setError(null);
      setProgress(0);
      setStatusMessage('กำลังเริ่มดาวน์โหลดแพ็กเกจอัปเดต...');

      let downloaded = 0;
      let total = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength || 0;
            setTotalMB((total / (1024 * 1024)).toFixed(1));
            setStatusMessage('กำลังดาวน์โหลดไฟล์อัปเดต...');
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            setDownloadedMB((downloaded / (1024 * 1024)).toFixed(1));
            if (total > 0) {
              const pct = Math.min(100, Math.round((downloaded / total) * 100));
              setProgress(pct);
            }
            break;
          case 'Finished':
            setProgress(100);
            setStatusMessage('ดาวน์โหลดเสร็จสมบูรณ์ กำลังติดตั้งและรีสตาร์ท Launcher...');
            break;
        }
      });

      // Relaunch the launcher to apply update
      setStatusMessage('รีสตาร์ทเพื่อเปิดใช้งานเวอร์ชันใหม่...');
      setTimeout(async () => {
        await relaunch();
      }, 1500);
    } catch (err: any) {
      console.error('Update install failed:', err);
      setError(err?.message || 'การติดตั้งอัปเดตล้มเหลว กรุณาลองใหม่อีกครั้ง');
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-[#1b2838] border border-[#2a475e] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#171a21] border-b border-[#2a475e]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a9fff]/20 border border-[#1a9fff]/40 flex items-center justify-center text-[#1a9fff]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Kiraeve Launcher Updates</h3>
              <p className="text-[11px] text-[#8f98a0]">ระบบอัปเดตอัตโนมัติ (GitHub Release)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="p-1.5 rounded-lg text-[#8f98a0] hover:text-white hover:bg-[#2a475e]/40 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Update Available Banner */}
          {update && !upToDate && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#21374a] border border-[#1a9fff]/40 flex items-start gap-3.5">
                <ArrowDownCircle className="w-6 h-6 text-[#1a9fff] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">พบการอัปเดตใหม่:</span>
                    <span className="px-2 py-0.5 rounded bg-[#1a9fff] text-white text-[11px] font-black">
                      v{update.version}
                    </span>
                  </div>
                  <p className="text-xs text-[#c7d5e0]">
                    แนะนำให้อัปเดตเป็นเวอร์ชันล่าสุดเพื่อความเสถียรและความปลอดภัยในการเล่นเกม
                  </p>
                </div>
              </div>

              {/* Release Notes / Changelog */}
              {update.body && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-[#8f98a0] uppercase tracking-wider">
                    บันทึกการเปลี่ยนแปลง (Changelog):
                  </div>
                  <div className="p-3 max-h-36 overflow-y-auto rounded bg-[#101822] border border-[#2a475e]/40 text-xs text-[#c7d5e0] font-mono whitespace-pre-wrap leading-relaxed select-text">
                    {update.body}
                  </div>
                </div>
              )}

              {/* Download Progress Bar */}
              {downloading && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8f98a0]">{statusMessage}</span>
                    <span className="text-white font-mono font-bold">
                      {progress}% {totalMB !== '0' && `(${downloadedMB} / ${totalMB} MB)`}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#101822] overflow-hidden border border-[#2a475e]/50">
                    <div
                      className="h-full bg-gradient-to-r from-[#1a9fff] to-[#00d2ff] transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Up to Date Banner */}
          {upToDate && (
            <div className="p-5 rounded-lg bg-[#1c2e22] border border-[#4c6b22] flex items-center gap-3.5">
              <CheckCircle2 className="w-6 h-6 text-[#a4d007] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">Launcher ของคุณเป็นเวอร์ชันล่าสุดแล้ว</h4>
                <p className="text-[11px] text-[#8f98a0] mt-0.5">ไม่มีแพ็กเกจอัปเดตใหม่ในขณะนี้</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-lg bg-[#3d1a1f] border border-[#d9534f]/50 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#ff6b6b] shrink-0 mt-0.5" />
              <div className="text-xs text-[#ffcdd2]">
                <div className="font-bold text-white">ข้อผิดพลาด:</div>
                <div className="mt-0.5">{error}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#171a21] border-t border-[#2a475e]/50">
          <button
            onClick={handleCheckUpdate}
            disabled={checking || downloading}
            className="px-3.5 py-2 rounded-lg bg-[#2a475e]/40 hover:bg-[#2a475e] text-[#c7d5e0] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'กำลังตรวจหา...' : 'ตรวจหาอีกครั้ง'}</span>
          </button>

          <div className="flex items-center gap-2">
            {!downloading && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-transparent hover:bg-[#2a475e]/40 text-[#8f98a0] hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                ไว้คราวหน้า
              </button>
            )}

            {update && !upToDate && (
              <button
                onClick={handleStartUpdate}
                disabled={downloading}
                className="px-5 py-2 rounded-lg bg-[#1a9fff] hover:bg-[#0080ff] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#1a9fff]/20 disabled:opacity-50"
              >
                <ArrowDownCircle className="w-4 h-4" />
                <span>{downloading ? 'กำลังติดตั้ง...' : 'อัปเดตทันที'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
