import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 目录数据以 data/plugins.json 为唯一真源，运行时读写，不走打包器静态分析。
  serverExternalPackages: [],
}

export default nextConfig
