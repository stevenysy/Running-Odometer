#include "runlog_dashboard.h"

#include <math.h>
#include <stdio.h>

#include "ui/core/variables.h"

namespace {

String formatFloat(float value, uint8_t decimals)
{
    char buffer[24];
    snprintf(buffer, sizeof(buffer), "%.*f", decimals, value);
    return String(buffer);
}

String formatHours(uint32_t seconds)
{
    return formatFloat(seconds / 3600.0f, 1);
}

String formatDuration(uint32_t seconds)
{
    const uint32_t hours = seconds / 3600;
    const uint32_t minutes = (seconds % 3600) / 60;
    char buffer[24];

    if (hours > 0) {
        snprintf(buffer, sizeof(buffer), "%luh %lum", (unsigned long)hours, (unsigned long)minutes);
    } else {
        snprintf(buffer, sizeof(buffer), "%lum", (unsigned long)minutes);
    }

    return String(buffer);
}

String formatPace(uint32_t secondsPerKm)
{
    char buffer[24];
    snprintf(buffer, sizeof(buffer), "%lu:%02lu /km", (unsigned long)(secondsPerKm / 60),
             (unsigned long)(secondsPerKm % 60));
    return String(buffer);
}

String formatDate(String isoDate)
{
    if (isoDate.length() < 10) {
        return "--";
    }

    const char *months[] = {"JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                            "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"};
    const int year = isoDate.substring(0, 4).toInt();
    const int month = isoDate.substring(5, 7).toInt();
    const int day = isoDate.substring(8, 10).toInt();

    if (year <= 0 || month < 1 || month > 12 || day < 1 || day > 31) {
        return "--";
    }

    char buffer[20];
    snprintf(buffer, sizeof(buffer), "%s %02d, %04d", months[month - 1], day, year);
    return String(buffer);
}

String formatUpdatedTime(String isoDate, int32_t timezoneOffsetMinutes)
{
    if (isoDate.length() < 16) {
        return "--";
    }

    const int utcHour = isoDate.substring(11, 13).toInt();
    const int utcMinute = isoDate.substring(14, 16).toInt();
    int localMinutes = utcHour * 60 + utcMinute + timezoneOffsetMinutes;
    localMinutes %= 24 * 60;
    if (localMinutes < 0) {
        localMinutes += 24 * 60;
    }

    int hour = localMinutes / 60;
    const int minute = localMinutes % 60;
    const char *suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour == 0) {
        hour = 12;
    }

    char buffer[12];
    snprintf(buffer, sizeof(buffer), "%d:%02d %s", hour, minute, suffix);
    return String(buffer);
}

String uppercaseLabel(String value)
{
    value.toUpperCase();
    return value;
}

void setLabel(lv_obj_t *label, const String &value)
{
    lv_label_set_text(label, value.c_str());
}

} // namespace

RunLogDashboardData runlog_dashboard_fake_data()
{
    RunLogDashboardData data = {};
    data.distanceKm = 1000.0f;
    data.activityCount = 212;
    data.movingTimeSeconds = 722000;
    data.elevationGainMeters = 10000;
    data.last7DaysDistanceKm = 27.2f;
    data.last30DaysDistanceKm = 112.5f;
    data.yearToDateDistanceKm = 1021.4f;
    data.hasLongestActivity = true;
    data.longestActivityDistanceKm = 42.66f;
    data.hasLatestActivity = true;
    data.latestActivityDistanceKm = 42.66f;
    data.latestActivityMovingTimeSeconds = 13200;
    data.hasLatestActivityPace = true;
    data.latestActivityPaceSecondsPerKm = 311;
    data.hasLatestActivityElevation = true;
    data.latestActivityElevationMeters = 390;
    data.latestActivityStartDate = "2026-08-08T08:42:00Z";
    data.hasNextRace = true;
    data.nextRaceName = "ST. JUDE MEMPHIS MARATHON";
    data.nextRaceDaysUntil = 112;
    data.timezoneOffsetMinutes = -300;
    data.lastUpdated = "2026-08-08T08:42:00Z";
    return data;
}

String runlog_dashboard_signature(const RunLogDashboardData &data, const String &statusText)
{
    String signature = statusText;
    signature += "|";
    signature += formatFloat(data.distanceKm, 1);
    signature += "|";
    signature += data.activityCount;
    signature += "|";
    signature += data.movingTimeSeconds;
    signature += "|";
    signature += data.elevationGainMeters;
    signature += "|";
    signature += formatFloat(data.last7DaysDistanceKm, 1);
    signature += "|";
    signature += formatFloat(data.last30DaysDistanceKm, 1);
    signature += "|";
    signature += formatFloat(data.yearToDateDistanceKm, 1);
    signature += "|";
    signature += data.hasLongestActivity ? formatFloat(data.longestActivityDistanceKm, 2) : "--";
    signature += "|";
    signature += data.hasLatestActivity ? formatDate(data.latestActivityStartDate) : "--";
    signature += "|";
    signature += data.hasLatestActivity ? formatFloat(data.latestActivityDistanceKm, 1) : "--";
    signature += "|";
    signature += data.latestActivityMovingTimeSeconds;
    signature += "|";
    signature += data.hasLatestActivityPace ? formatPace(data.latestActivityPaceSecondsPerKm) : "--";
    signature += "|";
    signature += data.hasLatestActivityElevation ? String(data.latestActivityElevationMeters) : "--";
    signature += "|";
    signature += data.hasNextRace ? data.nextRaceName : "--";
    signature += "|";
    signature += data.hasNextRace ? String(data.nextRaceDaysUntil) : "--";
    signature += "|";
    signature += data.timezoneOffsetMinutes;
    signature += "|";
    signature += formatUpdatedTime(data.lastUpdated, data.timezoneOffsetMinutes);
    return signature;
}

void runlog_dashboard_render(const RunLogDashboardData &data, const String &statusText,
                             e1001_driver_t *display)
{
    setLabel(GUI_Label__OdometerScreen__DistanceValueLabel, formatFloat(data.distanceKm, 1));
    setLabel(GUI_Label__OdometerScreen__DistanceUnitLabel, "km");
    setLabel(GUI_Label__OdometerScreen__RunsValueLabel, String(data.activityCount));
    setLabel(GUI_Label__OdometerScreen__TimeValueLabel, formatHours(data.movingTimeSeconds));
    setLabel(GUI_Label__OdometerScreen__TimeUnitLabel, "hr");
    setLabel(GUI_Label__OdometerScreen__ElevationValueLabel, String(data.elevationGainMeters));
    setLabel(GUI_Label__OdometerScreen__ElevationUnitLabel, "m");

    setLabel(GUI_Label__OdometerScreen__7DaysValueLabel, formatFloat(data.last7DaysDistanceKm, 1));
    setLabel(GUI_Label__OdometerScreen__7DaysUnitLabel, "km");
    setLabel(GUI_Label__OdometerScreen__30DaysValueLabel, formatFloat(data.last30DaysDistanceKm, 1));
    setLabel(GUI_Label__OdometerScreen__30DaysUnitLabel, "km");
    setLabel(GUI_Label__OdometerScreen__ThisYearValueLabel, formatFloat(data.yearToDateDistanceKm, 1));
    setLabel(GUI_Label__OdometerScreen__ThisYearUnitLabel, "km");
    setLabel(GUI_Label__OdometerScreen__LongestRunValueLabel,
             data.hasLongestActivity ? formatFloat(data.longestActivityDistanceKm, 2) : "--");
    setLabel(GUI_Label__OdometerScreen__LongestRunUnitLabel, data.hasLongestActivity ? "km" : "");

    setLabel(GUI_Label__OdometerScreen__LastRunDateLabel,
             data.hasLatestActivity ? formatDate(data.latestActivityStartDate) : "--");
    setLabel(GUI_Label__OdometerScreen__LastRunDistanceLabel,
             data.hasLatestActivity ? formatFloat(data.latestActivityDistanceKm, 1) + " km" : "--");
    setLabel(GUI_Label__OdometerScreen__LastRunTimeLabel,
             data.hasLatestActivity ? formatDuration(data.latestActivityMovingTimeSeconds) : "--");
    setLabel(GUI_Label__OdometerScreen__LastRunPaceLabel,
             data.hasLatestActivity && data.hasLatestActivityPace
                 ? formatPace(data.latestActivityPaceSecondsPerKm)
                 : "--");
    setLabel(GUI_Label__OdometerScreen__LastRunElevationLabel,
             data.hasLatestActivity && data.hasLatestActivityElevation
                 ? String(data.latestActivityElevationMeters) + " m"
                 : "--");

    setLabel(GUI_Label__OdometerScreen__DaysUntilValueLabel,
             data.hasNextRace ? String(data.nextRaceDaysUntil) : "--");
    setLabel(GUI_Label__OdometerScreen__DaysUntilTextLabel, "DAYS UNTIL");
    setLabel(GUI_Label__OdometerScreen__NextRaceLabel,
             data.hasNextRace ? uppercaseLabel(data.nextRaceName) : "--");

    setLabel(GUI_Label__OdometerScreen__UpdatedTextLabel, statusText);
    setLabel(GUI_Label__OdometerScreen__UpdatedTimeLabel,
             formatUpdatedTime(data.lastUpdated, data.timezoneOffsetMinutes));

    e1001_display_schedule_refresh(display);
}
