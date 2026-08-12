#include "runlog_api.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>

#ifndef RUNLOG_WIFI_SSID
#define RUNLOG_WIFI_SSID ""
#endif

#ifndef RUNLOG_WIFI_PASSWORD
#define RUNLOG_WIFI_PASSWORD ""
#endif

#ifndef RUNLOG_API_URL
#define RUNLOG_API_URL ""
#endif

#ifndef RUNLOG_API_KEY
#define RUNLOG_API_KEY ""
#endif

namespace {

constexpr uint32_t WIFI_CONNECT_TIMEOUT_MS = 20000;
constexpr uint32_t HTTP_TIMEOUT_MS = 15000;

String configuredApiUrl()
{
    String url = RUNLOG_API_URL;
    url.trim();
    if (url.endsWith("/api")) {
        url += "/odometer";
    } else if (url.endsWith("/api/")) {
        url += "odometer";
    } else if (!url.endsWith("/api/odometer")) {
        if (url.endsWith("/")) {
            url += "api/odometer";
        } else {
            url += "/api/odometer";
        }
    }
    return url;
}

bool hasValue(const char *value)
{
    return value != nullptr && value[0] != '\0';
}

uint32_t roundedUInt(JsonVariantConst value)
{
    if (value.isNull()) {
        return 0;
    }
    return (uint32_t)lround(value.as<float>());
}

bool parseOdometerPayload(const String &payload, RunLogDashboardData *data, String *errorMessage)
{
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload);
    if (error) {
        *errorMessage = String("json ") + error.c_str();
        return false;
    }

    data->distanceKm = doc["distanceKm"] | 0.0f;
    data->activityCount = doc["activityCount"] | 0;
    data->movingTimeSeconds = doc["movingTimeSeconds"] | 0;
    data->elevationGainMeters = roundedUInt(doc["elevationGainMeters"]);
    data->last7DaysDistanceKm = doc["recent"]["last7DaysDistanceKm"] | 0.0f;
    data->last30DaysDistanceKm = doc["recent"]["last30DaysDistanceKm"] | 0.0f;
    data->yearToDateDistanceKm = doc["yearToDate"]["distanceKm"] | 0.0f;

    JsonVariantConst longest = doc["longestActivity"];
    data->hasLongestActivity = !longest.isNull();
    data->longestActivityDistanceKm = data->hasLongestActivity ? (longest["distanceKm"] | 0.0f) : 0.0f;

    JsonVariantConst latest = doc["latestActivity"];
    data->hasLatestActivity = !latest.isNull();
    if (data->hasLatestActivity) {
        data->latestActivityDistanceKm = latest["distanceKm"] | 0.0f;
        data->latestActivityMovingTimeSeconds = latest["movingTimeSeconds"] | 0;
        data->hasLatestActivityPace = !latest["averagePaceSecondsPerKm"].isNull();
        data->latestActivityPaceSecondsPerKm = roundedUInt(latest["averagePaceSecondsPerKm"]);
        data->hasLatestActivityElevation = !latest["elevationGainMeters"].isNull();
        data->latestActivityElevationMeters = roundedUInt(latest["elevationGainMeters"]);
        data->latestActivityStartDate = (latest["startDateLocal"] | latest["startDate"] | "");
    } else {
        data->latestActivityDistanceKm = 0.0f;
        data->latestActivityMovingTimeSeconds = 0;
        data->hasLatestActivityPace = false;
        data->latestActivityPaceSecondsPerKm = 0;
        data->hasLatestActivityElevation = false;
        data->latestActivityElevationMeters = 0;
        data->latestActivityStartDate = "";
    }

    JsonVariantConst nextRace = doc["nextRace"];
    data->hasNextRace = !nextRace.isNull();
    if (data->hasNextRace) {
        data->nextRaceName = nextRace["name"] | "";
        data->nextRaceDaysUntil = nextRace["daysUntil"] | 0;
    } else {
        data->nextRaceName = "";
        data->nextRaceDaysUntil = 0;
    }

    if (doc["generatedAt"].isNull()) {
        *errorMessage = "missing generatedAt";
        return false;
    }
    if (doc["timezoneOffsetMinutes"].isNull()) {
        *errorMessage = "missing timezone";
        return false;
    }
    data->timezoneOffsetMinutes = doc["timezoneOffsetMinutes"] | 0;
    data->lastUpdated = doc["generatedAt"] | "";
    return true;
}

} // namespace

bool runlog_api_configured()
{
    return hasValue(RUNLOG_WIFI_SSID) && hasValue(RUNLOG_API_URL) && hasValue(RUNLOG_API_KEY);
}

bool runlog_api_connect_wifi()
{
    if (WiFi.status() == WL_CONNECTED) {
        return true;
    }

    WiFi.mode(WIFI_STA);
    WiFi.begin(RUNLOG_WIFI_SSID, RUNLOG_WIFI_PASSWORD);

    const uint32_t startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_CONNECT_TIMEOUT_MS) {
        delay(250);
    }

    return WiFi.status() == WL_CONNECTED;
}

bool runlog_api_fetch_odometer(RunLogDashboardData *data, String *errorMessage)
{
    if (!runlog_api_configured()) {
        *errorMessage = "missing config";
        return false;
    }

    if (!runlog_api_connect_wifi()) {
        *errorMessage = "wifi";
        return false;
    }

    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    const String url = configuredApiUrl();
    bool began = false;

    if (url.startsWith("https://")) {
        secureClient.setInsecure();
        began = http.begin(secureClient, url);
    } else {
        began = http.begin(plainClient, url);
    }

    if (!began) {
        *errorMessage = "http begin";
        return false;
    }

    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Authorization", String("Bearer ") + RUNLOG_API_KEY);

    const int statusCode = http.GET();
    if (statusCode != HTTP_CODE_OK) {
        *errorMessage = String("http ") + statusCode;
        http.end();
        return false;
    }

    const String payload = http.getString();
    http.end();

    return parseOdometerPayload(payload, data, errorMessage);
}
