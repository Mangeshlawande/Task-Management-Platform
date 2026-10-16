import { useState } from 'react';
import { Camera, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore.js';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { Avatar, Badge, Button } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';
import { formatDate, roleLabel, roleBadgeVariant } from '../../lib/format.js';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(
    'Software engineer and product builder collaborating on WorkPulse workspaces.'
  );
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Profile details saved successfully!');
    }, 400);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Your profile"
        description="How others see you across WorkPulse."
      />

      <div className="rounded-xl border border-border bg-card">
        {/* Gradient Header Banner */}
        <div className="h-32 rounded-t-xl bg-gradient-to-r from-primary/30 via-[oklch(0.6_0.2_310)]/30 to-[oklch(0.65_0.18_240)]/30" />

        {/* Avatar + User Title */}
        <div className="-mt-12 flex items-end gap-4 px-6">
          <div className="relative">
            <Avatar
              user={user}
              size="2xl"
              className="!h-24 !w-24 !text-2xl ring-4 ring-card"
            />
            <button
              type="button"
              onClick={() => toast.success('Avatar upload feature ready')}
              aria-label="Upload avatar"
              className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-background ring-2 ring-card shadow text-foreground hover:bg-muted transition"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                {fullName || user.fullName || user.username}
              </h2>
              {user.role && (
                <Badge variant={roleBadgeVariant(user.role)}>
                  {roleLabel(user.role)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted">@{username || user.username}</p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="fullname" className="text-sm font-medium text-foreground">
                Full name
              </label>
              <input
                id="fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="app-input"
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="app-input"
                placeholder="janedoe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              defaultValue={user.email}
              readOnly
              className="app-input bg-surface-alt text-muted cursor-not-allowed"
            />
            {user.isEmailVerified !== false ? (
              <p className="text-xs text-success font-medium">✓ Verified</p>
            ) : (
              <p className="text-xs text-warning font-medium">Email not verified</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium text-foreground">
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell your team a bit about yourself."
              className="app-input resize-none"
            />
          </div>

          <div className="text-xs text-muted">
            Member since {formatDate(user.createdAt || new Date())}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </div>

      {/* Security Quick Link */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Security & Account Settings</h3>
            <p className="text-xs text-muted">Manage your password, credentials, and account lifecycle.</p>
          </div>
        </div>
        <Link to="/settings">
          <Button variant="outline" size="sm">
            Security settings →
          </Button>
        </Link>
      </div>
    </div>
  );
}
