import Icon from './Icon'

export default function Hint({ text }: { text: string }) {
  return (
    <span className="hint" tabIndex={0} aria-label={text}>
      <Icon name="info" size={13} />
      <span className="hint-pop" role="tooltip">{text}</span>
    </span>
  )
}