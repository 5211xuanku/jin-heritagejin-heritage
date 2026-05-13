// ═══════════════════════════════════════════════
//  隐私政策页面
// ═══════════════════════════════════════════════

import React from 'react'

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen ios-app-bg text-white/90 px-6 py-8 max-w-3xl mx-auto" style={{ paddingTop: 50 }}>
      <h1 className="text-2xl font-bold text-center mb-2">隐私政策</h1>
      <p className="text-center text-xs text-white/40 mb-8">更新日期：2026年5月10日 | 生效日期：2026年5月10日</p>

      <div className="space-y-6 text-sm leading-relaxed text-white/80">
        <section>
          <h2 className="text-base font-bold text-white mb-2">一、引言</h2>
          <p>晋梆智绎（以下简称"我们"）非常重视用户的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。请您在使用我们的产品和服务前，仔细阅读本隐私政策。</p>
          <p className="mt-2">本隐私政策适用于您通过以下方式访问和使用我们的服务：</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>网页端：https://jinbangzhiyi.online</li>
            <li>桌面应用端（如有）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">二、我们收集的信息</h2>
          <h3 className="text-sm font-semibold text-white/90 mt-3 mb-1">2.1 您主动提供的信息</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>账户信息</strong>：用户名、密码、显示名称</li>
            <li><strong>订单信息</strong>：收货地址、联系电话、租赁日期</li>
            <li><strong>反馈信息</strong>：您提交的评论、评分、建议</li>
          </ul>
          <h3 className="text-sm font-semibold text-white/90 mt-3 mb-1">2.2 自动收集的信息</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>设备信息</strong>：浏览器类型、操作系统、屏幕分辨率</li>
            <li><strong>使用数据</strong>：页面访问记录、功能使用频率、停留时长</li>
            <li><strong>本地存储</strong>：使用浏览器 IndexedDB 在本地存储您的偏好设置和浏览数据</li>
          </ul>
          <h3 className="text-sm font-semibold text-white/90 mt-3 mb-1">2.3 我们不收集的信息</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>我们不收集您的精确地理位置信息</li>
            <li>我们不收集您的通讯录、短信、通话记录</li>
            <li>我们不收集您的生物识别信息</li>
            <li>我们不向第三方获取您的个人信息</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">三、信息的使用目的</h2>
          <p>我们收集的信息将用于以下目的：</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>提供、维护和改进我们的产品和服务</li>
            <li>处理您的订单和租赁请求</li>
            <li>提供客户服务和技术支持</li>
            <li>向您推送产品更新和活动通知（如有）</li>
            <li>改善用户体验和产品功能</li>
            <li>保障平台安全和防止欺诈行为</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">四、信息的存储与安全</h2>
          <h3 className="text-sm font-semibold text-white/90 mt-3 mb-1">4.1 存储方式</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>本地存储</strong>：您的数据首先存储在浏览器本地（IndexedDB），确保离线可用</li>
            <li><strong>云端存储</strong>：在您开启同步功能后，数据将加密传输并存储在腾讯云 CloudBase 服务器上</li>
          </ul>
          <h3 className="text-sm font-semibold text-white/90 mt-3 mb-1">4.2 安全措施</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>全站 HTTPS 加密传输</li>
            <li>云函数权限控制，防止未授权访问</li>
            <li>敏感信息（密码等）不存储明文</li>
            <li>定期检查和更新安全策略</li>
          </ul>
          <h3 className="text-sm font-semibold text-white/90 mt-3 mb-1">4.3 数据存储期限</h3>
          <p>我们仅在实现本政策所述目的所必需的期限内保留您的个人信息。当您注销账户或要求删除数据时，我们将在30天内删除您的个人信息。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">五、信息的共享与披露</h2>
          <p>我们不会将您的个人信息出售给任何第三方。仅在以下情况下可能共享：</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><strong>服务提供商</strong>：腾讯云（数据存储和处理），其受严格的保密协议约束</li>
            <li><strong>法律要求</strong>：根据法律法规、法律程序或政府要求</li>
            <li><strong>用户同意</strong>：在获得您明确同意的情况下</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">六、您的权利</h2>
          <p>根据相关法律法规，您享有以下权利：</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><strong>访问权</strong>：查看您的个人信息</li>
            <li><strong>更正权</strong>：修改不准确或不完整的信息</li>
            <li><strong>删除权</strong>：要求删除您的个人信息</li>
            <li><strong>撤回同意</strong>：随时关闭云端同步功能</li>
            <li><strong>数据可携带</strong>：导出您的本地数据</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">七、未成年人保护</h2>
          <p>我们的产品面向所有年龄段的用户。如果您是未满14周岁的未成年人，请在监护人的指导下使用本产品，并在监护人同意后提供个人信息。我们不会在知情的情况下收集未满14周岁未成年人的个人信息。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">八、Cookie 和类似技术</h2>
          <p>我们使用浏览器本地存储（IndexedDB、localStorage）来保存您的偏好设置和本地数据，以提供更好的用户体验。这些数据存储在您的设备本地，不会自动上传到服务器。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">九、隐私政策的更新</h2>
          <p>我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，并更新"更新日期"。重大变更将通过应用内通知或其他方式告知您。建议您定期查看本政策以了解最新的隐私保护措施。</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-white mb-2">十、联系我们</h2>
          <p>如果您对本隐私政策有任何疑问、意见或建议，请通过以下方式联系我们：</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li><strong>项目名称</strong>：晋梆智绎</li>
            <li><strong>服务地址</strong>：https://jinbangzhiyi.online</li>
            <li><strong>云服务提供商</strong>：腾讯云 CloudBase</li>
          </ul>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/30">
        <p>© 2026 晋梆智绎 版权所有</p>
      </div>
    </div>
  )
}

export default PrivacyPolicy
