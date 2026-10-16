import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/client.js';
import { authApi } from '../../api/auth.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useForm } from '../../lib/useForm.js';
import { validatePassword } from '../../lib/validators.js';
import { roleLabel, roleBadgeVariant } from '../../lib/format.js';
import { Avatar, Badge, Button, Field, Modal } from '../../components/ui/index.js';
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
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [showPasswords, setShowPasswords] = useState(false);
  const [formError, setFormError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      toast.success('Your account has been deleted permanently.');
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteError(err?.message || 'Failed to delete account. Please try again.');
      setDeleting(false);
    }
  };

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
            </div>
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

      {/* ── Danger zone ── */}
      <section className="app-card border-danger/30 p-6 dark:border-danger/40">
        <h2 className="text-lg font-semibold text-danger">Danger zone</h2>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Permanently delete your account, owned projects, tasks, and notes. This action is irreversible.
        </p>
        <Button
          variant="danger"
          className="mt-4 gap-2"
          onClick={() => {
            setDeleteError(null);
            setConfirmingDelete(true);
          }}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete account
        </Button>
      </section>

      {confirmingDelete && (
        <DeleteAccountModal
          user={user}
          busy={deleting}
          error={deleteError}
          onClose={() => {
            if (!deleting) setConfirmingDelete(false);
          }}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
}

/** Confirm modal — requires typing username to enable permanent deletion. */
function DeleteAccountModal({ user, busy, error, onClose, onConfirm }) {
  const [confirmation, setConfirmation] = useState('');
  const requiredText = user?.username || 'DELETE';
  const matches = confirmation.trim().toLowerCase() === requiredText.toLowerCase();

  return (
    <Modal
      open
      onClose={onClose}
      title="Delete your account?"
      description="This action will permanently delete your user profile and all associated data."
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={busy}
            disabled={!matches || busy}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Permanently delete account
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div
            className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 text-xs text-muted-foreground space-y-2">
          <div className="flex items-center gap-2 font-semibold text-danger text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Warning: This action cannot be undone
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>All projects created by you will be permanently deleted.</li>
            <li>All tasks, subtasks, notes, and discussions within those projects will be purged.</li>
            <li>Your memberships in collaborative projects will be revoked.</li>
            <li>Your active session will be terminated immediately.</li>
          </ul>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-account-delete" className="text-xs font-medium text-foreground">
            Type <span className="font-mono font-bold text-danger">{requiredText}</span> to confirm:
          </label>
          <input
            id="confirm-account-delete"
            type="text"
            autoComplete="off"
            className="app-input"
            placeholder={requiredText}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            disabled={busy}
            data-autofocus
          />
        </div>
      </div>
    </Modal>
  );
}
