import { z } from 'zod';

const emailField = z
  .email('Enter a valid email address.')
  .max(320, 'Email address is too long.');

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.');

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(80, 'Name must be 80 characters or fewer.'),
  email: emailField,
  password: passwordField,
});

export const signInSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password must be 128 characters or fewer.'),
});

export const emailActionSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/, 'This password reset link is invalid.'),
  password: passwordField,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type EmailActionInput = z.infer<typeof emailActionSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
