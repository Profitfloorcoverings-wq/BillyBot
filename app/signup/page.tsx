'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthError, User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

type SignupParams = {
  email: string;
  password: string;
  mobile: string;
};

type SignupResult = {
  user: User | null;
  sessionExists: boolean;
  error: AuthError | null;
};

async function signUpWithEmail(params: SignupParams): Promise<SignupResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      phone: params.mobile,
    },
  });

  return {
    user: data.user,
    sessionExists: Boolean(data.session),
    error,
  };
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const trimmedMobile = mobile.trim();
    const trimmedBusinessName = businessName.trim();

    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!trimmedMobile) {
      setError('Mobile is required.');
      return;
    }

    const normalizedMobile = trimmedMobile.replace(/[\s()-]/g, '');
    const phonePattern = /^\+?[1-9]\d{7,14}$/;

    if (!phonePattern.test(normalizedMobile)) {
      setError('Please enter a valid mobile number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { user, sessionExists, error: signUpError } = await signUpWithEmail({
        email: trimmedEmail,
        password,
        mobile: normalizedMobile,
      });

      if (signUpError) {
        setError(signUpError.message || 'Unable to create your account. Please try again.');
        return;
      }

      const userId = user?.id;

      if (!userId) {
        setError('Unable to create your account. Please try again.');
        return;
      }

      const payload: { id: string; business_name?: string } = { id: userId };

      if (trimmedBusinessName) {
        payload.business_name = trimmedBusinessName;
      }

      const { error: clientUpsertError } = await supabase.from('clients').upsert(payload);

      if (clientUpsertError) {
        setError(clientUpsertError.message || 'Your account was created, but setup failed. Please try logging in.');
        return;
      }

      if (sessionExists) {
        router.push('/account/setup');
        return;
      }

      router.push('/signup/check-email');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Create your account</h1>
        <p className="mt-2 text-sm text-slate-600">Get BillyBot set up in minutes.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="you@company.com"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-800">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="At least 8 characters"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="mobile" className="mb-1 block text-sm font-medium text-slate-800">
              Mobile
            </label>
            <input
              id="mobile"
              name="mobile"
              type="tel"
              autoComplete="tel"
              required
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="+61400111222"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="businessName" className="mb-1 block text-sm font-medium text-slate-800">
              Business name <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              autoComplete="organization"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              placeholder="Your business"
              disabled={isSubmitting}
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-base font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="font-medium text-slate-900 underline-offset-2 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
