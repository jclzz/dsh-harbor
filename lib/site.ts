/** 站点常量：客户端与服务端都可引用，不含任何 node 依赖 */
export const SITE = {
  /** 中文名 */
  name: '插件港',
  /** 英文名（字标用） */
  nameEn: 'DSH Harbor',
  title: '插件港 · DeepSeek Harness 社区插件',
  description:
    '插件港（DSH Harbor）是 DeepSeek Harness（DSH）社区插件收录站：浏览、搜索、一键安装群友与社区开源的 DSH 插件。',
  /**
   * 站点绝对地址：canonical / OG / sitemap / 徽章 Markdown 都用它。
   * 部署时用 NEXT_PUBLIC_SITE_URL 覆盖；生产环境默认走正式域名，本地开发回落到 localhost。
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NODE_ENV === 'production' ? 'https://dshharbor.com' : 'http://localhost:3000'),
  repo: 'https://github.com/deepseek-ai/deepseek-harness',
  topicUrl: 'https://github.com/topics/dsh-plugin',
}
