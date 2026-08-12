import type { DisplayConfig } from '@/db/schema';
import type { DisplayConfigRepository } from './display-config.repository';

export interface DisplayConfigService {
  getConfig(now?: Date): Promise<DisplayConfigResponse>;
  saveConfig(input: SaveDisplayConfigInput, now?: Date): Promise<DisplayConfigResponse>;
}

export interface SaveDisplayConfigInput {
  nextRaceName: string | null;
  nextRaceDate: string | null;
  timezoneOffsetMinutes?: number;
}

export interface DisplayConfigResponse {
  nextRaceName: string | null;
  nextRaceDate: string | null;
  timezoneOffsetMinutes: number;
  nextRace: NextRaceResponse | null;
  updatedAt: string | null;
}

export interface NextRaceResponse {
  name: string;
  date: string;
  daysUntil: number;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DEFAULT_TIMEZONE_OFFSET_MINUTES = -300;

export function createDisplayConfigService(
  repository: DisplayConfigRepository
): DisplayConfigService {
  return {
    async getConfig(now = new Date()) {
      return toDisplayConfigResponse(await repository.getConfig(), now);
    },

    async saveConfig(input, now = new Date()) {
      const config = await repository.upsertConfig({
        nextRaceName: input.nextRaceName,
        nextRaceDate: input.nextRaceDate,
        timezoneOffsetMinutes: input.timezoneOffsetMinutes ?? DEFAULT_TIMEZONE_OFFSET_MINUTES,
        updatedAt: now.toISOString()
      });

      return toDisplayConfigResponse(config, now);
    }
  };
}

export function toNextRaceResponse(
  nextRaceName: string | null,
  nextRaceDate: string | null,
  now = new Date()
): NextRaceResponse | null {
  if (!nextRaceName || !nextRaceDate) {
    return null;
  }

  return {
    name: nextRaceName,
    date: nextRaceDate,
    daysUntil: calculateDaysUntil(nextRaceDate, now)
  };
}

export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toDisplayConfigResponse(
  config: DisplayConfig | null,
  now: Date
): DisplayConfigResponse {
  return {
    nextRaceName: config?.nextRaceName ?? null,
    nextRaceDate: config?.nextRaceDate ?? null,
    timezoneOffsetMinutes: config?.timezoneOffsetMinutes ?? DEFAULT_TIMEZONE_OFFSET_MINUTES,
    nextRace: toNextRaceResponse(config?.nextRaceName ?? null, config?.nextRaceDate ?? null, now),
    updatedAt: config?.updatedAt ?? null
  };
}

function calculateDaysUntil(dateOnly: string, now: Date): number {
  return Math.round((toUtcDateOnly(dateOnly).getTime() - toUtcToday(now).getTime()) / MS_PER_DAY);
}

function toUtcDateOnly(dateOnly: string): Date {
  const [yearText, monthText, dayText] = dateOnly.split('-');

  return new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
}

function toUtcToday(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
