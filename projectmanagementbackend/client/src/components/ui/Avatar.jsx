const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-14 w-14 text-lg' };

const palette = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-violet-500',
];

const colorFor = (seed = '') => {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return palette[hash % palette.length];
};

const initialsOf = (user = {}) => {
  const name = user.fullName || user.username || '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
};

export function Avatar({ user, size = 'md' }) {
  const hasRealAvatar = user?.avatar?.url && !user.avatar.url.includes('placehold.co');

  if (hasRealAvatar) {
    return (
      <img
        src={user.avatar.url}
        alt={user.fullName || user.username || 'avatar'}
        className={`${sizes[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`grid ${sizes[size]} place-items-center rounded-full font-semibold text-white ${colorFor(
        user?.username || user?._id || 'x',
      )}`}
    >
      {initialsOf(user)}
    </span>
  );
}
