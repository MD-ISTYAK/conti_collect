import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'M/d/yyyy, h:mm a');
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'M/d/yyyy, h:mm a');
};

export const formatRelativeTime = (date) => {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

export const statusConfig = {
  CREATED: { label: 'Created', color: '#6366F1', bg: '#EEF2FF', textColor: '#4338CA' },
  APPROVED: { label: 'Approved', color: '#06B6D4', bg: '#ECFEFF', textColor: '#0E7490' },
  CFA_ASSIGNED: { label: 'CFA Assigned', color: '#3B82F6', bg: '#EFF6FF', textColor: '#1D4ED8' },
  PICKED_UP: { label: 'Picked Up', color: '#14B8A6', bg: '#F0FDFA', textColor: '#0F766E' },
  RECEIVED_AT_CFA: { label: 'Received', color: '#22C55E', bg: '#F0FDF4', textColor: '#15803D' },
  VERIFIED: { label: 'Verified', color: '#EAB308', bg: '#FEFCE8', textColor: '#A16207' },
  REFUND_PROCESSED: { label: 'Refunded', color: '#10B981', bg: '#ECFDF5', textColor: '#047857' },
  REJECTED: { label: 'Rejected', color: '#EF4444', bg: '#FEF2F2', textColor: '#B91C1C' },
  PICKUP_SCHEDULED: { label: 'Pickup Scheduled', color: '#8B5CF6', bg: '#F5F3FF', textColor: '#6D28D9' },
  SCHEDULE_UPDATED: { label: 'Schedule Updated', color: '#6366F1', bg: '#EEF2FF', textColor: '#4338CA' },
  RESCHEDULE_REQUESTED: { label: 'Reschedule Req', color: '#F97316', bg: '#FFF7ED', textColor: '#C2410C' },
  PICKUP_PROPOSED: { label: 'Pickup Proposed', color: '#D946EF', bg: '#FDF4FF', textColor: '#A21CAF' },
  PICKUP_CONFIRMED: { label: 'Pickup Confirmed', color: '#0EA5E9', bg: '#F0F9FF', textColor: '#0369A1' },
};

export const getStatusConfig = (status) => statusConfig[status] || { label: status, color: '#94A3B8', bg: '#F8FAFC', textColor: '#475569' };

export const productTypeLabels = {
  tire: 'Tire',
  glass: 'Glass',
  motor_part: 'Motor Part',
  battery: 'Battery',
  other: 'Other',
};

export const reasonLabels = {
  defective: 'Defective',
  wrong_item: 'Wrong Item',
  damaged: 'Damaged',
  expired: 'Expired',
  other: 'Other',
};
