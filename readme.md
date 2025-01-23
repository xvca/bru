# Bru - Coffee Scale Interface

A Next.js web application that provides a responsive interface for an ESP32-based coffee scale. Designed for precision pour-over coffee brewing with real-time weight, flow rate, and timing measurements.

## Features

- Real-time weight and flow rate monitoring via WebSocket
- Target weight setting with visual progress indicator
- Brew state management (Pre-infusion, Brewing, Dripping)
- Persistent settings for brew preferences
- Dark/Light theme support
- Progressive Web App (PWA) capabilities

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

This is the frontend component only. Requires the AutoBru ESP32 firmware to function. The ESP32 firmware component of this project can be found in the [Autobru repository](https://github.com/xvca/autobru).

This project is in active development and plans to evolve into a comprehensive coffee brewing platform, featuring brew history tracking, coffee bean inventory management, and detailed brew analytics.
