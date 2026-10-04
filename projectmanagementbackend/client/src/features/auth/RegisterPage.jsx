import { Link, useNavigate } from 'react-router-dom';
import { UserRound, Mail, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { authApi } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';
import { useForm } from '../../lib/useForm.js';
import {
  validateEmail,
  validateUsername,
  validatePassword,
} from '../../lib/validators.js';
import { Button, Field } from '../../components/ui/index.js';
import { toast } from '../../stores/uiStore.js';

const initial = { fullName: '', username: '', email: '', password: '' };

const validate = (v) => {
  // run all validators so every field shows its error at once
  const results = {
    email: validateEmail(v.email),
    username: validateUsername(v.username),
    password: validatePassword(v.password),
  };
  return Object.fromEntries(Object.entries(results).filter(([, m]) => m));
};

/**
 * P1.1 + P1.2 — Sign Up.
 * Contract: POST /auth/register → 201 { user, devOtp? }. The account starts
 * unverified — the user must enter the emailed 6-digit code on /verify-email
 * before they can log in (docs/04 § 1).
 * 400 → field errors; 409 → inline field error under the offending identifier.
 * Success → /verify-email with the email (and devOtp, if the API echoed it).
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(null);

  const form = useForm(initial, validate, async (values) => {
    setFormError(null);
    try {
      const data = await authApi.register(values);
      toast.success('Account created — check your email for your verification code.');
      navigate('/verify-email', {
        replace: true,
        state: {
          email: values.email.trim().toLowerCase(),
          devOtp: data?.devOtp,
        },
      });
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError('Something went wrong. Please try again.');
      } else if (err.status === 409) {
        // duplicate email/username → inline under the right field when possible
        const msg = err.message || 'Account already exists';
        if (/email/i.test(msg) && !/username/i.test(msg)) {
          form.setErrors((e) => ({ ...e, email: msg }));
        } else if (/username/i.test(msg) && !/email/i.test(msg)) {
          form.setErrors((e) => ({ ...e, username: msg }));
        } else {
          form.setErrors((e) => ({ ...e, email: msg, username: msg }));
        }
      } else if (!Object.keys(err.fieldErrors || {}).length) {
        setFormError(err.message);
      }
      // validation (400) field errors are handled inside useForm
    }
  });

  return (
    <div className="w-full max-w-md">
      <div className="app-card p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-foreground dark:text-dark-foreground">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted dark:text-dark-muted">
          Start managing projects with your team in minutes.
        </p>

        {formError && (
          <div
            className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {formError}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit} noValidate>
          <Field label="Full name" htmlFor="fullName" hint="Optional — shown to your teammates">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                maxLength={100}
                className="app-input pl-9"
                placeholder="Jane Doe"
                value={form.values.fullName}
                onChange={form.handleChange}
              />
            </div>
          </Field>

          <Field label="Username" htmlFor="username" error={form.errors.username} hint="3–30 characters — letters, numbers, underscores">
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className={`app-input pl-9 ${form.errors.username ? 'app-input-error' : ''}`}
                placeholder="jane_doe"
                value={form.values.username}
                onChange={form.handleChange}
                aria-invalid={!!form.errors.username}
              />
            </div>
          </Field>

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

          <Field label="Password" htmlFor="password" error={form.errors.password} hint="At least 8 characters">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
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
            {form.submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted dark:text-dark-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
