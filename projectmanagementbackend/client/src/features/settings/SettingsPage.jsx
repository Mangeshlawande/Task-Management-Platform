import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, KeyRound, Eye, EyeOff, ShieldCheck, LogOut } from 'lucide-react';
import { ApiError } from '../../api/client.js';
import { authApi } from '../../api/auth.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useForm } from '../../lib/useForm.js';
import { validatePassword } from '../../lib/validators.js';
import { roleLabel, roleBadgeVariant } from '../../lib/format.js';
import { Avatar, Badge, Button, Field } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';

const initial = { oldPassword: '', newPassword: '', confirmPassword: '' };

const validate = (v) => {
  const errors = {};
  if (!v.oldPassword) errors.oldPassword = 'Current password is required';
  const p = validatePassword(v.newPassword);
  if (p) errors.newPassword = p;
  else if (v.oldPassword && v.newPassword === v.oldPassword) {
    errors.newPassword = 'New password must be different from the current one';
  }
  if (v.confirmPassword !== v.newPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
};

/**
 * P1.8 — Settings: profile display + change password.
 * Contract: POST /auth/change-password → 200 and the server REVOKES sessions
 * (refresh token unset, cookies cleared) → per docs/04 § 7 we clear client
 * state and send the user to /login with an explanatory banner.
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [showPasswords, setShowPasswords] = useState(false);
  const [formError, setFormError] = useState(null);

  // A missing `isEmailVerified` means the account predates OTP verification and
  // the backend treats it as verified (docs/04 § 1) — mirror that rule exactly
  // instead of showing a scary "not verified" for old accounts.
  const emailVerified = user?.isEmailVerified !== false;

  const form = useForm(initial, validate, async (values) => {
    setFormError(null);
    try {
      await authApi.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      toast.success('Password changed — please log in with your new password.');
      clearSession(); // server already revoked cookies + refresh token
      navigate('/login', {
        replace: true,
        state: { reason: 'password-changed', username: user?.username ?? null },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && !Object.keys(err.fieldErrors || {}).length) {
        // 401 = wrong current password (or expired session → refresh-retry already ran)
        form.setErrors((e) => ({ ...e, oldPassword: 'Current password is incorrect' }));
      } else if (!(err instanceof ApiError)) {
        setFormError('Something went wrong. Please try again.');
      }
      // 400 validation fieldErrors are mapped by useForm automatically
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ── Profile ─────────────────────────────────────────── */}
      <section className="app-card p-6">
        <h1 className="text-lg font-semibold text-foreground dark:text-dark-foreground">Profile</h1>
        <div className="mt-4 flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium text-foreground dark:text-dark-foreground">
                {user?.fullName || user?.username}
              </p>
              <Badge variant={roleBadgeVariant(user?.role)}>{roleLabel(user?.role)}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="truncate text-sm text-muted dark:text-dark-muted">
                @{user?.username} · {user?.email}
              </p>
              <Badge
                variant={emailVerified ? 'success' : 'warning'}
                className="gap-1"
              >
                {emailVerified ? (
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                ) : (
                  <AlertCircle className="h-3 w-3" aria-hidden />
                )}
                {emailVerified ? 'Email verified' : 'Email not verified'}
              </Badge>
            </div>
            {!emailVerified && (
              <p className="mt-1 text-xs text-warning">
                Verify this address with the code sent at sign-up before your next login.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Change password ─────────────────────────────────── */}
      <section className="app-card p-6">
        <h2 className="text-lg font-semibold text-foreground dark:text-dark-foreground">Change password</h2>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          After changing your password you&rsquo;ll be signed out everywhere and asked to log in again.
        </p>

        {formError && (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {formError}
          </div>
        )}

        <form className="mt-5 space-y-4" onSubmit={form.handleSubmit} noValidate>
          <Field label="Current password" htmlFor="oldPassword" error={form.errors.oldPassword}>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="oldPassword"
                name="oldPassword"
                type={showPasswords ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className={`app-input pl-9 ${form.errors.oldPassword ? 'app-input-error' : ''}`}
                value={form.values.oldPassword}
                onChange={form.handleChange}
                aria-invalid={!!form.errors.oldPassword}
              />
            </div>
          </Field>

          <Field
            label="New password"
            htmlFor="newPassword"
            error={form.errors.newPassword}
            hint="At least 8 characters"
          >
            <div className="relative">
              <input
                id="newPassword"
                name="newPassword"
                type={showPasswords ? 'text' : 'password'}
                required
                autoComplete="new-password"
                className={`app-input pr-10 ${form.errors.newPassword ? 'app-input-error' : ''}`}
                value={form.values.newPassword}
                onChange={form.handleChange}
                aria-invalid={!!form.errors.newPassword}
              />
              <button
                type="button"
                onClick={() => setShowPasswords((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground"
                aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
              >
                {showPasswords ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </Field>

          <Field label="Confirm new password" htmlFor="confirmPassword" error={form.errors.confirmPassword}>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPasswords ? 'text' : 'password'}
                required
                autoComplete="new-password"
                className={`app-input pl-9 ${form.errors.confirmPassword ? 'app-input-error' : ''}`}
                value={form.values.confirmPassword}
                onChange={form.handleChange}
                aria-invalid={!!form.errors.confirmPassword}
              />
            </div>
          </Field>

          <Button type="submit" loading={form.submitting}>
            {form.submitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </section>

      {/* ── Danger zone (delete account ships in a later phase) ── */}
      <section className="app-card border-danger/30 p-6 dark:border-danger/40">
        <h2 className="text-lg font-semibold text-danger">Danger zone</h2>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Permanently delete your account and everything you own. This action cannot be undone.
        </p>
        <Button variant="danger" className="mt-4" disabled>
          <LogOut className="h-4 w-4" aria-hidden />
          Delete account — coming soon
        </Button>
      </section>
    </div>
  );
}
