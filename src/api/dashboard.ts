import client from './client';
import type { DashboardStats, Submission } from '../types';

export const getDashboardStats = () =>
  client.get<DashboardStats>('/dashboard/stats').then((r) => r.data);

export const getRecentSubmissions = () =>
  client.get<Submission[]>('/dashboard/recent').then((r) => r.data);
