# Pebble ADS-B Radar

A live ADS-B aircraft radar app for **Pebble Round 2** and **Pebble Time 2**.

Pebble ADS-B Radar uses the connected phone's current location to retrieve nearby aircraft from the ADS-B.fi open data API. The phone processes the full ADS-B response, sends a compact aircraft list to the watch, and the watch plots the targets on an animated circular radar display.

## Features

- Live nearby aircraft from ADS-B.fi
- Uses the connected phone's current GPS coordinates
- Adjustable radar range from the watch
- Available ranges: **5, 10, 20, and 40 nautical miles**
- Default radar range: **10 nautical miles**
- Displays up to 8 nearby aircraft
- Plots aircraft by calculated bearing and distance
- Automatically selects the closest aircraft
- Highlights the selected aircraft in magenta
- Shows the selected aircraft's callsign, distance, and altitude
- Shows total aircraft count and current radar range
- Animated radar sweep
- ADS-B refresh synchronized with each full radar revolution
- Compact phone-to-watch messaging to reduce watch memory use
- Round-screen layout designed for Pebble Round 2
- Support for Gabbro and Emery platforms

## Watch Controls

The radar range can be changed directly from the watch:

| Button | Action |
|---|---|
| **Up** | Increase the radar range |
| **Down** | Decrease the radar range |

The selectable ranges are:

```text
5 NM → 10 NM → 20 NM → 40 NM
```

The app starts at **10 NM** each time it launches.

Pressing **Up** or **Down** changes the range by one step. The range stops at the minimum of 5 NM and the maximum of 40 NM rather than wrapping around.

When the range changes, the watch:

1. Rescales aircraft positions on the radar.
2. Updates the range shown in the information area.
3. Sends the selected range to the phone.
4. Requests a fresh aircraft update.

The phone then uses the selected range for the ADS-B.fi API request and filters aircraft to that same distance.

## Screens and Behavior

The center red marker represents the user's current position.

Aircraft markers are plotted relative to the user's location:

- Yellow markers: nearby aircraft
- Magenta marker: selected aircraft
- Cyan rings: radar range rings
- Green line: animated radar sweep
- North is always displayed at the top of the screen

The outer ring represents the currently selected radar range. The two inner rings represent approximately one-third and two-thirds of the selected range.

For example, at the default 10 NM setting:

- Inner ring: approximately 3.3 NM
- Middle ring: approximately 6.6 NM
- Outer ring: 10 NM

The aircraft list is sorted by distance, so the closest aircraft within the selected range is highlighted by default.

The lower information area includes the selected aircraft information, aircraft count, and current radar range. An example is:

```text
3500 FT | 6 AC | 20 NM
```

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
2. Receives radar-range changes from the watch.
3. Requests nearby aircraft from ADS-B.fi using the selected range.
4. Filters aircraft without valid coordinates.
5. Calculates distance and bearing from the user's location.
6. Filters aircraft outside the selected range.
7. Sorts aircraft from nearest to farthest.
8. Keeps up to 8 of the closest aircraft.
9. Converts the results into a compact payload.
10. Sends the payload and current range to the watch through Pebble AppMessage.

### Watch side

File:

```text
src/embeddedjs/main.js
```

The watch-side code:

1. Handles the Up and Down button presses.
2. Selects one of the supported radar ranges.
3. Sends the selected range to the phone.
4. Receives the compact aircraft payload.
5. Parses the aircraft records.
6. Draws the circular radar display.
7. Scales aircraft positions against the selected range.
8. Highlights the nearest visible aircraft.
9. Displays aircraft information and current range.
10. Animates the radar sweep.

This design prevents the full ADS-B JSON response from being transferred to the watch, which helps avoid memory and stability problems.

## Watch-to-Phone Messaging

The app uses three AppMessage keys:

```json
"messageKeys": [
  "STATUS",
  "AIRCRAFT",
  "RADAR_RANGE"
]
```

- `STATUS`: connection and data-loading status
- `AIRCRAFT`: compact serialized aircraft records
- `RADAR_RANGE`: selected range in nautical miles

The watch sends `RADAR_RANGE` when the user changes the range. The phone sends the current `RADAR_RANGE` back with aircraft updates so both sides remain synchronized.

## ADS-B Data Source

Aircraft data is retrieved from the ADS-B.fi open data API.

Example request at the default 10 NM range:

```text
https://opendata.adsb.fi/api/v3/lat/LATITUDE/lon/LONGITUDE/dist/10
```

At 40 NM, the final portion becomes:

```text
/dist/40
```

The `dist` value is expressed in nautical miles and changes with the range selected on the watch.

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
curl -LsSf https://astr.sh/uv/install.sh | sh
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

The phone-side defaults are defined in:

```text
src/pkjs/index.js
```

The watch-side range choices are defined in:

```text
src/embeddedjs/main.js
```

Range configuration:

```javascript
const RADAR_RANGES_NM = [5, 10, 20, 40];
const DEFAULT_RANGE_INDEX = 1;
```

Because array index `1` contains `10`, the default range is 10 NM.

Other current defaults include:

```javascript
const MAX_AIRCRAFT = 8;
const REFRESH_MS = 7200;
```

Current behavior:

- Available ranges: 5, 10, 20, and 40 NM
- Default range: 10 NM
- Maximum aircraft: 8
- Refresh interval: about 7.2 seconds
- One automatic refresh per full radar sweep
- Immediate refresh after changing range

The sweep animation is defined in:

```text
src/embeddedjs/main.js
```

```javascript
sweepAngle = (sweepAngle + 4) % 360;
```

The sweep timer runs every 80 milliseconds.

## How Aircraft Are Selected

The phone-side code sorts processed aircraft by distance:

```javascript
results.sort(function(first, second) {
  return first.distanceTenths - second.distanceTenths;
});
```

The nearest aircraft within the currently selected range is:

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

### Range buttons do not update the radar

Check that `package.json` includes the `RADAR_RANGE` message key:

```json
"messageKeys": [
  "STATUS",
  "AIRCRAFT",
  "RADAR_RANGE"
]
```

Then clean, rebuild, and reinstall both the watch app and phone-side JavaScript:

```bash
pebble clean
pebble build
pebble install --emulator gabbro
```

Watch the logs while pressing Up or Down:

```bash
pebble logs --emulator gabbro
```

### Emulator opens and immediately exits

```bash
pebble install --emulator gabbro -vvvv
```

Also check:

```bash
pebble logs --emulator gabbro
```

### Emulator cannot find libpng

```bash
brew install libpng
brew link --overwrite libpng
```

### App stays on `WAITING FOR PHONE`

Confirm all three message keys are present in `package.json`, then rebuild and reinstall the app.

### No aircraft appear

Possible causes:

- No aircraft are currently within the selected range
- The range is set to 5 NM and no aircraft are that close
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
- Save the selected radar range between app launches

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

This project is licensed under the MIT License.

See the [LICENSE](LICENSE) file for details.

## Author

**Jason Marquette**

GitHub: `jasonmarquette`
