import type { ClientSessionUser } from '@/lib/client-session';

export const GOOGLE_SIGNIN_SUCCESS_EVENT = 'alhuda:google-signin-success';

export type GoogleSigninSuccessDetail = {
  user: ClientSessionUser;
};
