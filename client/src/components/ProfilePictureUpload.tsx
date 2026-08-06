import { useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

/**
 * Self-service profile picture — shown once, near the top of the
 * profile form. Uploading replaces any existing picture (server-side
 * cleanup of the old file); Remove clears it back to the initials
 * fallback. Pushes the returned User back into AuthContext so the
 * Sidebar's own avatar updates immediately, not just this component.
 */
const ProfilePictureUpload = () => {
  const { user, updateUser } = useAuth();
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setBusy('upload');
    setError('');
    try {
      const updated = await apiService.uploadProfilePicture(file);
      updateUser(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture');
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    setBusy('remove');
    setError('');
    try {
      const updated = await apiService.deleteProfilePicture();
      updateUser(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to remove profile picture');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
      <Avatar
        userId={user.id}
        hasPicture={Boolean(user.profilePictureUrl)}
        name={`${user.firstName} ${user.lastName}`}
        size={72}
      />
      <div>
        {error && <p style={{ color: 'var(--error-text)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</p>}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>
          JPG or PNG, max 5MB — automatically resized and compressed.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <label className="btn btn-outline btn-sm" style={{ cursor: busy ? 'not-allowed' : 'pointer', margin: 0 }}>
            {busy === 'upload' ? 'Uploading...' : user.profilePictureUrl ? 'Change Picture' : 'Upload Picture'}
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              style={{ display: 'none' }}
              disabled={busy !== null}
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
          </label>
          {user.profilePictureUrl && (
            <button className="btn btn-outline btn-sm" type="button" disabled={busy !== null} onClick={handleRemove}>
              {busy === 'remove' ? 'Removing...' : 'Remove'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureUpload;
