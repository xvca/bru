# Bru

This is the web interface / sidecar software for [Autobru](https://github.com/xvca/autobru).

While Autobru handles the hardware side (connecting the ESP32 to your Bookoo scale and Breville Dual Boiler), **Bru** gives you a nice UI to interact with it. It visualizes your shot in real-time, lets you manage settings, and now includes a full database to track brews and gear.

Since this frontend is essentially just sending HTTP requests to the ESP, you don't actually _need_ to use the app to control the machine.

You can set up iOS Shortcuts (or Android alternatives) to send requests directly to the ESP's IP address. This is great if you want to set a target weight or start a shot via Siri/voice control without opening the web interface.

## How it works

<div align="center">
  <img src="https://github.com/user-attachments/assets/cf124973-221d-4668-b239-3ec07b972bd0" width="200" alt="brew_control">
</div>

You can use this app in two ways:

1.  **Control Panel:** Monitor weight and flow rate, start or stop brews, and update Autobru settings.
2.  **Full Tracking:** Keep one local bean inventory, brew history, equipment list, and settings record alongside the control panel.

Full Tracking is intentionally passwordless and designed for one Autobru installation on a trusted local network. Anyone who can reach Bru can manage its data. If you need remote or public access, put Bru behind a VPN or an authenticating reverse proxy.

### Features

**Control & Monitoring**

- WebSocket connection to the ESP32.
- Visualizes weight, flow rate, and brew states (Pre-infusion, Brewing, Dripping).
- Toggle machine settings remotely.

**Tracking**

- **Bean Inventory:** Track what's in your stash, roast dates, and freeze dates.
- **Brew Logging:** Record your recipes, ratio, time, and tasting notes.
- **Equipment Manager:** Keep track of your grinders and brewers.
- **Label Scanning:** Automatically extract coffee details (Roaster, Name, Roast Date, Tasting notes) by taking a photo of the bag.

<div align="center">
  <img src="https://github.com/user-attachments/assets/14adab49-0ee8-420a-8b0f-94ea7e47e1be" width="200" alt="brew_control">
</div>

## Hosting

Since this is a web app, you'll need to host it somewhere on your local network to access it from your phone while you're standing at the coffee machine. A Raspberry Pi is perfect for this.

### Manual Setup

```bash
# Install dependencies
npm install

# Set up the database
npx prisma generate
npm run prisma:migrate

# Run it
npm run dev
```

When a database migration is pending, `npm run prisma:migrate` creates a consistent SQLite backup before applying it. Backups are stored in a `backups` directory beside the database by default; set `DATABASE_BACKUP_DIR` to use another location.

### Docker Setup

This is the recommended way to run it on a Pi.

**1. Build the image**

```bash
docker build -t bru .
```

**2. Run the container**
We give it the name `bru` so it's easy to manage later.

_Note: We mount the `/prisma` folder so your database persists even if you delete the container._

```bash
docker run -d \
  -p 3000:3000 \
  --name bru \
  --restart unless-stopped \
  -v $(pwd)/prisma:/app/prisma \
  bru
```

**3. Managing the container**

To stop the app:

```bash
docker stop bru
```

To start it again:

```bash
docker start bru
```

**4. Updating to the latest version**

When you pull new changes from git, you'll need to rebuild the container:

```bash
# 1. Get latest code
git pull

# 2. Stop and remove the old container
docker stop bru
docker rm bru

# 3. Rebuild
docker build -t bru .

# 4. Run it again (use the same command as step 2)
docker run -d -p 3000:3000 --name bru --restart unless-stopped -v $(pwd)/prisma:/app/prisma bru
```

### Lite mode

Don't need the database stuff? There's a lite build that skips all of it. No brew logging or inventory tracking. This is what's running on [bru.xvca.me](http://bru.xvca.me).

It's meant for shared hosting situations. Since it has to run on HTTP to reach ESPs on private networks, a database doesn't really make sense anyway.

To build and run it:

```bash
npm run build:lite
npm start
```

You get the gauge, start/stop controls, and ESP settings. Everything else is stripped out.

## Environment

Rename `.env.example` to `.env` and configure the database and optional AI key:

```
DATABASE_URL="file:./prisma/dev.db"
OPENROUTER_API_KEY="your_key_here"
```

The ESP IP address is configured inside the app itself. When you first open the dashboard you’ll be prompted to enter the device IP or hostname, and you can update it later in **Settings → ESP Settings**.

**Note on AI Features:**
The AI label scanning feature uses OpenRouter to process images. If you don't provide an `OPENROUTER_API_KEY` in your `.env` file, the "Scan Label" button and other potential future AI features will be automatically hidden from the UI.

## ⚠️ Work in Progress

Just a heads up: this is very much a work in progress, so things might break or change without warning. Use at your own risk.
