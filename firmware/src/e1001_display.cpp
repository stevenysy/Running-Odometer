#include "e1001_display.h"

#include <lvgl.h>
#include <TFT_eSPI.h>

/*Set to your screen resolution and rotation*/
#define TFT_HOR_RES   800
#define TFT_VER_RES   480

/*LVGL draw into this buffer, 1/10 screen size usually works well. The size is in bytes*/
#define DRAW_BUF_SIZE ((TFT_HOR_RES * TFT_VER_RES) * LV_COLOR_DEPTH / 8 / 10 + 8 )
static uint8_t draw_buf[DRAW_BUF_SIZE];

EPaper epaper;

#if LV_USE_LOG != 0
void arduino_print( lv_log_level_t level, const char * buf )
{
    LV_UNUSED(level);
    Serial.println(buf);
    Serial.flush();
}
#endif

static inline uint8_t l8_to_gray2(uint8_t l8)
{
    return (uint8_t)(l8 >> 6); // 0..3
}

/* LVGL calls it when a rendered image needs to copied to the display*/
static void e1001_disp_flush( lv_display_t *disp, const lv_area_t *area, uint8_t *px_map)
{
    e1001_driver_t *drv = (e1001_driver_t *)lv_display_get_driver_data(disp);
    EPaper *epd = drv->epd;
    int32_t w = lv_area_get_width(area);
    int32_t h = lv_area_get_height(area);
    uint8_t *dst = (uint8_t *)epd->getPointer();
    const int8_t bpp = epd->getColorDepth();

    if (dst == nullptr) {
        lv_display_flush_ready(disp);
        return;
    }

    // LV_LOG_INFO("flushing: %d,%d - %dx%d (bpp=%d)", area->x1, area->y1, w, h, bpp);
    if (bpp == 4) {
        // Sprite layout: 2 pixels per byte (high nibble = even x, low nibble = odd x).
        const int32_t stride_px = (epd->width() + 1) & ~1;

        for (int32_t y = 0; y < h; y++) {
            const uint8_t *src_row = px_map + (y * w);
            const int32_t dst_y = area->y1 + y;
            const int32_t row_base = dst_y * stride_px;

            for (int32_t x = 0; x < w; x++) {
                const int32_t dst_x = area->x1 + x;
                const uint8_t g2 = l8_to_gray2(src_row[x]) & 0x03;

                const int32_t idx = (dst_x + row_base) >> 1;
                if ((dst_x & 0x01) == 0) {
                    dst[idx] = (uint8_t)((g2 << 4) | (dst[idx] & 0x0F));
                } else {
                    dst[idx] = (uint8_t)((dst[idx] & 0xF0) | g2);
                }
            }
        }
    } else if (bpp == 1) {
        // Sprite layout: 8 pixels per byte (MSB = x%8==0). Convention in this library: 1=white, 0=black.
        const int32_t bitwidth = (epd->width() + 7) & ~7;

        for (int32_t y = 0; y < h; y++) {
            const uint8_t *src_row = px_map + (y * w);
            const int32_t dst_y = area->y1 + y;
            const int32_t row_base = dst_y * bitwidth;

            for (int32_t x = 0; x < w; x++) {
                const int32_t dst_x = area->x1 + x;
                const bool white = src_row[x] >= 128;

                const int32_t idx = (dst_x + row_base) >> 3;
                const uint8_t mask = (uint8_t)(0x80U >> (dst_x & 0x07));
                if (white) dst[idx] |= mask;
                else       dst[idx] &= (uint8_t)~mask;
            }
        }
    } else {
        // Unsupported in this demo; avoid corrupting the sprite buffer.
        lv_display_flush_ready(disp);
        return;
    }

    if (lv_display_flush_is_last(disp)) {
        drv->flush_scheduled = true;
        drv->flush_scheduled_time = millis();
    }

    /*Call it to tell LVGL you are ready*/
    lv_display_flush_ready(disp);
}

/*Read the touchpad*/
static void device_touchpad_read( lv_indev_t * indev, lv_indev_data_t * data )
{
}

/*use Arduinos millis() as tick source*/
static uint32_t get_arduino_tick(void)
{
    return millis();
}

static void resolution_changed_event_cb(lv_event_t * e)
{
    lv_display_t *disp = (lv_display_t *)lv_event_get_target(e);
    e1001_driver_t *drv =  (e1001_driver_t *)lv_display_get_driver_data(disp);
    EPaper *epd = drv->epd;
    int32_t hor_res = lv_display_get_horizontal_resolution(disp);
    int32_t ver_res = lv_display_get_vertical_resolution(disp);
    lv_display_rotation_t rot = lv_display_get_rotation(disp);

    /* handle rotation */
    switch(rot) {
        case LV_DISPLAY_ROTATION_0:
            epd->setRotation(0);   /* Portrait orientation */
            break;
        case LV_DISPLAY_ROTATION_90:
            epd->setRotation(1);   /* Landscape orientation */
            break;
        case LV_DISPLAY_ROTATION_180:
            epd->setRotation(2);   /* Portrait orientation, flipped */
            break;
        case LV_DISPLAY_ROTATION_270:
            epd->setRotation(3);   /* Landscape orientation, flipped */
            break;
    }
}

void e1001_display_init(e1001_driver_t *drv)
{
    drv->epd = &epaper;
    drv->flush_scheduled = false;
    drv->flush_scheduled_time = 0;

    drv->epd->begin();
#ifdef USE_MUTIGRAY_EPAPER
    // UC8179 is configured as 1bpp by default; enable 4-level gray so we can render LVGL's L8 buffer safely.
    drv->epd->initGrayMode(GRAY_LEVEL4);
#endif

    lv_init();

    /*Set a tick source so that LVGL will know how much time elapsed. */
    lv_tick_set_cb(get_arduino_tick);

    /* register print function for debugging */
#if LV_USE_LOG != 0
    lv_log_register_print_cb( arduino_print );
#endif

    lv_display_t *disp;

    /*Else create a display yourself*/
    disp = lv_display_create(TFT_HOR_RES, TFT_VER_RES);
    lv_display_set_driver_data(disp, (void *)drv);
    lv_display_set_flush_cb(disp, e1001_disp_flush);
    //lv_display_add_event_cb(disp, resolution_changed_event_cb, LV_EVENT_RESOLUTION_CHANGED, NULL);
    lv_display_set_buffers(disp, draw_buf, NULL, sizeof(draw_buf), LV_DISPLAY_RENDER_MODE_PARTIAL);

    /*Initialize the (dummy) input device driver*/
    // lv_indev_t * indev = lv_indev_create();
    // lv_indev_set_type(indev, LV_INDEV_TYPE_POINTER); /*Touchpad should have POINTER type*/
    // lv_indev_set_read_cb(indev, device_touchpad_read);

}

void e1001_display_refresh(e1001_driver_t *drv)
{
    drv->epd->update();  //use gray update
    drv->flush_scheduled = false;
}

void e1001_display_schedule_refresh(e1001_driver_t *drv)
{
    drv->flush_scheduled = true;
    drv->flush_scheduled_time = millis();
}

bool e1001_display_should_refresh(e1001_driver_t *drv)
{
    return drv->flush_scheduled && (millis() - drv->flush_scheduled_time > 100);
}
