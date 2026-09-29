import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 24, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  }
}

/** 品牌方块：官网同款立方体 */
export function BrandMark({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base({ size, ...rest })} stroke="#fff">
      <path d="M12 2.5 21 7.5v9l-9 5-9-5v-9l9-5z" />
      <path d="M12 12 21 7.5M12 12v9.5M12 12 3 7.5" />
    </svg>
  )
}

export function GithubIcon({ size = 19, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...rest}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.05.78 2.12 0 1.54-.01 2.77-.01 3.15 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  )
}

export function ArrowRight({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base({ size, strokeWidth: 2.2, ...rest })}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function ChevronRight({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base({ size, strokeWidth: 2.2, ...rest })}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function DownloadIcon({ size = 12, ...rest }: IconProps) {
  return (
    <svg {...base({ size, strokeWidth: 2.2, ...rest })}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
    </svg>
  )
}

export function StarIcon({ size = 12, ...rest }: IconProps) {
  return (
    <svg {...base({ size, strokeWidth: 2, ...rest })}>
      <path d="M12 3.5 14.4 9l6 .5-4.6 4 1.4 5.9L12 16.6 6.8 19.4 8.2 13.5 3.6 9.5l6-.5L12 3.5z" />
    </svg>
  )
}

export function SearchIcon({ size = 15, ...rest }: IconProps) {
  return (
    <svg {...base({ size, strokeWidth: 2, ...rest })}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20.5 20.5 16 16" />
    </svg>
  )
}

export function CopyIcon({ size = 12, ...rest }: IconProps) {
  return (
    <svg {...base({ size, strokeWidth: 2, ...rest })}>
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export function CheckIcon({ size = 12, ...rest }: IconProps) {
  return (
    <svg {...base({ size, strokeWidth: 2.4, ...rest })}>
      <path d="m4 12.5 5 5L20 6.5" />
    </svg>
  )
}

export function RssIcon({ size = 13, ...rest }: IconProps) {
  return (
    <svg {...base({ size, strokeWidth: 2.2, ...rest })}>
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ExternalIcon({ size = 13, ...rest }: IconProps) {
  return (
    <svg {...base({ size, strokeWidth: 2, ...rest })}>
      <path d="M14 4h6v6M20 4l-8.5 8.5" />
      <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </svg>
  )
}

export function TerminalIcon({ size = 12, ...rest }: IconProps) {
  return (
    <svg {...base({ size, strokeWidth: 2, ...rest })}>
      <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
      <path d="m7 10 2.5 2.5L7 15M12.5 15.5H17" />
    </svg>
  )
}
