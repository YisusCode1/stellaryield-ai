export default function UtilBar({ value, variant = 'bar' }: { value: number; variant?: 'bar' | 'pill' }) {
  if (variant === 'pill') return <span className="pill-util">{value}%</span>
  return (
    <div className="util">
      <div className="util-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div className="util-fill" style={{ width: `${value}%` }} />
      </div>
      <span>{value}%</span>
    </div>
  )
}
