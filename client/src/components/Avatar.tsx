import { useEffect, useState } from 'react';
import { apiService } from '../services/api';

interface AvatarProps {
  userId: number;
  // Skip the fetch attempt entirely when the caller already knows there's
  // no picture (e.g. from User.profilePictureUrl being empty) — avoids a
  // guaranteed-to-404 request on every list row.
  hasPicture?: boolean;
  name?: string;
  size?: number;
}

// Displays a user's profile picture as a circular avatar, fetched via an
// authenticated blob request (a plain <img src="/api/..."> can't include
// the Authorization header) — falls back to initials-on-a-solid-circle
// when there's no picture or the fetch fails.
const Avatar = ({ userId, hasPicture = true, name, size = 40 }: AvatarProps) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPicture) {
      setSrc(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    apiService
      .getProfilePictureBlob(userId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        // Non-fatal — falls back to the initials circle below.
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [userId, hasPicture]);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }

  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
    : '?';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--accent-purple)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(10, size * 0.4),
        fontWeight: 700,
        flexShrink: 0
      }}
    >
      {initials}
    </div>
  );
};

export default Avatar;
