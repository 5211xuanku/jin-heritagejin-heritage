import { useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle, ChevronLeft, Clock, CreditCard, Receipt, Smartphone, X } from 'lucide-react'

type PaymentMethod = 'wechat' | 'alipay' | 'card'

type PaymentConfig = {
  orderId: string
  amount: number
  type: 'shop' | 'rental'
  summary?: { label: string; value: string }[]
}

type PaymentState = 'select' | 'qr' | 'card-input' | 'processing' | 'success'

export default function PaymentModal({
  config,
  onClose,
  onSuccess,
}: {
  config: PaymentConfig
  onClose: () => void
  onSuccess: () => void
}) {
  const [method, setMethod] = useState<PaymentMethod>('wechat')
  const [state, setState] = useState<PaymentState>('select')

  const methods: { id: PaymentMethod; icon: string; label: string; desc: string }[] = [
    { id: 'wechat', icon: '💚', label: '微信支付', desc: '扫二维码即可支付' },
    { id: 'alipay', icon: '💙', label: '支付宝', desc: '支持花呗/余额宝' },
    { id: 'card', icon: '💳', label: '银行卡', desc: '借记卡/信用卡' },
  ]

  const goPay = () => setState(method === 'card' ? 'card-input' : 'qr')
  const simulatePay = () => {
    setState('processing')
    window.setTimeout(() => setState('success'), 900)
  }
  const finish = () => {
    onSuccess()
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl glass-window p-5"
        onClick={e => e.stopPropagation()}
      >
        {state === 'select' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Receipt className="h-5 w-5 text-amber-400" />
                选择支付方式
              </h2>
              <button onClick={onClose} className="rounded-xl p-1.5 text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-2xl bg-white/5 p-3 text-center">
              <div className="mb-1 text-xs text-white/40">支付金额</div>
              <div className="text-3xl font-bold text-amber-400">¥{config.amount}</div>
              <div className="mt-1 text-xs text-white/30">订单号：{config.orderId}</div>
            </div>

            {config.summary && config.summary.length > 0 && (
              <div className="mb-4 space-y-1 rounded-2xl bg-white/5 p-3">
                {config.summary.map((item, index) => (
                  <div key={index} className="flex justify-between gap-3 text-xs">
                    <span className="text-white/50">{item.label}</span>
                    <span className="text-right text-white/80">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-4 space-y-2">
              {methods.map(item => (
                <button
                  key={item.id}
                  onClick={() => setMethod(item.id)}
                  className={`w-full rounded-2xl p-3 text-left transition-all ${method === item.id ? 'border border-amber-500/30 bg-amber-500/10' : 'glass-control hover:border-white/15'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="text-xs text-white/40">{item.desc}</div>
                    </div>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${method === item.id ? 'border-amber-400 bg-amber-400' : 'border-white/20'}`}>
                      {method === item.id && <div className="h-2 w-2 rounded-full bg-black" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button onClick={goPay} className="sticky bottom-0 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 py-3.5 font-bold text-white shadow-2xl shadow-black/25 transition-all hover:from-amber-400 hover:to-red-500">
              确认支付 ¥{config.amount}
            </button>
          </>
        )}

        {state === 'qr' && (
          <div className="text-center">
            <div className="mb-4 flex items-center gap-2">
              <button onClick={() => setState('select')} className="rounded-xl p-1.5 text-white/40 hover:text-white">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Smartphone className="h-5 w-5 text-amber-400" />
                扫码支付
              </h2>
            </div>
            <div className="mb-2 text-3xl font-bold text-amber-400">¥{config.amount}</div>
            <div className="mb-4 text-xs text-white/40">{method === 'wechat' ? '微信' : '支付宝'}扫一扫完成支付</div>
            <div className="mb-3 inline-block rounded-2xl bg-white p-4 shadow-lg">
              <QRCodeSVG value={JSON.stringify({ orderNo: config.orderId, amount: config.amount, type: config.type, method })} size={190} level="M" />
            </div>
            <div className="mb-4 flex items-center justify-center gap-1 text-xs text-white/30">
              <Clock className="h-3 w-3" />
              <span>请在15分钟内完成支付</span>
            </div>
            <button onClick={simulatePay} className="w-full rounded-2xl bg-green-500/20 py-3 text-sm font-bold text-green-300 hover:bg-green-500/30">
              模拟支付成功
            </button>
          </div>
        )}

        {state === 'card-input' && (
          <>
            <div className="mb-5 flex items-center gap-2">
              <button onClick={() => setState('select')} className="rounded-xl p-1.5 text-white/40 hover:text-white">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <CreditCard className="h-5 w-5 text-amber-400" />
                银行卡支付
              </h2>
            </div>
            <div className="mb-5 text-3xl font-bold text-amber-400">¥{config.amount}</div>
            <div className="mb-4 space-y-3">
              <input placeholder="卡号" className="w-full rounded-xl px-4 py-3 text-sm text-white glass-control" />
              <div className="flex gap-2">
                <input placeholder="MM/YY" className="flex-1 rounded-xl px-4 py-3 text-sm text-white glass-control" />
                <input placeholder="CVV" className="w-24 rounded-xl px-4 py-3 text-sm text-white glass-control" />
              </div>
              <input placeholder="持卡人姓名" className="w-full rounded-xl px-4 py-3 text-sm text-white glass-control" />
            </div>
            <button onClick={simulatePay} className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 py-3.5 font-bold text-white">
              支付 ¥{config.amount}
            </button>
          </>
        )}

        {state === 'processing' && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
            <p className="text-sm text-white/70">正在处理支付...</p>
            <p className="mt-1 text-xs text-white/30">请勿关闭此页面</p>
          </div>
        )}

        {state === 'success' && (
          <div className="py-6 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </motion.div>
            <h3 className="mb-2 text-xl font-bold text-white">支付成功</h3>
            <p className="mb-1 text-sm text-white/50">¥{config.amount}</p>
            <p className="mb-6 text-xs text-white/30">{config.orderId}</p>
            <button onClick={finish} className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 py-3.5 font-bold text-white hover:from-amber-400 hover:to-red-500">
              完成
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
