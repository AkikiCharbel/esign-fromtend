import client from './client';
import type { DashboardResponse, DashboardStats, Submission } from '../types';

export const getDashboardStats = (): Promise<DashboardStats> =>
  client.get<DashboardResponse>('/dashboard/stats').then((r) => ({
    awaiting_signature: r.data.awaiting_signature,
    pending: r.data.pending,
    signed_this_week: r.data.signed_this_week,
    expired: r.data.expired,
  }));

export const getRecentSubmissions = (): Promise<Submission[]> =>
  client.get<DashboardResponse>('/dashboard/stats').then((r) => r.data.recent_submissions);
