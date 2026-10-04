import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, Mail } from 'lucide-react';
import { authApi } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';
import { useForm } from '../../lib/useForm.js';
import { validateEmail } from '../../lib/validators.js';
import { Button, Field } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';

const initial = { email: '' };
const validate = (v) => {
  const e = validateEmail(v.email);
  return e ? { email: e } : {};
};

/**
 * P1.6 — Forgot password.
 * Contract: POST /auth/forgot-password ALWAYS returns 200 with a neutral
 * message (enumeration-safe — docs/04 § 6). The UI therefore shows the same
 * confirmation regardless of whether the account exists, plus a resend
 * option for mail that takes a while to arrive.
 */
export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState(null); // email → confirmation state
  const [cooldown, setCooldown] = useState(0);
  const [formError, setFormError] = useState(null);

  const form = useForm(initial, validate, async (values) => {
    setFormError(null);
    try {
      await authApi.forgotPassword(values.email.trim().toLowerCase());
      setSentTo(values.email.trim());
      setCooldown(30);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) clearInterval(timer);
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      // 400 (invalid email) is caught by client validation; a 429 is the
      // endpoint's rate limit — show the server's wording ("try again in N
      // minutes") rather than a generic failure.
      setFormError(
        err instanceof ApiError && err.status === 429
          ? err.message
          : 'Could not send the email. Please try again.',
      );
    }
  });

  if (sentTo) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="app-card p-8">
          <MailCheck className="mx-auto h-12 w-12 text-success" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold text-foreground dark:text-dark-foreground">
            Check your inbox
          </h1>
          <p className="mt-2 text-sm text-muted dark:text-dark-muted">
            If an account exists for <span className="font-medium text-foreground dark:text-dark-foreground">{sentTo}</span>,
            we&rsquo;ve sent a link to reset your password. The link expires in 20 minutes.
          </p>
          <p className="mt-3 text-xs text-muted dark:text-dark-muted">
            In local dev the mail lands in an Ethereal preview — check the backend console for the URL.
          </p>

          <Button
            variant="outline"
            className="mt-6 w-full"
            disabled={cooldown > 0}
            onClick={() =>
              authApi
                .forgotPassword(sentTo)
                .then(() => toast.info('Reset email sent again'))
                .catch(() => toast.error('Could not resend. Try again in a moment.'))
            }
          >
            <Mail className="h-4 w-4" aria-hidden />
            {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend email'}
          </Button>

          <p className="mt-6 text-sm text-muted dark:text-dark-muted">
            Back to{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              log in
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
          Forgot your password?
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Enter your email and we&rsquo;ll send you a reset link.
        </p>

        {formError && (
          <div className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {formError}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit} noValidate>
          <Field label="Email" htmlFor="email" error={form.errors.email}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={`app-input pl-9 ${form.errors.email ? 'app-input-error' : ''}`}
                placeholder="jane@example.com"
                value={form.values.email}
                onChange={form.handleChange}
                aria-invalid={!!form.errors.email}
              />
            </div>
          </Field>

          <Button type="submit" size="lg" className="w-full" loading={form.submitting}>
            {form.submitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted dark:text-dark-muted">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
