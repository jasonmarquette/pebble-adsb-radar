import Poco from "commodetto/Poco";
import Location from "embedded:sensor/Location";

const render = new Poco(screen);

// Colors
const BLACK = render.makeColor(0, 0, 0);
const WHITE = render.makeColor(255, 255, 255);
const GREEN = render.makeColor(0, 255, 80);
const DARK_GREEN = render.makeColor(0, 100, 40);
const YELLOW = render.makeColor(255, 220, 0);
const RED = render.makeColor(255, 50, 50);
const GRAY = render.makeColor(160, 160, 160);

// Fonts
const SMALL_FONT = new render.Font("Gothic-Regular", 14);
const LABEL_FONT = new render.Font("Gothic-Bold", 14);

const RADAR_RANGE_MILES = 10;

let locationStatus = "WAITING FOR PHONE";
let currentLatitude = null;
let currentLongitude = null;
let locationRequest = null;

// Temporary simulated aircraft.
// These will later be replaced with live ADS-B data.
const aircraft = [
  {
    callsign: "UAL283",
    distance: 3.2,
    bearing: 35,
    altitude: 8200
  },
  {
    callsign: "DAL94",
    distance: 6.7,
    bearing: 145,
    altitude: 12400
  },
  {
    callsign: "N512JM",
    distance: 8.4,
    bearing: 255,
    altitude: 3100
  },
  {
    callsign: "SWA421",
    distance: 4.8,
    bearing: 300,
    altitude: 9600
  }
];

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function polarToScreen(
  centerX,
  centerY,
  distance,
  bearing,
  radarRadius
) {
  const angle = degreesToRadians(bearing);

  const scaledDistance =
    Math.min(distance / RADAR_RANGE_MILES, 1) *
    radarRadius;

  return {
    x: Math.round(
      centerX + Math.sin(angle) * scaledDistance
    ),
    y: Math.round(
      centerY - Math.cos(angle) * scaledDistance
    )
  };
}

function drawCenteredText(text, font, color, y) {
  const width = render.getTextWidth(text, font);
  const x = Math.round((render.width - width) / 2);

  render.drawText(text, font, color, x, y);
}

function drawCircleOutline(
  color,
  centerX,
  centerY,
  radius,
  thickness = 1
) {
  const steps = Math.max(36, radius * 4);

  for (let layer = 0; layer < thickness; layer++) {
    const currentRadius = radius - layer;

    let previousX = centerX;
    let previousY = centerY - currentRadius;

    for (let i = 1; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;

      const x = Math.round(
        centerX + Math.sin(angle) * currentRadius
      );

      const y = Math.round(
        centerY - Math.cos(angle) * currentRadius
      );

      render.drawLine(
        previousX,
        previousY,
        x,
        y,
        color,
        1
      );

      previousX = x;
      previousY = y;
    }
  }
}

function drawAircraftMarker(
  item,
  centerX,
  centerY,
  radarRadius
) {
  const point = polarToScreen(
    centerX,
    centerY,
    item.distance,
    item.bearing,
    radarRadius
  );

  render.fillRectangle(
    YELLOW,
    point.x - 3,
    point.y - 3,
    7,
    7
  );

  const headingAngle =
    degreesToRadians(item.bearing);

  const noseX = Math.round(
    point.x + Math.sin(headingAngle) * 7
  );

  const noseY = Math.round(
    point.y - Math.cos(headingAngle) * 7
  );

  render.drawLine(
    point.x,
    point.y,
    noseX,
    noseY,
    YELLOW,
    2
  );
}

function formatCoordinate(value) {
  if (value === null) {
    return "--";
  }

  return value.toFixed(3);
}

function drawRadar() {
  const centerX = Math.round(render.width / 2);
  const centerY = Math.round(render.height / 2) - 10;

  const radarRadius =
    Math.floor(
      Math.min(render.width, render.height) / 2
    ) - 35;

  render.begin();

  render.fillRectangle(
    BLACK,
    0,
    0,
    render.width,
    render.height
  );

  // Range rings
  drawCircleOutline(
    DARK_GREEN,
    centerX,
    centerY,
    Math.round(radarRadius * 0.33)
  );

  drawCircleOutline(
    DARK_GREEN,
    centerX,
    centerY,
    Math.round(radarRadius * 0.66)
  );

  drawCircleOutline(
    GREEN,
    centerX,
    centerY,
    radarRadius,
    2
  );

  // Crosshairs
  render.drawLine(
    centerX - radarRadius,
    centerY,
    centerX + radarRadius,
    centerY,
    DARK_GREEN,
    1
  );

  render.drawLine(
    centerX,
    centerY - radarRadius,
    centerX,
    centerY + radarRadius,
    DARK_GREEN,
    1
  );

  // User position
  render.fillRectangle(
    RED,
    centerX - 3,
    centerY - 3,
    7,
    7
  );

  // Aircraft markers
  for (const item of aircraft) {
    drawAircraftMarker(
      item,
      centerX,
      centerY,
      radarRadius
    );
  }

  // North label
  drawCenteredText(
    "N",
    LABEL_FONT,
    WHITE,
    2
  );

  // Aircraft count and range
  drawCenteredText(
    `${aircraft.length} AC | ${RADAR_RANGE_MILES} MI`,
    LABEL_FONT,
    WHITE,
    render.height - 47
  );

  // GPS status or coordinates
  if (
    currentLatitude !== null &&
    currentLongitude !== null
  ) {
    drawCenteredText(
      `${formatCoordinate(currentLatitude)}, ` +
      `${formatCoordinate(currentLongitude)}`,
      SMALL_FONT,
      GREEN,
      render.height - 31
    );
  } else {
    drawCenteredText(
      locationStatus,
      SMALL_FONT,
      GRAY,
      render.height - 31
    );
  }

  render.end();
}

function closeLocationRequest() {
  if (locationRequest) {
    locationRequest.close();
    locationRequest = null;
  }
}

function requestLocation() {
  closeLocationRequest();

  locationStatus = "GETTING LOCATION";
  drawRadar();

  console.log("Requesting phone location");

  try {
    locationRequest = new Location({
      onSample() {
        const sample = this.sample();

        if (
          sample &&
          typeof sample.latitude === "number" &&
          typeof sample.longitude === "number"
        ) {
          currentLatitude = sample.latitude;
          currentLongitude = sample.longitude;
          locationStatus = "LOCATION READY";

          console.log(
            "Location: " +
            currentLatitude +
            ", " +
            currentLongitude
          );
        } else {
          locationStatus = "LOCATION FAILED";
          console.log("Location sample was invalid");
        }

        closeLocationRequest();
        drawRadar();
      }
    });

    locationRequest.configure({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000
    });
  } catch (error) {
    locationStatus = "LOCATION ERROR";

    console.log(
      "Location request failed: " +
      error
    );

    closeLocationRequest();
    drawRadar();
  }
}

function handleConnection() {
  const connected =
    watch.connected &&
    watch.connected.pebblekit;

  console.log(
    "PebbleKit connected: " +
    connected
  );

  if (connected) {
    requestLocation();
  } else {
    closeLocationRequest();

    locationStatus = "PHONE NOT CONNECTED";
    drawRadar();
  }
}

drawRadar();

watch.addEventListener(
  "connected",
  handleConnection
);

handleConnection();