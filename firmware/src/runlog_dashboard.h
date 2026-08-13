#ifndef RUNLOG_DASHBOARD_H
#define RUNLOG_DASHBOARD_H

#include <Arduino.h>

#include "e1001_display.h"

struct RunLogDashboardData {
    float distanceKm;
    uint32_t activityCount;
    uint32_t movingTimeSeconds;
    uint32_t elevationGainMeters;
    float last7DaysDistanceKm;
    float last30DaysDistanceKm;
    float yearToDateDistanceKm;
    bool hasLongestActivity;
    float longestActivityDistanceKm;
    bool hasLatestActivity;
    float latestActivityDistanceKm;
    uint32_t latestActivityMovingTimeSeconds;
    bool hasLatestActivityPace;
    uint32_t latestActivityPaceSecondsPerKm;
    bool hasLatestActivityElevation;
    uint32_t latestActivityElevationMeters;
    String latestActivityStartDate;
    bool hasNextRace;
    String nextRaceName;
    int32_t nextRaceDaysUntil;
    int32_t timezoneOffsetMinutes;
    String lastUpdated;
};

RunLogDashboardData runlog_dashboard_fake_data();
String runlog_dashboard_signature(const RunLogDashboardData &data, const String &statusText,
                                  bool wifiConnected);
void runlog_dashboard_render(const RunLogDashboardData &data, const String &statusText,
                             bool wifiConnected, e1001_driver_t *display);

#endif
