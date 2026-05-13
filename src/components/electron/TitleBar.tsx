import { useState } from 'react'

declare global {
  interface Window {
    electronAPI?: {
      platform: string
      isElectron: boolean
      minimize: () => void
      maximize: () => void
      close: () => void
    }
  }
}

const isPackagedFileApp = window.location.protocol === 'file:'

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false)

  const isElectron = window.electronAPI?.isElectron || navigator.userAgent.includes('Electron') || isPackagedFileApp
  if (!isElectron) return null

  const handleMinimize = () => window.electronAPI?.minimize()
  const handleMaximize = () => {
    window.electronAPI?.maximize()
    setMaximized(value => !value)
  }
  const handleClose = () => window.electronAPI?.close()

  return (
    <div className="electron-titlebar" role="toolbar" aria-label="窗口控制">
      <div className="electron-title">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" />
        <span>晋梆智绎</span>
      </div>

      <div className="electron-actions">
        <button onClick={handleMinimize} className="electron-win-btn" title="最小化" aria-label="最小化">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
        <button onClick={handleMaximize} className="electron-win-btn" title={maximized ? '还原' : '最大化'} aria-label={maximized ? '还原' : '最大化'}>
          {maximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="2" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.1" />
              <path d="M4 4V3a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H9" stroke="currentColor" strokeWidth="1.1" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
            </svg>
          )}
        </button>
        <button onClick={handleClose} className="electron-win-btn electron-close" title="关闭" aria-label="关闭">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <style>{`
        .electron-titlebar {
          position: fixed;
          inset: 0 0 auto 0;
          z-index: 2147483000;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          user-select: none;
          color: rgba(255, 232, 181, 0.88);
          background: linear-gradient(180deg, rgba(18,15,18,0.96), rgba(10,8,10,0.88));
          border-bottom: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 10px 30px rgba(0,0,0,0.26);
          backdrop-filter: blur(22px) saturate(160%);
          -webkit-backdrop-filter: blur(22px) saturate(160%);
          -webkit-app-region: drag;
        }
        .electron-title {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          height: 100%;
          margin-left: 12px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0;
        }
        .electron-title img {
          width: 22px;
          height: 22px;
          border-radius: 7px;
          object-fit: cover;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.18), 0 4px 14px rgba(0,0,0,0.22);
        }
        .electron-actions {
          display: flex;
          height: 100%;
          -webkit-app-region: no-drag;
        }
        .electron-win-btn {
          width: 48px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 0;
          color: rgba(255,255,255,0.74);
          background: transparent;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .electron-win-btn:hover {
          color: #fff;
          background: rgba(255,255,255,0.11);
        }
        .electron-win-btn:active {
          background: rgba(255,255,255,0.16);
        }
        .electron-close:hover {
          color: #fff;
          background: rgba(212, 48, 48, 0.86);
        }
      `}</style>
    </div>
  )
}
