'use client';

import { useState, useEffect } from 'react';

export default function TermsOfService() {
    const [showTerms, setShowTerms] = useState(false);
    const [agreed, setAgreed] = useState(false);

    useEffect(() => {
        // 检查用户是否已同意条款
        const hasAgreed = localStorage.getItem('terms-agreed');
        if (!hasAgreed) {
            setShowTerms(true);
        }
    }, []);

    const handleAgree = () => {
        if (!agreed) {
            return;
        }
        localStorage.setItem('terms-agreed', 'true');
        setShowTerms(false);
    };

    if (!showTerms) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* 头部 */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        使用条款与免责声明
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        请仔细阅读以下条款，使用本项目即表示您已阅读并同意本声明
                    </p>
                </div>

                {/* 内容区域 */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-gray-700 dark:text-gray-300">
                    {/* 重要提示 */}
                    <div className="p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 rounded">
                        <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
                            ⚠️ 重要提示
                        </h3>
                        <p className="text-red-600 dark:text-red-300 font-medium">
                            本项目仅供个人学习、研究和技术交流使用，严禁用于任何商业用途。
                        </p>
                    </div>

                    {/* 1. 数据来源 */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                            1. 数据来源
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>本项目不存储、不托管任何视频或图片数据</li>
                            <li>所有内容均通过第三方 API（TikTokDownloader）获取</li>
                            <li>本项目仅作为技术工具，不对第三方 API 的合法性负责</li>
                        </ul>
                    </section>

                    {/* 2. 版权声明 */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                            2. 版权声明
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>使用本项目下载的所有内容，版权归原作者所有</li>
                            <li>下载的内容仅供个人学习研究，不得用于商业用途</li>
                            <li>不得将下载内容进行二次传播、售卖或用于其他侵权行为</li>
                            <li>请在下载后 24 小时内删除，如需长期保存请购买正版</li>
                        </ul>
                    </section>

                    {/* 3. 法律责任 */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                            3. 法律责任
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>用户使用本项目所产生的一切法律责任，由用户本人承担</li>
                            <li>本项目开发者不对用户的任何违法违规行为负责</li>
                            <li>本项目不鼓励、不支持任何侵犯版权的行为</li>
                            <li>使用本项目即表示您已阅读并同意本免责声明</li>
                        </ul>
                    </section>

                    {/* 4. 使用限制 */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                            4. 使用限制
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>请遵守《中华人民共和国著作权法》及相关法律法规</li>
                            <li>请遵守内容平台的用户协议和服务条款</li>
                            <li>请尊重内容创作者的劳动成果和知识产权</li>
                            <li>不得使用本项目进行大规模爬取、数据挖掘等行为</li>
                            <li>不得将本项目用于任何违法违规用途</li>
                        </ul>
                    </section>

                    {/* 5. 侵权处理 */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                            5. 侵权处理
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>如发现本项目侵犯了您的合法权益，请及时联系删除</li>
                            <li>我们将在收到通知后尽快处理相关内容</li>
                            <li>联系方式：请通过 GitHub Issues 提交</li>
                        </ul>
                    </section>

                    {/* 6. 风险提示 */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                            6. 风险提示
                        </h3>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>使用本项目可能违反目标平台的服务条款，可能导致账号被封禁</li>
                            <li>频繁请求可能触发平台的反爬虫机制</li>
                            <li>下载的内容可能存在版权风险，请谨慎使用</li>
                            <li>本项目不保证服务的稳定性和可用性</li>
                        </ul>
                    </section>

                    {/* 最终声明 */}
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 rounded">
                        <p className="text-yellow-800 dark:text-yellow-300 font-bold text-center">
                            再次强调：本项目仅供学习研究，请勿用于任何商业或非法用途！
                        </p>
                    </div>
                </div>

                {/* 底部操作 */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            我已仔细阅读并同意以上所有条款，承诺仅将本项目用于个人学习研究，不用于任何商业或非法用途
                        </span>
                    </label>

                    <button
                        onClick={handleAgree}
                        disabled={!agreed}
                        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {agreed ? '同意并继续' : '请先勾选同意条款'}
                    </button>

                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        点击"同意并继续"即表示您已充分理解并接受上述所有条款
                    </p>
                </div>
            </div>
        </div>
    );
}
