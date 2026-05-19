export interface WslDistribution {
  name: string;
  state: string;
  version: number;
  is_default: boolean;
}

export interface DistributionDetail {
  name: string;
  state: string;
  version: number;
  is_default: boolean;
  default_user: string;
  disk_info: string;
}

export interface ResourceInfo {
  cpu_percent: number;
  memory_mb: number;
}
