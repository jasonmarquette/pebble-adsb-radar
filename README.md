# Pebble ADS-B Radar

A live ADS-B aircraft radar app for **Pebble Round 2** and **Pebble Time 2**.

The app uses the connected phone's GPS location to retrieve nearby aircraft from the ADS-B.fi open data API. The phone processes the response and sends a compact aircraft list to the watch, where targets are plotted on an animated circular radar display.

## Features

- Live nearby aircraft from ADS-B.fi
- Phone-based GPS location
- Adjustable **5, 10, 20, or 40 nautical mile** radar range
- **10 NM default range**
- Watch-button range controls
- Up to 8 nearby aircraft
- Aircraft plotted by bearing and distance
- Closest aircraft selected automatically
- Selected aircraft highlighted in magenta
- Callsign, distance, altitude, aircraft count, and current range display
- Animated radar sweep
- Compact phone-to-watch messaging
- Queued watch-to-phone range updates when messaging is temporarily busy
- Pebble Round 2 (`gabbro`) and Pebble Time 2 (`emery`) support

## Watch Controls

| Button | Action |
|---|---|
| **Up** | Increase radar range |
| **Down** | Decrease radar range |

Available ranges:

```text
5 NM → 10 NM → 20 NM → 40 NM
```

The app starts at **10 NM** each time it launches.

Pressing Up or Down changes the range one step. It stops at 5 NM or 40 NM instead of wrapping around.

When the range changes, the watch:

1. Rescales the aircraft positions.
2. Updates the displayed range.
3. Sends the selected range to the phone.
4. Requests a fresh ADS-B update.

The phone uses that same range in the ADS-B.fi request and when filtering aircraft, keeping the watch display and data query synchronized.

## Radar Display

- **Red center marker:** user's current location
- **Yellow markers:** nearby aircraft
- **Magenta marker:** selected aircraft
- **Cyan rings:** range rings
- **Green line:** animated radar sweep
- **North:** always at the top

The outer ring represents the selected range. The inner rings represent approximately one-third and two-thirds of that range.

At the default 10 NM setting:

- Inner ring: approximately 3.3 NM
- Middle ring: approximately 6.6 NM
- Outer ring: 10 NM

The lower information area includes the aircraft information, visible aircraft count, and selected range. Example:

```text
3500 FT | 6 AC | 20 NM
```

## Supported Platforms

| Platform | Device |
|---|---|
| `gabbro` | Pebble Round 2 |
| `emery` | Pebble Time 2 |

## Architecture

### Phone side

File:

```text
src/pkjs/index.js
```

The phone-side code:

1. Gets the phone's current GPS coordinates.
2. Receives range changes from the watch.
3. Requests ADS-B.fi data using the selected range.
4. Filters aircraft without valid coordinates.
5. Calculates aircraft distance and bearing.
6. Removes aircraft outside the selected range.
7. Sorts aircraft from nearest to farthest.
8. Keeps up to 8 aircraft.
9. Sends a compact payload and current range to the watch.

### Watch side

File:

```text
src/embeddedjs/main.js
```

The watch-side code:

1. Handles Up and Down button presses.
2. Selects a supported radar range.
3. Queues the selected range until the phone messaging channel is writable.
4. Sends the latest pending range to the phone.
5. Receives and parses aircraft records.
6. Draws and animates the radar.
7. Scales targets against the selected range.
8. Displays the closest visible aircraft and current range.

This design avoids transferring the full ADS-B JSON response to the watch, reducing memory use and improving stability.

## AppMessage Keys

The app uses three message keys:

```json
"messageKeys": [
  "STATUS",
  "AIRCRAFT",
  "RADAR_RANGE"
]
```

- `STATUS`: connection and loading status
- `AIRCRAFT`: compact aircraft records
- `RADAR_RANGE`: selected range in nautical miles

## Messaging Reliability

Pebble messaging can temporarily report that the outbound channel is not writable, especially during app startup or while another message is still being delivered.

The watch keeps the newest selected radar range in a pending state and sends it when the messaging channel becomes writable. This prevents range-button presses from causing an `Error: not writable` failure.

If several range changes occur while messaging is busy, only the most recent selected range needs to be sent.

## ADS-B Data Source

Aircraft data comes from the ADS-B.fi open data API.

Default 10 NM request format:

```text
https://opendata.adsb.fi/api/v3/lat/LATITUDE/lon/LONGITUDE/dist/10
```

A selected 40 NM range changes the final portion to:

```text
/dist/40
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
- Supported emulator or physical Pebble
- Connected phone with location permission
- Internet access

## Install Pebble Tool

Install `uv`:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Restart the terminal, then install Pebble Tool:

```bash
uv tool install pebble-tool --python 3.13
```

Verify:

```bash
pebble --version
```

## Install the Pebble SDK

```bash
pebble sdk install latest
pebble sdk list
```

## macOS Emulator Dependency

```bash
brew install libpng
```

If needed:

```bash
brew reinstall libpng
brew link --overwrite libpng
```

## Clone and Install Dependencies

```bash
git clone https://github.com/jasonmarquette/pebble-adsb-radar.git
cd pebble-adsb-radar
pebble package install
```

The project uses:

```text
@moddable/pebbleproxy
```

## Build

```bash
pebble clean
pebble build
```

The compiled `.pbw` bundle is created in:

```text
build/
```

## Pebble Round 2 Emulator

```bash
pebble clean
pebble build
pebble install --emulator gabbro
```

View logs:

```bash
pebble logs --emulator gabbro
```

Verbose installation:

```bash
pebble install --emulator gabbro -vvvv
```

Stop the emulator:

```bash
pebble kill
```

## Pebble Time 2 Emulator

```bash
pebble clean
pebble build
pebble install --emulator emery
```

## Install on a Physical Pebble

1. Enable the developer connection in the Pebble phone app.
2. Make sure the phone and computer are reachable on the same network.
3. Note the developer connection IP address.
4. Install the app:

```bash
pebble install --phone PHONE_IP_ADDRESS
```

Example:

```bash
pebble install --phone 192.168.1.123
```

You can save the address:

```bash
export PEBBLE_PHONE=192.168.1.123
pebble install
```

## Configuration

Range choices and the default are defined in:

```text
src/embeddedjs/main.js
```

```javascript
const RADAR_RANGES_NM = [5, 10, 20, 40];
const DEFAULT_RANGE_INDEX = 1;
```

Array index `1` is `10`, so the default is 10 NM.

Phone-side settings are defined in:

```text
src/pkjs/index.js
```

```javascript
const MAX_AIRCRAFT = 8;
const REFRESH_MS = 7200;
```

Current behavior:

- Available ranges: 5, 10, 20, and 40 NM
- Default range: 10 NM
- Maximum aircraft: 8
- Automatic refresh: approximately every 7.2 seconds
- Immediate refresh after changing range

## Troubleshooting

### Range buttons do not update the radar

Range updates are queued until the phone messaging channel becomes writable. A brief delay during startup is normal, but the latest selected range should be delivered automatically.

Confirm `package.json` includes:

```json
"messageKeys": [
  "STATUS",
  "AIRCRAFT",
  "RADAR_RANGE"
]
```

Then rebuild and reinstall:

```bash
pebble clean
pebble build
pebble install --emulator gabbro
```

Watch the logs while pressing Up or Down:

```bash
pebble logs --emulator gabbro
```

### App stays on `WAITING FOR PHONE`

Confirm all three message keys are present and reinstall the app so the updated phone-side JavaScript is loaded.

### No aircraft appear

Possible causes:

- No aircraft are within the selected range
- The range is set to 5 NM and no aircraft are nearby
- Phone location is unavailable
- Location permission is denied
- ADS-B.fi request failed
- Phone-side PebbleKit JavaScript is not running

### Large ADS-B response crashes the watch

The intended data flow is:

```text
ADS-B.fi
   ↓
Phone-side PKJS
   ↓
Compact aircraft payload
   ↓
Pebble watch
```

The full ADS-B response should not be fetched directly by the watch.

## Privacy

The application uses the connected phone's current location only to request and calculate nearby aircraft positions. It does not intentionally store location history.

## Planned Improvements

- Watch buttons to cycle through aircraft
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
- Save the selected range between launches

## Development Workflow

```bash
pebble clean
pebble build
pebble install --emulator gabbro
```

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

## Author

**Jason Marquette**

GitHub: `jasonmarquette`
