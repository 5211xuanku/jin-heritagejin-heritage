import { Suspense, lazy, useEffect, useState } from 'react'
import { Account, getAccounts } from './accountStore'
import TitleBar from './components/electron/TitleBar'
import { useAutoSync } from './hooks/useAutoSync'

const LoginPage = lazy(() => import('./components/LoginPage'))
const Dashboard = lazy(() => import('./components/Dashboard'))

function AppFallback() {
  return (
    <div className="ios-app-bg flex min-h-screen items-center justify-center text-white">
      <div className="glass-window rounded-3xl px-6 py-4 text-sm text-white/70">正在载入晋梆智绎...</div>
    </div>
  )
}

/** 同步状态提示条 */
function SyncStatusBar({ status }: { status: ReturnType<typeof useAutoSync>['status'] }) {
  if (!status.syncing && !status.error && !status.lastSyncTime) return null

  // 同步中
  if (status.syncing) {
    return (
      <div className="fixed top-10 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="glass-panel rounded-xl px-4 py-2 text-xs text-blue-300 flex items-center gap-2 animate-pulse">
          <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
          正在同步数据到云端...
        </div>
      </div>
    )
  }

  // 同步失败
  if (status.error) {
    return (
      <div className="fixed top-10 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="glass-panel rounded-xl px-4 py-2 text-xs text-amber-300 flex items-center gap-2">
          ⚠️ {status.error}
        </div>
      </div>
    )
  }

  // 同步成功（显示 3 秒后消失）
  return null
}

function App() {
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const { status, triggerSync } = useAutoSync()
  const hasElectronTitleBar = Boolean(window.electronAPI?.isElectron || navigator.userAgent.includes('Electron') || window.location.protocol === 'file:')

  const refreshAccounts = async () => {
    setAccounts(await getAccounts())
  }

  useEffect(() => {
    refreshAccounts()
  }, [])

  // 登录成功后自动同步
  const handleLoginSuccess = (account: Account) => {
    setCurrentAccount(account)
    refreshAccounts()
    // 登录后延迟 3 秒自动同步（等待页面加载完成）
    setTimeout(() => {
      triggerSync()
    }, 3000)
  }

  const handleLogout = () => {
    setCurrentAccount(null)
    refreshAccounts()
  }

  const appContent = currentAccount ? (
    <Suspense fallback={<AppFallback />}>
      <Dashboard currentAccount={currentAccount} accounts={accounts} onLogout={handleLogout} />
    </Suspense>
  ) : (
    <Suspense fallback={<AppFallback />}>
      <LoginPage onLoginSuccess={handleLoginSuccess} onAccountsChange={refreshAccounts} />
    </Suspense>
  )

  return (
    <div className={`app-shell${hasElectronTitleBar ? ' app-shell--electron' : ''}`}>
      <TitleBar />
      <SyncStatusBar status={status} />
      <div className="app-viewport">
        {appContent}
      </div>
    </div>
  )
}

export default App
