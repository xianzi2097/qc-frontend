/**
 * CodeNova 品牌标 —— 四角新星（Nova）+ 橙色渐变圆角底座。
 * 纯内联 SVG：随主题缩放无损，无需图片资源。
 */
export default function LogoMark({ className = 'w-[22px] h-[22px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cn-logo-g" x1="5" y1="4" x2="27" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB923C" />
          <stop offset="0.55" stopColor="#F97316" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      {/* 底座 */}
      <rect width="32" height="32" rx="10" fill="url(#cn-logo-g)" />
      {/* 主新星 */}
      <path
        fill="#fff"
        d="M15 7 C 16.2 13.4, 19.6 16.8, 26 18 C 19.6 19.2, 16.2 22.6, 15 29 C 13.8 22.6, 10.4 19.2, 4 18 C 10.4 16.8, 13.8 13.4, 15 7 Z"
      />
      {/* 右上小伴星 */}
      <path
        fill="#fff"
        opacity="0.92"
        d="M24 4 C 24.6 7.2, 25.8 8.4, 29 9 C 25.8 9.6, 24.6 10.8, 24 14 C 23.4 10.8, 22.2 9.6, 19 9 C 22.2 8.4, 23.4 7.2, 24 4 Z"
      />
    </svg>
  );
}