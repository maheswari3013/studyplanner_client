export default function StyledButton({ variant = 'secondary', className = '', children, ...props }) {
  const variantClass = variant === 'primary'
    ? 'btn-primary'
    : variant === 'generate'
      ? 'btn-generate'
      : variant === 'danger'
        ? 'btn-danger'
        : 'btn-secondary';

  return (
    <button className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
