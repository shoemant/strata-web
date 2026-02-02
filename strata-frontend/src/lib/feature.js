// lib/features.js
export const FEATURES = [
  'announcements',
  'documents',
  'resources',
  'polls',
  'maintenance',
];

export function isFeatureEnabled(row, role, key) {
  const base = row?.[`base_${key}`] !== false; // default true
  const override = row?.[`${role}_${key}_override`]; // null | true | false | undefined
  const roleAllows = override == null ? true : override;
  return base && roleAllows;
}

export function resolveEnabledFeatures(row, role) {
  const enabled = {};
  for (const k of FEATURES) enabled[k] = isFeatureEnabled(row, role, k);
  return enabled;
}
