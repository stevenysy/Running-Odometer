#ifndef RUNLOG_API_H
#define RUNLOG_API_H

#include <Arduino.h>

#include "runlog_dashboard.h"

bool runlog_api_configured();
bool runlog_api_connect_wifi();
bool runlog_api_fetch_odometer(RunLogDashboardData *data, String *errorMessage);

#endif
