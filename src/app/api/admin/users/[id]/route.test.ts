import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  dashboardCorsHeaders: vi.fn(),
  hasDashboardApiAccess: vi.fn(),
  isAllowedDashboardOrigin: vi.fn(),
  isTrustedDashboardMutation: vi.fn(),
  getCurrentAdminUser: vi.fn(),
  deleteUserForAdmin: vi.fn(),
}));

vi.mock('@/lib/auth/dashboard-access', () => ({
  dashboardCorsHeaders: mocks.dashboardCorsHeaders,
  hasDashboardApiAccess: mocks.hasDashboardApiAccess,
  isAllowedDashboardOrigin: mocks.isAllowedDashboardOrigin,
  isTrustedDashboardMutation: mocks.isTrustedDashboardMutation,
}));

vi.mock('@/lib/auth/current-user', () => ({
  getCurrentAdminUser: mocks.getCurrentAdminUser,
}));

vi.mock('@/lib/auth/users-store', () => ({
  deleteUserForAdmin: mocks.deleteUserForAdmin,
}));

import { DELETE } from './route';

function createRequest() {
  return new NextRequest('https://www.readalquran.online/api/admin/users/user-1', {
    method: 'DELETE',
  });
}

describe('DELETE /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.dashboardCorsHeaders.mockReturnValue({});
    mocks.hasDashboardApiAccess.mockReturnValue(true);
    mocks.isAllowedDashboardOrigin.mockReturnValue(false);
    mocks.isTrustedDashboardMutation.mockReturnValue(false);
  });

  it('deletes a user through the authenticated dashboard service', async () => {
    mocks.deleteUserForAdmin.mockResolvedValue(true);

    const response = await DELETE(createRequest(), {
      params: Promise.resolve({ id: 'user-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.deleteUserForAdmin).toHaveBeenCalledWith('user-1');
  });

  it('does not delete users when the request is not trusted', async () => {
    mocks.hasDashboardApiAccess.mockReturnValue(false);
    mocks.isTrustedDashboardMutation.mockReturnValue(false);

    const response = await DELETE(createRequest(), {
      params: Promise.resolve({ id: 'user-1' }),
    });

    expect(response.status).toBe(403);
    expect(mocks.deleteUserForAdmin).not.toHaveBeenCalled();
  });

  it('returns not found when the user was already deleted', async () => {
    mocks.deleteUserForAdmin.mockResolvedValue(false);

    const response = await DELETE(createRequest(), {
      params: Promise.resolve({ id: 'missing-user' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      message: 'User not found.',
    });
  });
});
