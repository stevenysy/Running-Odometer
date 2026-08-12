#include <lvgl.h>

#include "e1001_display.h"
#include "runlog_api.h"
#include "runlog_dashboard.h"
#include "ui/GUI.h"

namespace {

constexpr uint32_t FETCH_INTERVAL_MS = 15UL * 60UL * 1000UL;

e1001_driver_t e1001_driver;
SemaphoreHandle_t lvgl_mutex;
RunLogDashboardData dashboard_data;
uint32_t last_fetch_attempt_ms = 0;
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
    const String nextSignature = runlog_dashboard_signature(dashboard_data, statusText);
    if (nextSignature == last_render_signature) {
        return;
    }

    lock_lvgl();
    runlog_dashboard_render(dashboard_data, statusText, &e1001_driver);
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

} // namespace

void setup()
{
    Serial1.begin(115200, SERIAL_8N1, 44, 43);
    Serial1.println("Starting Run Log display...");

    lvgl_mutex = xSemaphoreCreateMutex();
    dashboard_data = runlog_dashboard_fake_data();

    e1001_display_init(&e1001_driver);
    GUI_init();
    render_dashboard("FAKE");

    xTaskCreatePinnedToCore(_lvgl_task, "_lvgl_task", 10 * 1024, NULL, 1, NULL, 1);
    refresh_display_when_ready(2500);
    fetch_dashboard();
}

void loop()
{
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
