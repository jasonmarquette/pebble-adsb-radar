# Pebble ADS-B Radar

![Release](https://img.shields.io/github/v/release/jasonmarquette/pebble-adsb-radar)
![License](https://img.shields.io/github/license/jasonmarquette/pebble-adsb-radar)

![ADS-B Radar](images/banner.png)

A live ADS-B aircraft radar application for **Pebble Round 2** and
**Pebble Time 2** that uses your connected phone's GPS and the ADS-B.fi
API to display nearby aircraft on a smooth animated radar.

## ADS-B Radar v1.1.1

### Fixed

- Added touchscreen tap-to-wake support for Pebble Time 2 and Pebble Round 2.
- Improved stability during automatic ADS-B refreshes.
- Reduced GPS and ADS-B polling from every 7.2 seconds to every 60 seconds.
- Removed an unnecessary five-second delay before loading traffic.
- Fixed an Alloy module packaging issue that could cause a blank screen.

### Tested

- Tap-to-wake confirmed on the Emery emulator.
- Multiple automatic refresh cycles completed without crashing.

## Features

-   Live ADS-B.fi aircraft data
-   Phone GPS positioning
-   Animated radar sweep
-   Five evenly spaced radar rings
-   Adjustable 5/10/20/40 NM ranges
-   Up to 8 nearby aircraft
-   Aircraft plotted by bearing and distance
-   Automatic nearest-aircraft selection
-   Callsigns for every visible aircraft
-   Distance and altitude displayed for the selected aircraft
-   Aircraft count indicator
-   Current radar range badge
-   Pebble Round 2 (`gabbro`) and Pebble Time 2 (`emery`) support

## Watch Controls

  Button   Action
  -------- ----------------------
  Up       Increase radar range
  Down     Decrease radar range

Available ranges:

``` text
5 NM → 10 NM → 20 NM → 40 NM
```

The app starts at **10 NM**.

## Radar Display

-   🔴 Red center marker = your location
-   🟡 Yellow aircraft markers = nearby aircraft
-   ⭐ Closest aircraft emphasized with a thicker marker
-   Callsigns displayed for all visible aircraft
-   Distance and altitude shown for the closest aircraft
-   Five evenly spaced range rings
-   Animated radar sweep
-   Aircraft count in the upper-left
-   Current range badge centered at the bottom
-   North indicator at the top

## Architecture

``` text
ADS-B.fi
   │
Phone GPS
   │
PKJS (Phone)
 • Fetch aircraft
 • Calculate distance & bearing
 • Filter by selected range
 • Sort nearest first
 • Compress payload
   │
AppMessage
   │
Pebble Watch
 • Parse aircraft
 • Draw radar
 • Animate sweep
 • Handle range buttons
```

## Project Structure

``` text
pebble-adsb-radar/
├── README.md
├── package.json
├── wscript
└── src/
    ├── embeddedjs/
    │   ├── main.js
    │   └── manifest.json
    └── pkjs/
        └── index.js
```

## Requirements

-   Pebble SDK 4.17+
-   Pebble Tool 5
-   Python 3.13
-   Node.js
-   macOS or Linux

## Install

``` bash
git clone https://github.com/jasonmarquette/pebble-adsb-radar.git
cd pebble-adsb-radar
pebble package install
```

## Build

``` bash
pebble clean
pebble build
```

The compiled `.pbw` is created in `build/`.

## Emulator

``` bash
pebble install --emulator gabbro
```

or

``` bash
pebble install --emulator emery
```

View logs:

``` bash
pebble logs --emulator gabbro
```

## Physical Watch

``` bash
export PEBBLE_PHONE=<phone-ip>
pebble install
```

## Configuration

``` javascript
const RADAR_RANGES_NM = [5, 10, 20, 40];
const DEFAULT_RANGE_INDEX = 1;
const MAX_AIRCRAFT = 8;
const REFRESH_MS = 7200;
```

## Messaging

The watch queues radar range changes if AppMessage is temporarily
unavailable and automatically delivers the latest pending update once
messaging becomes writable.

## Troubleshooting

### No aircraft

-   Verify GPS permission.
-   Check internet connectivity.
-   Ensure aircraft are within the selected range.
-   Verify PebbleKit JS is running.

### Waiting for phone

Verify AppMessage keys match between the phone and watch and reinstall
the application.

## Planned Improvements

-   Aircraft detail screen
-   Ground speed
-   Registration and aircraft type
-   Save radar range between launches
-   Aircraft trails
-   Radar sweep "blip" effect
-   Altitude-based aircraft colors
-   Configurable refresh interval

## Privacy

The application uses the connected phone's location only to retrieve
nearby aircraft. No location history is intentionally stored.

## License

MIT License

## Author

**Jason Marquette**

GitHub: https://github.com/jasonmarquette
