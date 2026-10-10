export default function Stars({ value, onChange, size = 28 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <span className="stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= value ? 'on' : ''}`}
          disabled={!onChange}
          onClick={() => onChange?.(n === value ? 0 : n)}
          aria-label={`${n}つ星`}
        >
          ★
        </button>
      ))}
    </span>
  )
}
