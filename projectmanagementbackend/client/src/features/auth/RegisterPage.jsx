import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../api/auth.js';
import { ApiError } from '../../api/client.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useForm } from '../../lib/useForm.js';
import {
  validateEmail,
  validateUsername,
  validatePassword,
} from '../../lib/validators.js';
import { Button } from '../../components/ui/index.js';
import { AuthLayout } from '../../components/auth/AuthLayout.jsx';
import { toast } from '../../stores/uiStore.js';

const initial = { fullName: '', username: '', email: '', password: '' };

const validate = (v) => {
  const results = {
    email: validateEmail(v.email),
    username: validateUsername(v.username),
    password: validatePassword(v.password),
  };
  return Object.fromEntries(Object.entries(results).filter(([, m]) => m));
};

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(null);

  const form = useForm(initial, validate, async (values) => {
    setFormError(null);
    try {
      const data = await authApi.register(values);
      if (data?.user) useAuthStore.getState().setUser(data.user);
      toast.success('Account created — welcome aboard!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (!(err instanceof ApiError)) {
        setFormError('Something went wrong. Please try again.');
      } else if (err.status === 409) {
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
    }
  });

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Free for teams under 10."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {formError && (
        <div
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {formError}
        </div>
      )}

      <form onSubmit={form.handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            className="app-input"
            value={form.values.fullName}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="username" className="block text-sm font-medium text-foreground">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            placeholder="janedoe"
            className={`app-input ${form.errors.username ? 'app-input-error' : ''}`}
            value={form.values.username}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
          />
          {form.errors.username && (
            <p className="text-xs text-destructive">{form.errors.username}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@example.com"
            className={`app-input ${form.errors.email ? 'app-input-error' : ''}`}
            value={form.values.email}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
          />
          {form.errors.email && (
            <p className="text-xs text-destructive">{form.errors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className={`app-input pr-10 ${form.errors.password ? 'app-input-error' : ''}`}
              value={form.values.password}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.errors.password && (
            <p className="text-xs text-destructive">{form.errors.password}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full justify-center shadow-sm"
          loading={form.submitting}
        >
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
