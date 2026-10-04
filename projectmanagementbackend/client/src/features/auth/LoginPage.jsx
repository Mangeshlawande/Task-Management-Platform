import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { UserRound, KeyRound, Eye, EyeOff } from 'lucide-react';
import { ApiError } from '../../api/client.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useForm } from '../../lib/useForm.js';
import { validateEmail, validatePassword } from '../../lib/validators.js';
import { Button, Field } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';

const initial = { identifier: '', password: '' };

const validate = (v) => {
  const errors = {};
  const id = v.identifier?.trim() || '';
  if (!id) errors.identifier = 'Email or username is required';
  else if (id.includes('@') && validateEmail(id)) errors.identifier = validateEmail(id);
  const p = validatePassword(v.password);
  if (p) errors.password = p;
  return errors;
};

/**
 * P1.3 — Login. POST /auth/login sets httpOnly cookies; store keeps the user.
 * `identifier` accepts email or username (contract: either works).
 * Prefills username when arriving from successful registration.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(null);

  const form = useForm(
    { ...initial, identifier: location.state?.username || '' },
    validate,
    async (values) => {
      setFormError(null);
      try {
        const user = await login({
          identifier: values.identifier,
          password: values.password,
        });
        toast.success(`Welcome back${user?.fullName ? ', ' + user.fullName : ''}!`);
        navigate(location.state?.from || '/projects', { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          // Backend marker: EMAIL_NOT_VERIFIED (docs/03 § Auth). Send the user
          // to the code screen; a username login can't prefill the email.
          toast.info('Verify your email to continue.');
          navigate('/verify-email', {
            replace: true,
            state: {
              email: values.identifier.includes('@')
                ? values.identifier.trim().toLowerCase()
                : '',
              from: location.state?.from,
            },
          });
        } else if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
          // Don't reveal which part failed (docs/04 § 2)
          setFormError('Invalid credentials');
        } else if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
          // handled by useForm; nothing banner-worthy
        } else {
          setFormError(err?.message || 'Login failed. Please try again.');
        }
      }
    },
  );

  return (
    <div className="w-full max-w-md">
      <div className="app-card p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-foreground dark:text-dark-foreground">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Log in to your Project Camp workspace.
        </p>

        {location.state?.reason === 'password-changed' && (
          <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success" role="status">
            Password changed — log in with your new password.
          </div>
        )}
        {location.state?.reason === 'password-reset' && (
          <div className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success" role="status">
            Password updated — log in with your new password.
          </div>
        )}

        {formError && (
          <div
            className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {formError}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit} noValidate>
          <Field label="Email or username" htmlFor="identifier" error={form.errors.identifier}>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                autoComplete="username"
                className={`app-input pl-9 ${form.errors.identifier ? 'app-input-error' : ''}`}
                placeholder="jane@example.com or jane_doe"
                value={form.values.identifier}
                onChange={form.handleChange}
                aria-invalid={!!form.errors.identifier}
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="password" error={form.errors.password}>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className={`app-input pl-9 pr-10 ${form.errors.password ? 'app-input-error' : ''}`}
                placeholder="••••••••"
                value={form.values.password}
                onChange={form.handleChange}
                aria-invalid={!!form.errors.password}
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

          <Button type="submit" size="lg" className="w-full" loading={form.submitting}>
            {form.submitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Forgot your password?
          </Link>
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
