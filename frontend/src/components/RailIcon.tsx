interface Props {
  size?: number;
  className?: string;
}

export default function RailIcon({ size = 20, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="2.5" height="18" rx="1.25" fill="currentColor" />
      <rect x="18.5" y="3" width="2.5" height="18" rx="1.25" fill="currentColor" />
      <rect x="3" y="5" width="18" height="2" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="3" y="17" width="18" height="2" rx="1" fill="currentColor" opacity="0.75" />
    </svg>
  );
}
