import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { ApiError } from '../../api/client.js';
import { useAuthStore } from '../../stores/authStore.js';
import { useForm } from '../../lib/useForm.js';
import { validateEmail, validatePassword } from '../../lib/validators.js';
import { Button } from '../../components/ui/index.js';
import { AuthLayout } from '../../components/auth/AuthLayout.jsx';
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
        navigate(location.state?.from || '/dashboard', { replace: true });
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
          setFormError('Invalid credentials');
        } else if (err instanceof ApiError && Object.keys(err.fieldErrors || {}).length) {
          // handled by useForm
        } else {
          setFormError(err?.message || 'Login failed. Please try again.');
        }
      }
    },
  );

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your WorkPulse workspace."
      footer={
        <>
          Don&rsquo;t have an account?{' '}
          <Link to="/register" className="font-medium text-foreground hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {location.state?.reason === 'password-changed' && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success" role="status">
          Password changed — log in with your new password.
        </div>
      )}
      {location.state?.reason === 'password-reset' && (
        <div className="mb-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success" role="status">
          Password updated — log in with your new password.
        </div>
      )}

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
          <label htmlFor="identifier" className="block text-sm font-medium text-foreground">
            Email or username
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            autoComplete="username"
            placeholder="name@example.com or username"
            className={`app-input ${form.errors.identifier ? 'app-input-error' : ''}`}
            value={form.values.identifier}
            onChange={form.handleChange}
            onBlur={form.handleBlur}
          />
          {form.errors.identifier && (
            <p className="text-xs text-destructive">{form.errors.identifier}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
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
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
