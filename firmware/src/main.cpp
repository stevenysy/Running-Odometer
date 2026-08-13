#include <lvgl.h>
#include <WiFi.h>

#include "e1001_display.h"
#include "runlog_api.h"
#include "runlog_dashboard.h"
#include "ui/GUI.h"

namespace {

#ifndef RUNLOG_REFRESH_BUTTON_PIN
#define RUNLOG_REFRESH_BUTTON_PIN 3
#endif

#ifndef RUNLOG_REFRESH_BUTTON_ACTIVE_LOW
#define RUNLOG_REFRESH_BUTTON_ACTIVE_LOW 1
#endif

constexpr uint32_t FETCH_INTERVAL_MS = 60UL * 60UL * 1000UL;
constexpr uint32_t REFRESH_BUTTON_DEBOUNCE_MS = 50;
constexpr uint32_t REFRESH_BUTTON_COOLDOWN_MS = 2000;

e1001_driver_t e1001_driver;
SemaphoreHandle_t lvgl_mutex;
RunLogDashboardData dashboard_data;
uint32_t last_fetch_attempt_ms = 0;
uint32_t last_refresh_button_change_ms = 0;
uint32_t last_manual_fetch_ms = 0;
bool last_refresh_button_reading = HIGH;
bool refresh_button_stable_state = HIGH;
String last_render_signature;

void lock_lvgl()
{
    if (lvgl_mutex != nullptr) {
        xSemaphoreTake(lvgl_mutex, portMAX_DELAY);
    }
}

void unlock_lvgl()
{
    if (lvgl_mutex != nullptr) {
        xSemaphoreGive(lvgl_mutex);
    }
}

void _lvgl_task(void* p)
{
    while (1) {
        lock_lvgl();
        lv_timer_handler();
        unlock_lvgl();
        delay(50);
    }
}

void render_dashboard(const String &statusText)
{
    const bool wifiConnected = WiFi.status() == WL_CONNECTED;
    const String nextSignature = runlog_dashboard_signature(dashboard_data, statusText, wifiConnected);
    if (nextSignature == last_render_signature) {
        return;
    }

    lock_lvgl();
    runlog_dashboard_render(dashboard_data, statusText, wifiConnected, &e1001_driver);
    unlock_lvgl();
    last_render_signature = nextSignature;
}

void refresh_display_when_ready(uint32_t timeoutMs)
{
    const uint32_t startedAt = millis();
    while (millis() - startedAt < timeoutMs) {
        if (e1001_display_should_refresh(&e1001_driver)) {
            Serial1.println("Refreshing e-paper display...");
            Serial1.flush();
            e1001_display_refresh(&e1001_driver);
            Serial1.println("Display refresh complete");
            Serial1.flush();
            return;
        }

        delay(50);
    }
}

void fetch_dashboard()
{
    String errorMessage;
    RunLogDashboardData fetchedData = dashboard_data;

    last_fetch_attempt_ms = millis();
    Serial1.println("Fetching Run Log odometer...");
    Serial1.flush();

    if (runlog_api_fetch_odometer(&fetchedData, &errorMessage)) {
        dashboard_data = fetchedData;
        Serial1.println("Run Log odometer updated");
        Serial1.flush();
        render_dashboard("UPDATED");
        return;
    }

    Serial1.print("Run Log fetch failed: ");
    Serial1.println(errorMessage);
    Serial1.flush();
    render_dashboard(errorMessage == "missing config" ? "CONFIG" : "API ERR");
}

bool is_refresh_button_pressed(int reading)
{
#if RUNLOG_REFRESH_BUTTON_ACTIVE_LOW
    return reading == LOW;
#else
    return reading == HIGH;
#endif
}

void handle_refresh_button()
{
    const bool reading = digitalRead(RUNLOG_REFRESH_BUTTON_PIN);
    const uint32_t now = millis();

    if (reading != last_refresh_button_reading) {
        last_refresh_button_change_ms = now;
        last_refresh_button_reading = reading;
    }

    if (now - last_refresh_button_change_ms < REFRESH_BUTTON_DEBOUNCE_MS) {
        return;
    }

    if (reading == refresh_button_stable_state) {
        return;
    }

    const bool wasPressed = is_refresh_button_pressed(refresh_button_stable_state);
    const bool isPressed = is_refresh_button_pressed(reading);
    refresh_button_stable_state = reading;

    if (!wasPressed && isPressed && (last_manual_fetch_ms == 0 || now - last_manual_fetch_ms >= REFRESH_BUTTON_COOLDOWN_MS)) {
        last_manual_fetch_ms = now;
        Serial1.println("Refresh button pressed; fetching now...");
        Serial1.flush();
        fetch_dashboard();
    }
}

} // namespace

void setup()
{
    Serial1.begin(115200, SERIAL_8N1, 44, 43);
    Serial1.println("Starting Run Log display...");

    lvgl_mutex = xSemaphoreCreateMutex();
    dashboard_data = runlog_dashboard_fake_data();
    pinMode(RUNLOG_REFRESH_BUTTON_PIN, INPUT_PULLUP);
    last_refresh_button_reading = digitalRead(RUNLOG_REFRESH_BUTTON_PIN);
    refresh_button_stable_state = last_refresh_button_reading;

    e1001_display_init(&e1001_driver);
    GUI_init();
    render_dashboard("FAKE");

    xTaskCreatePinnedToCore(_lvgl_task, "_lvgl_task", 10 * 1024, NULL, 1, NULL, 1);
    refresh_display_when_ready(2500);
    fetch_dashboard();
}

void loop()
{
    handle_refresh_button();

    if (millis() - last_fetch_attempt_ms >= FETCH_INTERVAL_MS) {
        fetch_dashboard();
    }

    if (e1001_display_should_refresh(&e1001_driver)) {
        Serial1.println("Refreshing e-paper display...");
        Serial1.flush();
        e1001_display_refresh(&e1001_driver);
        Serial1.println("Display refresh complete");
        Serial1.flush();
    }

    delay(100);
}
