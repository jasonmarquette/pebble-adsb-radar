import Poco from "commodetto/Poco";

const render = new Poco(screen);

// Colors
const BLACK = render.makeColor(0, 0, 0);
const WHITE = render.makeColor(255, 255, 255);
const GREEN = render.makeColor(0, 255, 80);
const DARK_GREEN = render.makeColor(0, 100, 40);
const YELLOW = render.makeColor(255, 220, 0);
const RED = render.makeColor(255, 50, 50);

// Fonts
const SMALL_FONT = new render.Font("Gothic-Regular", 14);
const LABEL_FONT = new render.Font("Gothic-Bold", 14);

// Temporary simulated aircraft.
// Later these will come from the ADS-B API.
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

const RADAR_RANGE_MILES = 10;

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function polarToScreen(centerX, centerY, distance, bearing, radarRadius) {
  const angle = degreesToRadians(bearing);
  const scaledDistance =
    Math.min(distance / RADAR_RANGE_MILES, 1) * radarRadius;

  return {
    x: Math.round(centerX + Math.sin(angle) * scaledDistance),
    y: Math.round(centerY - Math.cos(angle) * scaledDistance)
  };
}

function drawCenteredText(text, font, color, y) {
  const width = render.getTextWidth(text, font);
  const x = Math.round((render.width - width) / 2);

  render.drawText(text, font, color, x, y);
}

function drawAircraftMarker(item, centerX, centerY, radarRadius) {
  const point = polarToScreen(
    centerX,
    centerY,
    item.distance,
    item.bearing,
    radarRadius
  );

  // Aircraft marker
  render.fillRectangle(
    YELLOW,
    point.x - 3,
    point.y - 3,
    7,
    7
  );

  // Small direction indicator
  const headingAngle = degreesToRadians(item.bearing);
  const noseX = Math.round(point.x + Math.sin(headingAngle) * 7);
  const noseY = Math.round(point.y - Math.cos(headingAngle) * 7);

  render.drawLine(
    point.x,
    point.y,
    noseX,
    noseY,
    YELLOW,
    2
  );
}

function drawRadar() {
  const centerX = Math.round(render.width / 2);
  const centerY = Math.round(render.height / 2);

  // Leave room at the top and bottom for labels.
  const radarRadius = Math.floor(
    Math.min(render.width, render.height) / 2
  ) - 24;

  render.begin();

  // Background
  render.fillRectangle(
    BLACK,
    0,
    0,
    render.width,
    render.height
  );

  // Radar range rings
  render.drawCircle(
    DARK_GREEN,
    centerX,
    centerY,
    Math.round(radarRadius * 0.33),
    0,
    360
  );

  render.drawCircle(
    DARK_GREEN,
    centerX,
    centerY,
    Math.round(radarRadius * 0.66),
    0,
    360
  );

  render.drawCircle(
    GREEN,
    centerX,
    centerY,
    radarRadius,
    0,
    360
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

  // Aircraft
  for (const item of aircraft) {
    drawAircraftMarker(
      item,
      centerX,
      centerY,
      radarRadius
    );
  }

  // Cardinal direction
  drawCenteredText(
    "N",
    LABEL_FONT,
    WHITE,
    2
  );

  // Status information
  drawCenteredText(
    `${aircraft.length} AIRCRAFT`,
    LABEL_FONT,
    WHITE,
    render.height - 22
  );

  drawCenteredText(
    `${RADAR_RANGE_MILES} MI`,
    SMALL_FONT,
    GREEN,
    render.height - 38
  );

  render.end();

  console.log(
    `Radar drawn: ${render.width}x${render.height}`
  );
}

drawRadar();