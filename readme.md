# Bru

This is the web interface / sidecar software for [Autobru](https://github.com/xvca/autobru).

While Autobru handles the hardware side (connecting the ESP32 to your Bookoo scale and Breville Dual Boiler), **Bru** gives you a nice UI to interact with it. It visualizes your shot in real-time, lets you manage settings, and now includes a full database to track brews and gear.

Since this frontend is essentially just sending HTTP requests to the ESP, you don't actually *need* to use the app to control the machine.

You can set up iOS Shortcuts (or Android alternatives) to send requests directly to the ESP's IP address. This is great if you want to set a target weight or start a shot via Siri/voice control without opening the web interface.

## How it works

You can use this app in two ways:

1.  **Just the Control Panel:** If you don't care about tracking data, you can just use the main dashboard to monitor weight/flow rate, start/stop brews and the settings page to update your ESP settings (weight presets, preinfusion mode, etc.) No account needed.
2.  **Full Tracking:** Create an account to use the database features. You can track your bean inventory, log your brews, and manage equipment. This is all done locally if you're self-hosting.

### Features

**Control & Monitoring**
*   WebSocket connection to the ESP32.
*   Visualizes weight, flow rate, and brew states (Pre-infusion, Brewing, Dripping).
*   Toggle machine settings remotely.

**Tracking (Requires Account)**
*   **Bean Inventory:** Track what's in your stash, roast dates, and freeze dates.
*   **Brew Logging:** Record your recipes, ratio, time, and tasting notes.
*   **Brew Bars:** Create shared spaces (like "Office" or "Home") to share inventory and logs with other members.
*   **Equipment Manager:** Keep track of your grinders and brewers.
* 	**Label Scanning:** Automatically extract coffee details (Roaster, Name, Roast Date, Tasting notes) by taking a photo of the bag.

## Hosting

Since this is a web app, you'll need to host it somewhere on your local network to access it from your phone while you're standing at the coffee machine. A Raspberry Pi is perfect for this.

### Manual Setup
```bash
# Install dependencies
npm install

# Set up the database
npx prisma generate
npx prisma migrate deploy

# Run it
npm run dev
```

### Docker Setup

This is the recommended way to run it on a Pi.

**1. Build the image**
```bash
docker build -t bru .
```

**2. Run the container**
We give it the name `bru` so it's easy to manage later.

*Note: We mount the `/prisma` folder so your database persists even if you delete the container.*

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

## Environment

Rename `.env.example` to `.env` and set your ESP's IP address:

```
DATABASE_URL="file:./prisma/dev.db"
OPENROUTER_API_KEY="your_key_here"
```

The ESP IP address is now configured inside the app itself. When you first open the dashboard you’ll be prompted to enter the device IP or hostname, and you can update it later in **Settings → ESP Settings**.

**Note on AI Features:**
The AI label scanning feature uses OpenRouter to process images. If you don't provide an `OPENROUTER_API_KEY` in your `.env` file, the "Scan Label" button and other potential future AI features will be automatically hidden from the UI.

## ⚠️ Work in Progress

Just a heads up: this is very much a work in progress. I'm actively adding features (like the recent Brew Bar and Inventory updates), so things might break or change without warning. Use at your own risk.
