export default function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeOpacity=".3" />
      <path d="M16 5.5l2.3 8.2 8.2 2.3-8.2 2.3L16 26.5l-2.3-8.2L5.5 16l8.2-2.3z" fill="var(--accent)" />
    </svg>
  )
}
