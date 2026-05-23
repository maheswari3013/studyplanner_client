export default function GlassCard({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={`glass-card ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
