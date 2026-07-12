import type { OdometerRepository } from './odometer.repository';

export interface OdometerService {
  getOdometer(): Promise<OdometerResponse>;
}

export interface OdometerResponse {
  distanceMeters: number;
  distanceKm: number;
  lastUpdated: string | null;
}

export function createOdometerService(repository: OdometerRepository): OdometerService {
  return {
    async getOdometer() {
      const totals = await repository.getTotals();

      return {
        distanceMeters: totals.distanceMeters,
        distanceKm: totals.distanceMeters / 1000,
        lastUpdated: totals.lastUpdated
      };
    }
  };
}
