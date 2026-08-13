SET( SOURCES
    assets/fonts/jbm12.c
    assets/fonts/jbm16.c
    assets/fonts/jbm24.c
    assets/fonts/jbm32.c
    assets/fonts/jbm48.c
    assets/images/upload_route_png.c
    assets/images/upload_sportshoe_1_png.c
    assets/images/upload_timer_png.c
    assets/images/upload_triangleright_png.c
    assets/images/upload_wifi_png.c
    assets/images/upload_wifioff_png.c
    behavior/animations.c
    behavior/events.c
    components/comp.c
    components/comp_hook.c
    components/statrow_component_component.c
    core/gui_core.c
    core/variables.c
    helpers/ui_helpers.c
    screens/OdometerScreen.c
)

add_library( GUI ${SOURCES} )

