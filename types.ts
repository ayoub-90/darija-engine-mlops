
export enum View {
  DASHBOARD = 'dashboard',
  DATASETS = 'datasets',
  TRAINING = 'training',
  DEPLOYMENTS = 'deployments',
  TEAM = 'team',
  SETTINGS = 'settings'
}

export interface Metric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: string;
}

export interface Activity {
  id: string;
  type: string;
  user: string;
  timestamp: string;
  status: 'success' | 'processing' | 'failed' | 'completed';
}

export interface AudioFile {
  id: string;
  name: string;
  duration: string;
  dialect: string;
  confidence: number;
  status: 'Review' | 'Valid' | 'Queue';
  prediction?: string;
}
