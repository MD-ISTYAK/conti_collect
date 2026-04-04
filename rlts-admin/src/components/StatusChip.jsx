import { getStatusConfig } from '../utils/formatters';

const StatusChip = ({ status, size = 'sm' }) => {
  const config = getStatusConfig(status);

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-1.5 text-sm',
    lg: 'px-5 py-2 text-base',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${sizeClasses[size]} tracking-wide uppercase`}
      style={{
        backgroundColor: config.bg,
        color: config.textColor,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
};

export default StatusChip;
