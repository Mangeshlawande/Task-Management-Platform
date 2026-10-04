import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, LinkIcon, ShieldCheck } from 'lucide-react';
import { authApi } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';
import { useForm } from '../../lib/useForm.js';
import { validatePassword } from '../../lib/validators.js';
import { Button, Field } from '../../components/ui/index.js';

/**
 * P1.7 — Reset password (arrives from the email link
 * {FRONTEND_URL}/reset-password/{token}).
 * Contract: POST /auth/reset-password/:resetToken { newPassword } → 200,
 * or 400 when the token is invalid/expired (20 min lifetime).
 * Server also revokes all sessions on success → user must log in again.
 */
export function ResetPasswordPage() {
  const { resetToken } = useParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [expired, setExpired] = useState(false);
  const [formError, setFormError] = useState(null);

  const validate = (v) => {
    const errors = {};
    const p = validatePassword(v.newPassword);
    if (p) errors.newPassword = p;
    if (v.confirmPassword !== v.newPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    return errors;
  };

  const form = useForm({ newPassword: '', confirmPassword: '' }, validate, async (values) => {
    setFormError(null);
    try {
      await authApi.resetPassword(resetToken, values.newPassword);
      // Success → sessions revoked server-side → fresh login with a hint.
      navigate('/login', {
        replace: true,
        state: { reason: 'password-reset', username: null },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        // 400 covers both validation (mapped to fields by useForm when
        // fieldErrors exist) and the invalid/expired token case.
        if (!Object.keys(err.fieldErrors || {}).length) setExpired(true);
      } else {
        setFormError(err?.message || 'Something went wrong. Please try again.');
      }
    }
  });

  if (expired) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="app-card p-8">
          <LinkIcon className="mx-auto h-12 w-12 text-warning" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold text-foreground dark:text-dark-foreground">
            Link expired
          </h1>
          <p className="mt-2 text-sm text-muted dark:text-dark-muted">
            This password reset link is invalid or has expired (they last 20 minutes).
          </p>
          <Button className="mt-6 w-full" onClick={() => navigate('/forgot-password', { replace: true })}>
            Request a new link
          </Button>
          <p className="mt-4 text-sm text-muted dark:text-dark-muted">
            or{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              back to log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="app-card p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-foreground dark:text-dark-foreground">
          Set a new password
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Choose a strong password — you&rsquo;ll use it to log in.
        </p>

        {formError && (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {formError}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit} noValidate>
          <Field label="New password" htmlFor="newPassword" error={form.errors.newPassword} hint="At least 8 characters">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                className={`app-input pl-9 pr-10 ${form.errors.newPassword ? 'app-input-error' : ''}`}
                placeholder="••••••••"
                value={form.values.newPassword}
                onChange={form.handleChange}
                aria-invalid={!!form.errors.newPassword}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-foreground dark:text-dark-muted dark:hover:text-dark-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </Field>

          <Field label="Confirm new password" htmlFor="confirmPassword" error={form.errors.confirmPassword}>
            <div className="relative">
              <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                className={`app-input pl-9 ${form.errors.confirmPassword ? 'app-input-error' : ''}`}
                placeholder="••••••••"
                value={form.values.confirmPassword}
                onChange={form.handleChange}
                aria-invalid={!!form.errors.confirmPassword}
              />
            </div>
          </Field>

          <Button type="submit" size="lg" className="w-full" loading={form.submitting}>
            {form.submitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
