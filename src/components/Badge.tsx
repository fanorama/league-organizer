type BadgeStatus = 'setup' | 'active' | 'finished' | 'delayed' | 'scheduled' | 'error' | 'no season' | 'pool' | 'playoff_setup' | 'playoff_active';

const STATUS_CLASSES: Partial<Record<BadgeStatus, string>> = {
  setup: 'warning',
  active: 'success',
  delayed: 'warning',
  error: 'danger',
  playoff_setup: 'warning',
  playoff_active: 'warning',
};

const STATUS_LABELS: Partial<Record<BadgeStatus, string>> = {
  playoff_setup: 'Playoff Setup',
  playoff_active: 'Playoff',
};

interface BadgeProps {
  status: BadgeStatus | string;
}

export function Badge({ status }: BadgeProps) {
  const cls = STATUS_CLASSES[status as BadgeStatus] || '';
  const label = STATUS_LABELS[status as BadgeStatus] || status;
  return <span className={`badge ${cls}`}>{label}</span>;
}
