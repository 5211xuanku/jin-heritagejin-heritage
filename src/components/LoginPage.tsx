import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react'
import CanvasBackground from './CanvasBackground'
import QPagoda from './QPagoda'
import { Account, loginAccount, registerAccount, resetAccountPassword } from '../accountStore'
import { syncUserToCloud } from '../utils/cloudSync'
type View = 'login' | 'register' | 'forgot' | 'email' | 'sms'
type ToastType = 'success' | 'error' | 'info'
const logoUrl = `${import.meta.env.BASE_URL}logo.png`

async function getCloudbaseAuth() {
  const { cloudbase } = await import('../utils/cloudbase')
  return cloudbase.auth()
}

export default function LoginPage({
  onLoginSuccess,
  onAccountsChange,
}: {
  onLoginSuccess?: (account: Account) => void
  onAccountsChange?: () => void
}) {
  const [currentView, setCurrentView] = useState<View>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastType, setToastType] = useState<ToastType>('info')
  const toastTimer = useRef(0)
  const [regCountdown, setRegCountdown] = useState(0)
  const [forgotCountdown, setForgotCountdown] = useState(0)

  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
    showPassword: false,
  })

  const [regForm, setRegForm] = useState({
    username: '',
    displayName: '',
    email: '',
    phone: '',
    captcha: '',
    password: '',
    showPassword: false,
  })

  const [forgotForm, setForgotForm] = useState({
    username: '',
    captcha: '',
    newPassword: '',
    showPassword: false,
  })

  // Email verification
  const [emailForm, setEmailForm] = useState({ email: '', code: '' })
  const [emailStep, setEmailStep] = useState<'input' | 'code'>('input')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailVerification, setEmailVerification] = useState<any>(null)
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [emailRegister, setEmailRegister] = useState(false)

  const showToast = (message: string, type: ToastType = 'info') => {
    setToastMsg(message)
    setToastType(type)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 3000)
  }

  useEffect(() => {
    if (regCountdown <= 0) return
    const timer = window.setInterval(() => setRegCountdown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [regCountdown])

  useEffect(() => {
    if (forgotCountdown <= 0) return
    const timer = window.setInterval(() => setForgotCountdown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [forgotCountdown])

  useEffect(() => {
    return () => clearTimeout(toastTimer.current)
  }, [])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!loginForm.username || !loginForm.password) {
      showToast('请填写账号和密码', 'error')
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => window.setTimeout(resolve, 600))

    const account = await loginAccount(loginForm.username, loginForm.password)
    if (account) {
      showToast(account.role === 'admin' ? '管理员登录成功' : '登录成功', 'success')
      // 同步用户数据到 CloudBase
      syncUserToCloud(account).catch(err => console.error('同步用户数据失败:', err))
      window.setTimeout(() => onLoginSuccess?.(account), 600)
    } else {
      showToast('账号或密码不正确', 'error')
    }
  }

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!regForm.username || !regForm.email || !regForm.phone || !regForm.captcha || !regForm.password) {
      showToast('请填写完整账户资料', 'error')
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => window.setTimeout(resolve, 600))

    try {
      const account = await registerAccount({
        username: regForm.username,
        displayName: regForm.displayName,
        email: regForm.email,
        phone: regForm.phone,
        password: regForm.password,
      })
      // 同步注册的用户到 CloudBase
      syncUserToCloud(account).catch(err => console.error('同步注册用户失败:', err))
      onAccountsChange?.()
      showToast('注册成功，请登录', 'success')
      setCurrentView('login')
      setLoginForm((prev) => ({ ...prev, username: regForm.username, password: '' }))
      setRegForm({ username: '', displayName: '', email: '', phone: '', captcha: '', password: '', showPassword: false })
    } catch (error) {
      showToast(error instanceof Error ? error.message : '注册失败', 'error')
    }

    setIsLoading(false)
  }

  const handleForgotSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!forgotForm.username || !forgotForm.captcha || !forgotForm.newPassword) {
      showToast('请填写完整信息', 'error')
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => window.setTimeout(resolve, 600))

    try {
      await resetAccountPassword(forgotForm.username, forgotForm.newPassword)
      onAccountsChange?.()
      showToast('密码重置成功，请登录', 'success')
      setCurrentView('login')
      setForgotForm({ username: '', captcha: '', newPassword: '', showPassword: false })
    } catch (error) {
      showToast(error instanceof Error ? error.message : '重置失败', 'error')
    }

    setIsLoading(false)
  }

  // Email verification login handlers
  const sendVerificationCode = async () => {
    if (!emailForm.email) { showToast('请填写邮箱', 'error'); return }
    setEmailLoading(true)
    try {
      const auth = await getCloudbaseAuth()
      const res = await auth.getVerification({ email: emailForm.email })
      setEmailVerification(res)
      setEmailStep('code')
      setEmailCountdown(60)
      showToast('验证码已发送，请查收邮件', 'success')
    } catch (e: any) {
      showToast(e?.message || '发送失败', 'error')
    }
    setEmailLoading(false)
  }

  const verifyEmailLogin = async () => {
    if (!emailForm.code) { showToast('请输入验证码', 'error'); return }
    setEmailLoading(true)
    try {
      const auth = await getCloudbaseAuth()
      await auth.signInWithEmail({
        verificationInfo: emailVerification,
        verificationCode: emailForm.code,
        email: emailForm.email,
      })
      const localAccount: Account = {
        id: 'tcb-' + emailForm.email,
        username: emailForm.email.split('@')[0],
        displayName: emailForm.email.split('@')[0],
        email: emailForm.email, phone: '', password: '',
        role: 'user', createdAt: new Date().toISOString(),
      }
      // Register to local Dexie for admin management
      try {
        const { default: db } = await import('../db')
        const exists = await db.accounts.get(localAccount.id)
        if (!exists) await db.accounts.add(localAccount)
        await onAccountsChange?.()
      } catch { /* ignore */ }
      onLoginSuccess?.(localAccount)
      showToast('登录成功', 'success')
    } catch (e: any) {
      showToast(e?.message || '验证失败', 'error')
    }
    setEmailLoading(false)
  }

  useEffect(() => {
    if (emailCountdown <= 0) return
    const timer = window.setInterval(() => setEmailCountdown(p => Math.max(0, p - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [emailCountdown])

  // SMS phone login handlers
  const [smsForm, setSmsForm] = useState({ phone: '', code: '' })
  const [smsStep, setSmsStep] = useState<'input' | 'code'>('input')
  const [smsLoading, setSmsLoading] = useState(false)
  const [smsVerification, setSmsVerification] = useState<any>(null)
  const [smsCountdown, setSmsCountdown] = useState(0)
  const [smsRegister, setSmsRegister] = useState(false)

  const sendSmsCode = async () => {
    if (!smsForm.phone) { showToast('请填写手机号', 'error'); return }
    setSmsLoading(true)
    try {
      const auth = await getCloudbaseAuth()
      const res = await auth.getVerification({ phone_number: `+86 ${smsForm.phone}` })
      setSmsVerification(res)
      setSmsStep('code')
      setSmsCountdown(60)
      showToast('验证码已发送', 'success')
    } catch (e: any) {
      showToast(e?.message || '发送失败', 'error')
    }
    setSmsLoading(false)
  }

  const verifySmsLogin = async () => {
    if (!smsForm.code) { showToast('请输入验证码', 'error'); return }
    setSmsLoading(true)
    try {
      const auth = await getCloudbaseAuth()
      await auth.signInWithSms({
        verificationInfo: smsVerification,
        verificationCode: smsForm.code,
        phoneNum: `+86 ${smsForm.phone}`,
      })
      const localAccount: Account = {
        id: 'tcb-' + smsForm.phone, username: smsForm.phone.slice(-4), displayName: '用户' + smsForm.phone.slice(-4),
        email: '', phone: smsForm.phone, password: '', role: 'user', createdAt: new Date().toISOString(),
      }
      // Register to local Dexie for admin management
      try {
        const { default: db } = await import('../db')
        const exists = await db.accounts.get(localAccount.id)
        if (!exists) await db.accounts.add(localAccount)
        await onAccountsChange?.()
      } catch { /* ignore */ }
      onLoginSuccess?.(localAccount)
      showToast('登录成功', 'success')
    } catch (e: any) {
      showToast(e?.message || '验证失败', 'error')
    }
    setSmsLoading(false)
  }

  useEffect(() => {
    if (smsCountdown <= 0) return
    const timer = window.setInterval(() => setSmsCountdown(p => Math.max(0, p - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [smsCountdown])

  const requestRegCaptcha = () => {
    if (!regForm.phone) {
      showToast('请先填写手机号', 'error')
      return
    }
    if (regCountdown > 0) return
    showToast('验证码已发送，本地演示可直接填写任意数字', 'info')
    setRegCountdown(60)
  }

  const requestForgotCaptcha = () => {
    if (!forgotForm.username) {
      showToast('请先填写账号、邮箱或手机号', 'error')
      return
    }
    if (forgotCountdown > 0) return
    showToast('验证码已发送，本地演示可直接填写任意数字', 'info')
    setForgotCountdown(60)
  }

  return (
    <div className="relative min-h-screen overflow-y-auto overflow-x-hidden bg-[#090506] lg:overflow-hidden">
      <CanvasBackground />
      <QPagoda />

      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-xl px-6 py-3 font-medium glass-panel ${
              toastType === 'success'
                ? 'bg-green-500/20 border-green-500/30 text-green-300'
                : toastType === 'error'
                  ? 'bg-red-500/20 border-red-500/30 text-red-300'
                  : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
            }`}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <div className="absolute left-5 top-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-amber-100/70 backdrop-blur-xl">
            <img src={logoUrl} alt="" className="brand-mark h-6 w-6 rounded-lg" />
            <span>晋梆智绎</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center border-b border-white/10 px-8 pb-10 pt-24 lg:w-1/2 lg:border-b-0 lg:border-r lg:px-16 lg:py-20">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-8">
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="晋梆智绎" className="brand-mark h-14 w-14 rounded-2xl" />
              <span className="bg-gradient-to-r from-amber-100 to-amber-300 bg-clip-text font-serif text-2xl font-bold text-transparent">
                晋梆智绎
              </span>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mb-6 max-w-2xl font-serif text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-r from-amber-100 via-amber-300 to-emerald-100 bg-clip-text text-transparent">
              三晋非遗数字化赋能平台
            </span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10 max-w-xl text-lg leading-relaxed text-white/72">
            汇集晋剧观赏、汉服租赁、文创商城、脸谱工坊与文化地图，让非遗内容从浏览、学习到体验自然流转。
          </motion.p>
          <div className="flex flex-wrap gap-3">
            {['晋剧演艺', '汉服租赁', '非遗文创', '脸谱创作'].map((tag) => (
              <div key={tag} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-amber-100/82">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {tag}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center px-8 pb-14 pt-8 lg:w-1/2 lg:px-16 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-md">
            <div className="rounded-3xl p-8 glass-window">
              <AnimatePresence mode="wait">
                {currentView === 'login' && (
                  <motion.div key="login" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                    <FormTitle title="身份验证" />
                    <form onSubmit={handleLogin} className="space-y-6">
                      <Field label="账号 / 邮箱 / 手机号" icon={<User className="h-5 w-5" />}>
                        <input
                          value={loginForm.username}
                          onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                          placeholder="请输入账号、邮箱或手机号"
                          className="w-full rounded-xl px-12 py-3.5 text-white outline-none placeholder-white/40 glass-control focus:border-amber-500/50"
                        />
                      </Field>
                      <PasswordField
                        label="密码"
                        value={loginForm.password}
                        visible={loginForm.showPassword}
                        placeholder="请输入密码"
                        onChange={(value) => setLoginForm((prev) => ({ ...prev, password: value }))}
                        onToggle={() => setLoginForm((prev) => ({ ...prev, showPassword: !prev.showPassword }))}
                      />
                      <SubmitButton loading={isLoading} loadingText="登录中..." text="确认登录" />
                    </form>
                    <div className="flex justify-between text-sm">
                      <button type="button" onClick={() => setCurrentView('forgot')} className="text-white/50 transition hover:text-amber-400">
                        忘记密码？
                      </button>
                      <button type="button" onClick={() => setCurrentView('email')} className="text-emerald-400/80 transition hover:text-emerald-300">
                        📧 邮箱登录
                      </button>
                      <button type="button" onClick={() => setCurrentView('sms')} className="text-blue-400/80 transition hover:text-blue-300">
                        📱 短信登录
                      </button>
                      <button type="button" onClick={() => setCurrentView('register')} className="text-amber-400/80 transition hover:text-amber-300">
                        注册账户
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentView === 'register' && (
                  <motion.div key="register" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-5">
                    <FormTitle title="账户注册" />
                    <form onSubmit={handleRegister} className="space-y-4">
                      <Field label="登录账号" icon={<User className="h-5 w-5" />}>
                        <input value={regForm.username} onChange={(event) => setRegForm((prev) => ({ ...prev, username: event.target.value }))} placeholder="请设置登录账号" className="w-full rounded-xl px-12 py-3.5 text-white outline-none placeholder-white/40 glass-control focus:border-amber-500/50" />
                      </Field>
                      <Field label="昵称" icon={<User className="h-5 w-5" />}>
                        <input value={regForm.displayName} onChange={(event) => setRegForm((prev) => ({ ...prev, displayName: event.target.value }))} placeholder="用于个人资料展示" className="w-full rounded-xl px-12 py-3.5 text-white outline-none placeholder-white/40 glass-control focus:border-amber-500/50" />
                      </Field>
                      <Field label="邮箱" icon={<Mail className="h-5 w-5" />}>
                        <input value={regForm.email} onChange={(event) => setRegForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="请输入邮箱" className="w-full rounded-xl px-12 py-3.5 text-white outline-none placeholder-white/40 glass-control focus:border-amber-500/50" />
                      </Field>
                      <Field label="手机号" icon={<Phone className="h-5 w-5" />}>
                        <input value={regForm.phone} onChange={(event) => setRegForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="请输入手机号" className="w-full rounded-xl px-12 py-3.5 text-white outline-none placeholder-white/40 glass-control focus:border-amber-500/50" />
                      </Field>
                      <CaptchaField value={regForm.captcha} countdown={regCountdown} onChange={(value) => setRegForm((prev) => ({ ...prev, captcha: value }))} onRequest={requestRegCaptcha} />
                      <PasswordField label="设置密码" value={regForm.password} visible={regForm.showPassword} placeholder="请设置密码" onChange={(value) => setRegForm((prev) => ({ ...prev, password: value }))} onToggle={() => setRegForm((prev) => ({ ...prev, showPassword: !prev.showPassword }))} />
                      <SubmitButton loading={isLoading} loadingText="注册中..." text="立即注册" />
                    </form>
                    <div className="text-center">
                      <button type="button" onClick={() => setCurrentView('login')} className="text-sm text-amber-400/80 transition hover:text-amber-300">
                        已有账号？返回登录
                      </button>
                    </div>
                  </motion.div>
                )}

                {currentView === 'forgot' && (
                  <motion.div key="forgot" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                    <FormTitle title="重置密码" />
                    <form onSubmit={handleForgotSubmit} className="space-y-6">
                      <Field label="账号 / 邮箱 / 手机号" icon={<User className="h-5 w-5" />}>
                        <input value={forgotForm.username} onChange={(event) => setForgotForm((prev) => ({ ...prev, username: event.target.value }))} placeholder="请输入需要重置的账户" className="w-full rounded-xl px-12 py-3.5 text-white outline-none placeholder-white/40 glass-control focus:border-amber-500/50" />
                      </Field>
                      <CaptchaField value={forgotForm.captcha} countdown={forgotCountdown} onChange={(value) => setForgotForm((prev) => ({ ...prev, captcha: value }))} onRequest={requestForgotCaptcha} />
                      <PasswordField label="新密码" value={forgotForm.newPassword} visible={forgotForm.showPassword} placeholder="请设置新密码" onChange={(value) => setForgotForm((prev) => ({ ...prev, newPassword: value }))} onToggle={() => setForgotForm((prev) => ({ ...prev, showPassword: !prev.showPassword }))} />
                      <SubmitButton loading={isLoading} loadingText="重置中..." text="确认重置" />
                    </form>
                    <div className="text-center">
                      <button type="button" onClick={() => setCurrentView('login')} className="text-sm text-amber-400/80 transition hover:text-amber-300">
                        返回登录
                      </button>
                    </div>
                  </motion.div>
                )}
                {currentView === 'email' && (
                  <motion.div key="email" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                    <FormTitle title={emailRegister ? "邮箱注册" : "邮箱验证码登录"} />
                    <div className="space-y-4">
                                            <div className="flex justify-between items-center"><span className="text-xs text-white/40">{emailRegister ? "新用户注册" : "已有账号登录"}</span><button type="button" onClick={() => setEmailRegister(p => !p)} className="text-xs text-amber-400/70 hover:text-amber-300">{emailRegister ? "切换登录" : "切换注册"}</button></div>
{emailStep === 'input' ? (
                        <>
                          <Field label="邮箱地址" icon={<Mail className="h-5 w-5" />}>
                            <input type="email" value={emailForm.email} onChange={e => setEmailForm(p => ({ ...p, email: e.target.value }))}
                              placeholder="请输入邮箱" className="w-full rounded-xl px-11 py-3 text-white outline-none placeholder-white/30 glass-control" />
                          </Field>
                          <SubmitButton loading={emailLoading} loadingText="发送中..." text="发送验证码" onClick={sendVerificationCode} />
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-amber-300 text-center mb-2">验证码已发送至 {emailForm.email}{emailRegister ? "（注册新账号）" : ""}</div>
                          <Field label="验证码" icon={<Lock className="h-5 w-5" />}>
                            <input type="text" value={emailForm.code} onChange={e => setEmailForm(p => ({ ...p, code: e.target.value }))}
                              placeholder="请输入6位验证码" className="w-full rounded-xl px-11 py-3 text-white outline-none placeholder-white/30 glass-control" />
                          </Field>
                          <SubmitButton loading={emailLoading} loadingText="验证中..." text="确认登录" onClick={verifyEmailLogin} />
                          <button type="button" onClick={sendVerificationCode} disabled={emailCountdown > 0}
                            className="w-full text-sm text-white/40 hover:text-amber-400 disabled:opacity-30">{emailCountdown > 0 ? `${emailCountdown}秒后重发` : '重新发送验证码'}</button>
                        </>
                      )}
                    </div>
                    <div className="text-center text-sm">
                      <button type="button" onClick={() => { setCurrentView('login'); setEmailStep('input') }} className="text-amber-400/80">返回密码登录</button>
                    </div>
                  </motion.div>
                )}
                {currentView === 'sms' && (
                  <motion.div key="sms" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                    <FormTitle title={smsRegister ? "手机号注册" : "手机验证码登录"} />
                    <div className="space-y-4">
                                            <div className="flex justify-between items-center"><span className="text-xs text-white/40">{smsRegister ? "新用户注册" : "已有账号登录"}</span><button type="button" onClick={() => setSmsRegister(p => !p)} className="text-xs text-amber-400/70 hover:text-amber-300">{smsRegister ? "切换登录" : "切换注册"}</button></div>
{smsStep === 'input' ? (
                        <>
                          <Field label="手机号" icon={<Phone className="h-5 w-5" />}>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 text-sm shrink-0">+86</span>
                              <input type="tel" value={smsForm.phone} onChange={e => setSmsForm(p => ({ ...p, phone: e.target.value }))}
                                placeholder="请输入手机号" className="flex-1 rounded-xl px-4 py-3 text-white outline-none placeholder-white/30 glass-control" />
                            </div>
                          </Field>
                          <SubmitButton loading={smsLoading} loadingText="发送中..." text="发送验证码" onClick={sendSmsCode} />
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-amber-300 text-center mb-2">验证码已发送至 +86 {smsForm.phone}{smsRegister ? "（注册新账号）" : ""}</div>
                          <Field label="验证码" icon={<Lock className="h-5 w-5" />}>
                            <input type="text" value={smsForm.code} onChange={e => setSmsForm(p => ({ ...p, code: e.target.value }))}
                              placeholder="请输入验证码" className="w-full rounded-xl px-11 py-3 text-white outline-none placeholder-white/30 glass-control" />
                          </Field>
                          <SubmitButton loading={smsLoading} loadingText="验证中..." text="确认登录" onClick={verifySmsLogin} />
                          <button type="button" onClick={sendSmsCode} disabled={smsCountdown > 0}
                            className="w-full text-sm text-white/40 hover:text-amber-400 disabled:opacity-30">{smsCountdown > 0 ? `${smsCountdown}秒后重发` : '重新发送验证码'}</button>
                        </>
                      )}
                    </div>
                    <div className="text-center text-sm">
                      <button type="button" onClick={() => { setCurrentView('login'); setSmsStep('input') }} className="text-amber-400/80">返回密码登录</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="pointer-events-none fixed left-4 top-4 z-50 h-16 w-16 border-l border-t border-amber-500/20" />
      <div className="pointer-events-none fixed right-4 top-4 z-50 h-16 w-16 border-r border-t border-amber-500/20" />
      <div className="pointer-events-none fixed bottom-4 left-4 z-50 h-16 w-16 border-l border-b border-amber-500/20" />
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 h-16 w-16 border-r border-b border-amber-500/20" />

      {/* 底部链接 */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center gap-6 text-xs text-white/40">
        <a href="./privacy.html" target="_blank" className="hover:text-amber-400 transition-colors">隐私政策</a>
        <span className="text-white/20">|</span>
        <a href="./support.html" target="_blank" className="hover:text-amber-400 transition-colors">支持信息</a>
      </div>
    </div>
  )
}

function FormTitle({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="flex items-center gap-3 font-serif text-2xl font-bold text-white">
        <span className="h-8 w-1 rounded-full bg-amber-500" />
        {title}
      </h2>
    </div>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-white/60">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/50">{icon}</span>
        {children}
      </div>
    </div>
  )
}

function PasswordField({
  label,
  value,
  visible,
  placeholder,
  onChange,
  onToggle,
}: {
  label: string
  value: string
  visible: boolean
  placeholder: string
  onChange: (value: string) => void
  onToggle: () => void
}) {
  return (
    <Field label={label} icon={<Lock className="h-5 w-5" />}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-12 py-3.5 text-white outline-none placeholder-white/40 glass-control focus:border-amber-500/50"
      />
      <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500/50 transition hover:text-amber-400">
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </Field>
  )
}

function CaptchaField({
  value,
  countdown,
  onChange,
  onRequest,
}: {
  value: string
  countdown: number
  onChange: (value: string) => void
  onRequest: () => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-white/60">验证码</label>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500/50" />
          <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="请输入验证码" className="w-full rounded-xl px-12 py-3.5 text-white outline-none placeholder-white/40 glass-control focus:border-amber-500/50" />
        </div>
        <button
          type="button"
          onClick={onRequest}
          disabled={countdown > 0}
          className={`rounded-xl px-5 py-3.5 transition-all ${countdown > 0 ? 'glass-control text-white/50' : 'glass-control bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}`}
        >
          {countdown > 0 ? (
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {countdown}s
            </span>
          ) : (
            '获取验证码'
          )}
        </button>
      </div>
    </div>
  )
}

function SubmitButton({ loading, loadingText, text, onClick }: { loading: boolean; loadingText: string; text: string; onClick?: () => void }) {
  return (
    <motion.button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={loading}
      className="w-full rounded-xl bg-gradient-to-r from-red-800 to-red-600 py-4 font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all hover:from-red-700 hover:to-red-500 disabled:opacity-70"
    >
      {loading ? loadingText : text}
    </motion.button>
  )
}
