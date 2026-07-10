# Pebble ADS-B Radar

A live ADS-B aircraft radar app for **Pebble Round 2** and **Pebble Time 2**.

Pebble ADS-B Radar uses the connected phone's current location to retrieve nearby aircraft from the ADS-B.fi open data API. The phone processes the full ADS-B response, sends a compact aircraft list to the watch, and the watch plots the targets on an animated circular radar display.

## Features

- Live nearby aircraft from ADS-B.fi
- Uses the connected phone's current GPS coordinates
- 10 nautical mile radar range
- Displays up to 8 nearby aircraft
- Plots aircraft by calculated bearing and distance
- Automatically selects the closest aircraft
- Highlights the selected aircraft in magenta
- Shows selected aircraft:
  - Callsign
  - Distance
  - Altitude
  - Total aircraft count
- Animated radar sweep
- ADS-B refresh synchronized with each full radar revolution
- Compact phone-to-watch messaging to reduce watch memory use
- Round-screen layout designed for Pebble Round 2
- Support for Gabbro and Emery platforms

## Screens and Behavior

The center red marker represents the user's current position.

Aircraft markers are plotted relative to the user's location:

- Yellow markers: nearby aircraft
- Magenta marker: selected aircraft
- Cyan rings: radar range rings
- Green line: animated radar sweep
- North is always displayed at the top of the screen

The aircraft list is sorted by distance, so the closest aircraft is selected by default.

## Supported Platforms

| Platform | Device |
|---|---|
| `gabbro` | Pebble Round 2 |
| `emery` | Pebble Time 2 |

## Architecture

The project is split between phone-side JavaScript and watch-side Alloy JavaScript.

### Phone side

File:

```text
src/pkjs/index.js
```

The phone-side code:

1. Gets the phone's current GPS coordinates.
2. Requests nearby aircraft from ADS-B.fi.
3. Filters aircraft without valid coordinates.
4. Calculates distance and bearing from the user's location.
5. Sorts aircraft from nearest to farthest.
6. Keeps the closest aircraft.
7. Converts the results into a compact payload.
8. Sends the payload to the watch through Pebble AppMessage.

### Watch side

File:

```text
src/embeddedjs/main.js
```

The watch-side code:

1. Receives the compact aircraft payload.
2. Parses the aircraft records.
3. Draws the circular radar display.
4. Plots aircraft by bearing and distance.
5. Highlights the nearest aircraft.
6. Displays the selected aircraft's information.
7. Animates the radar sweep.

This design prevents the full ADS-B JSON response from being transferred to the watch, which helps avoid memory and stability problems.

## ADS-B Data Source

Aircraft data is retrieved from the ADS-B.fi open data API.

Example request:

```text
https://opendata.adsb.fi/api/v3/lat/LATITUDE/lon/LONGITUDE/dist/10
```

The `dist` value is expressed in nautical miles.

## Project Structure

```text
pebble-adsb-radar/
├── .gitignore
├── package.json
├── README.md
├── wscript
└── src/
    ├── c/
    │   └── mdbl.c
    ├── embeddedjs/
    │   ├── main.js
    │   └── manifest.json
    └── pkjs/
        └── index.js
```

## Requirements

- Pebble SDK 4.17 or newer
- Pebble Tool 5
- Python 3.13
- Node.js
- macOS or Linux
- A supported Pebble emulator or physical Pebble device
- A connected phone with location permission enabled
- Internet access for ADS-B data

## Install the Pebble Tool

Install `uv` if it is not already installed:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Restart the terminal, then install Pebble Tool:

```bash
uv tool install pebble-tool --python 3.13
```

Verify the installation:

```bash
pebble --version
```

## Install the Pebble SDK

Install the latest available SDK:

```bash
pebble sdk install latest
```

List installed SDK versions:

```bash
pebble sdk list
```

## macOS Emulator Dependency

The Pebble emulator requires `libpng` on macOS:

```bash
brew install libpng
```

If Homebrew reports that it is already installed but the emulator cannot locate it:

```bash
brew reinstall libpng
brew link --overwrite libpng
```

## Clone the Repository

```bash
git clone https://github.com/jasonmarquette/pebble-adsb-radar.git
cd pebble-adsb-radar
```

## Install Project Dependencies

Install the Pebble package dependencies:

```bash
pebble package install
```

The project uses:

```text
@moddable/pebbleproxy
```

## Build

Clean and build the project:

```bash
pebble clean
pebble build
```

The compiled `.pbw` application bundle will be created in:

```text
build/
```

## Run in the Pebble Round 2 Emulator

Build and install on the Gabbro emulator:

```bash
pebble clean
pebble build
pebble install --emulator gabbro
```

View logs:

```bash
pebble logs --emulator gabbro
```

For verbose emulator output:

```bash
pebble install --emulator gabbro -vvvv
```

Stop the emulator:

```bash
pebble kill
```

## Run in the Pebble Time 2 Emulator

```bash
pebble clean
pebble build
pebble install --emulator emery
```

## Install on a Physical Pebble

1. Enable the developer connection in the Pebble phone app.
2. Make sure the phone and development computer are reachable on the same network.
3. Note the developer connection IP address shown in the phone app.
4. Install the app:

```bash
pebble install --phone PHONE_IP_ADDRESS
```

Example:

```bash
pebble install --phone 192.168.1.123
```

You can also save the phone IP for future installs:

```bash
export PEBBLE_PHONE=192.168.1.123
```

Then install with:

```bash
pebble install
```

## Configuration

Current defaults are defined in:

```text
src/pkjs/index.js
```

Example:

```javascript
const RADAR_RANGE_NM = 10;
const MAX_AIRCRAFT = 8;
const REFRESH_MS = 7200;
```

Current behavior:

- Radar range: 10 nautical miles
- Maximum aircraft: 8
- Refresh interval: about 7.2 seconds
- One refresh per full radar sweep

The sweep animation is defined in:

```text
src/embeddedjs/main.js
```

Example:

```javascript
sweepAngle = (sweepAngle + 4) % 360;
```

with an 80 millisecond timer.

## How Aircraft Are Selected

The phone-side code sorts the processed aircraft by distance:

```javascript
results.sort(function(first, second) {
  return first.distanceTenths - second.distanceTenths;
});
```

The first aircraft in the sorted list is the closest aircraft:

```javascript
aircraft[0]
```

That aircraft is:

- Highlighted in magenta
- Labeled on the radar
- Displayed in the information area

## Location Use

The phone-side code uses:

```javascript
navigator.geolocation.getCurrentPosition(...)
```

The coordinates are used to:

- Build the ADS-B.fi API request
- Calculate aircraft distance
- Calculate aircraft bearing
- Plot aircraft relative to the user

The red center marker on the radar represents the phone's current location.

## Troubleshooting

### Emulator opens and immediately exits

Run:

```bash
pebble install --emulator gabbro -vvvv
```

Also check:

```bash
pebble logs --emulator gabbro
```

### Emulator cannot find libpng

Install or relink `libpng`:

```bash
brew install libpng
brew link --overwrite libpng
```

### App stays on `WAITING FOR PHONE`

Confirm that `package.json` contains:

```json
"messageKeys": [
  "STATUS",
  "AIRCRAFT"
]
```

Then rebuild:

```bash
pebble clean
pebble build
pebble install --emulator gabbro
```

### No aircraft appear

Possible causes:

- No aircraft are currently within the configured range
- Phone location is unavailable
- Location permission is denied
- ADS-B.fi request failed
- The phone-side PebbleKit JavaScript is not running

Check the logs:

```bash
pebble logs --emulator gabbro
```

### Large ADS-B response crashes the watch

The full ADS-B JSON response should not be fetched directly by the watch.

The correct design is:

```text
ADS-B.fi
   ↓
Phone-side PKJS
   ↓
Compact aircraft payload
   ↓
Pebble watch
```

## Privacy

The application uses the connected phone's current location only to request and calculate nearby aircraft positions.

The project does not intentionally store location history.

## Planned Improvements

- Use watch buttons to cycle through aircraft
- Adjustable radar range
- Dedicated aircraft detail screen
- Ground speed display
- Track or heading display
- Registration and aircraft type display
- Improved target label placement
- Configurable refresh interval
- Better battery management
- Physical Pebble Round 2 testing
- Optional manual location
- Configurable maximum aircraft count

## Development Workflow

Typical development cycle:

```bash
pebble clean
pebble build
pebble install --emulator gabbro
```

Commit changes:

```bash
git add .
git commit -m "Describe the change"
git push
```

## License

No open-source license has been selected yet.

Until a license is added, all rights are reserved by the project author.

## Author

**Jason Marquette**

GitHub: `jasonmarquette`
