export function Skeleton({ w = '100%', h = 14, r = 8 }: { w?: number | string; h?: number; r?: number }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />
}

export function TableSkeleton({ rows = 3, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c}><Skeleton w={c === 0 ? 120 : 70} h={c === 0 ? 34 : 14} /></td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="card error-box" role="alert">
      <p>{message}</p>
      <button className="btn btn-ghost" type="button" onClick={onRetry}>Reintentar</button>
    </section>
  )
}