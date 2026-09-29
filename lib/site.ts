/** 站点常量：客户端与服务端都可引用，不含任何 node 依赖 */
export const SITE = {
  name: 'DSHub',
  title: 'DSHub · DeepSeek Harness 社区插件',
  description:
    'DSHub 是 DeepSeek Harness（DSH）社区插件收录站：浏览、搜索、一键安装群友与社区开源的 DSH 插件。',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  repo: 'https://github.com/deepseek-ai/deepseek-harness',
  topicUrl: 'https://github.com/topics/dsh-plugin',
}
