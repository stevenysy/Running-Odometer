#include <lvgl.h>

#include "e1001_display.h"
#include "ui/GUI.h"

e1001_driver_t e1001_driver;

void _lvgl_task(void* p)
{
    while (1) {
        lv_timer_handler();
        delay(50);
    }
}

void setup()
{
    Serial1.begin(115200, SERIAL_8N1, 44, 43);
    Serial1.println("Starting Run Log display...");

    e1001_display_init(&e1001_driver);
    GUI_init();

    xTaskCreatePinnedToCore(_lvgl_task, "_lvgl_task", 10 * 1024, NULL, 1, NULL, 1);
}

void loop()
{
    if (e1001_display_should_refresh(&e1001_driver)) {
        Serial1.println("Refreshing e-paper display...");
        Serial1.flush();
        e1001_display_refresh(&e1001_driver);
        Serial1.println("Display refresh complete");
        Serial1.flush();
    }

    delay(100);
}
