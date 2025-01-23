# Bru - Coffee Scale Interface

A Next.js web application that interfaces with AutoBru, an ESP32-based system that connects to BOOKOO Bluetooth scales and Breville Dual Boiler espresso machines. Designed for coffee brewing with real-time weight, flow rate, and timing measurements.

## Features

- Real-time monitoring via WebSocket
  - Weight measurements with 0.1g precision from BOOKOO scale
  - Flow rate calculations
  - Brew state tracking (Pre-infusion, Brewing, Dripping)
  - Timer functionality
- Automated brewing control
  - Target weight setting with visual progress indicator
  - Remote start/stop capability
- Settings management
  - Device enable/disable toggle
  - Weight-triggered pre-infusion mode
  - Configurable weight presets
  - Shot data management
- Dark/Light theme support
- Progressive Web App (PWA) capabilities
- Persistent preferences storage

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env` file with:
```
NEXT_PUBLIC_WS_URL=ws://your-esp-ip/ws
NEXT_PUBLIC_ESP_URL=http://your-esp-ip
```

## License

VIRAL PUBLIC LICENSE
Copyleft (ɔ) All Rights Reversed

This WORK is hereby relinquished of all associated ownership, attribution and copy
rights, and redistribution or use of any kind, with or without modification, is
permitted without restriction subject to the following conditions:

1.	Redistributions of this WORK, or ANY work that makes use of ANY of the
	contents of this WORK by ANY kind of copying, dependency, linkage, or ANY
	other possible form of DERIVATION or COMBINATION, must retain the ENTIRETY
	of this license.
2.	No further restrictions of ANY kind may be applied.

## Note

This is the frontend component only. Requires the AutoBru ESP32 firmware to function. The ESP32 firmware component of this project can be found in the [Autobru repository](https://github.com/xvca/autobru). AutoBru provides the hardware interface between your BOOKOO scale, Breville Dual Boiler, and this web interface.

This project is in active development and plans to evolve into a comprehensive coffee brewing platform, featuring brew history tracking, coffee bean inventory management, and detailed brew analytics.
