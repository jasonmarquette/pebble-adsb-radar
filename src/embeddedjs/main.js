import Poco from "commodetto/Poco";
import Button from "pebble/button";
import Message from "pebble/message";

const render = new Poco(screen);

const BG = render.makeColor(3, 10, 20);
const GRID = render.makeColor(0, 150, 45);
const GRID_DIM = render.makeColor(0, 70, 25);
const SWEEP_EDGE = render.makeColor(0, 255, 120);
const TARGET = render.makeColor(255, 220, 0);
const TARGET_TEXT = render.makeColor(170, 220, 255);
const SELECTED = render.makeColor(255, 0, 180);
const CENTER_DOT = render.makeColor(255, 0, 0);
const WHITE = render.makeColor(255, 255, 255);
const GRAY = render.makeColor(130, 130, 130);

const SMALL_FONT = new render.Font("Gothic-Regular", 14);
const LABEL_FONT = new render.Font("Gothic-Bold", 14);

const RADAR_RANGES_NM = [5, 10, 20, 40];
const DEFAULT_RANGE_INDEX = 1;

let radarRangeIndex = DEFAULT_RANGE_INDEX;
let radarRangeNm = RADAR_RANGES_NM[radarRangeIndex];
const DEMO_MODE = false;

let aircraft = DEMO_MODE
  ? [
      {
        callsign: "PIPISTRL",
        distanceNm: 8.4,
        bearing: 42,
        track: 120,
        altitude: 1385,
      },
      {
        callsign: "ERJ-190",
        distanceNm: 5.6,
        bearing: 328,
        track: 95,
        altitude: 3925,
      },
      {
        callsign: "PA-28R",
        distanceNm: 7.8,
        bearing: 262,
        track: 45,
        altitude: 2000,
      },
      {
        callsign: "737 MAX",
        distanceNm: 4.4,
        bearing: 155,
        track: 80,
        altitude: 29450,
      },
      {
        callsign: "C172",
        distanceNm: 9.2,
        bearing: 198,
        track: 15,
        altitude: 3500,
      },
    ]
  : [];
let statusText = "WAITING FOR PHONE";
let sweepAngle = 0;
let sweepTimer = null;
let messageWritable = false;
let rangeSendPending = false;

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function polarToScreen(centerX, centerY, distanceNm, bearing, radarRadius) {
  const angle = degreesToRadians(bearing);
  const scaledDistance = Math.min(distanceNm / radarRangeNm, 1) * radarRadius;

  return {
    x: Math.round(centerX + Math.sin(angle) * scaledDistance),
    y: Math.round(centerY - Math.cos(angle) * scaledDistance),
  };
}

function drawCenteredText(text, font, color, y) {
  const width = render.getTextWidth(text, font);
  const x = Math.round((render.width - width) / 2);
  render.drawText(text, font, color, x, y);
}

function drawCircleOutline(color, centerX, centerY, radius, thickness = 1) {
  const steps = Math.max(36, radius * 4);

  for (let layer = 0; layer < thickness; layer++) {
    const currentRadius = radius - layer;
    let previousX = centerX;
    let previousY = centerY - currentRadius;

    for (let i = 1; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const x = Math.round(centerX + Math.sin(angle) * currentRadius);
      const y = Math.round(centerY - Math.cos(angle) * currentRadius);
      render.drawLine(previousX, previousY, x, y, color, 1);
      previousX = x;
      previousY = y;
    }
  }
}

function drawSweep(centerX, centerY, radius) {
  function drawRadarLine(angleDegrees, color, thickness) {
    const angle = degreesToRadians(angleDegrees);
    const x = Math.round(centerX + Math.sin(angle) * radius);
    const y = Math.round(centerY - Math.cos(angle) * radius);
    render.drawLine(centerX, centerY, x, y, color, thickness);
  }

  drawRadarLine((sweepAngle - 10 + 360) % 360, render.makeColor(0, 35, 22), 1);
  drawRadarLine((sweepAngle - 5 + 360) % 360, render.makeColor(0, 80, 42), 1);
  drawRadarLine(sweepAngle, SWEEP_EDGE, 2);
}

function drawAircraftMarker(
  item,
  centerX,
  centerY,
  radarRadius,
  isSelected,
  showLabel,
) {
  if (item.distanceNm > radarRangeNm) {
    return;
  }

  const point = polarToScreen(
    centerX,
    centerY,
    item.distanceNm,
    item.bearing,
    radarRadius,
  );

  const markerColor = TARGET;
  const direction = item.track > 0 ? item.track : item.bearing;
  const angle = degreesToRadians(direction);

  const noseX = Math.round(point.x + Math.sin(angle) * 7);
  const noseY = Math.round(point.y - Math.cos(angle) * 7);
  const tailX = Math.round(point.x - Math.sin(angle) * 4);
  const tailY = Math.round(point.y + Math.cos(angle) * 4);

  // Fuselage
  render.drawLine(tailX, tailY, noseX, noseY, markerColor, isSelected ? 2 : 1);

  // Wings
  const wingAngle = angle + Math.PI / 2;
  const wing1X = Math.round(point.x + Math.sin(wingAngle) * 4);
  const wing1Y = Math.round(point.y - Math.cos(wingAngle) * 4);
  const wing2X = Math.round(point.x - Math.sin(wingAngle) * 4);
  const wing2Y = Math.round(point.y + Math.cos(wingAngle) * 4);

  render.drawLine(
    wing1X,
    wing1Y,
    wing2X,
    wing2Y,
    markerColor,
    isSelected ? 2 : 1,
  );

  // Tail
  const tailWing1X = Math.round(tailX + Math.sin(wingAngle) * 2);
  const tailWing1Y = Math.round(tailY - Math.cos(wingAngle) * 2);
  const tailWing2X = Math.round(tailX - Math.sin(wingAngle) * 2);
  const tailWing2Y = Math.round(tailY + Math.cos(wingAngle) * 2);

  render.drawLine(
    tailWing1X,
    tailWing1Y,
    tailWing2X,
    tailWing2Y,
    markerColor,
    1,
  );

  if (!showLabel) {
    return;
  }

  const callsign =
    item.callsign && item.callsign.length > 0
      ? item.callsign.slice(0, 8)
      : "UNKNOWN";

  const detailText =
    item.distanceNm.toFixed(1) +
    "NM " +
    (item.altitude > 0 ? item.altitude + "FT" : "ALT--");

  const callsignWidth = render.getTextWidth(callsign, SMALL_FONT);
  const detailWidth = render.getTextWidth(detailText, SMALL_FONT);
  const labelWidth = Math.max(callsignWidth, detailWidth);

  let labelX;
  let labelY;

  // Put labels away from the center of the radar.
  if (point.x >= centerX) {
    labelX = point.x + 6;
  } else {
    labelX = point.x - labelWidth - 6;
  }

  if (point.y >= centerY) {
    labelY = point.y + 5;
  } else {
    labelY = point.y - 27;
  }

  // Keep labels inside the round display.
  labelY = Math.max(18, Math.min(labelY, render.height - 55));

  const verticalOffset = Math.abs(labelY - centerY);
  const curvedMargin = Math.round(14 + verticalOffset * 0.22);

  labelX = Math.max(
    curvedMargin,
    Math.min(labelX, render.width - labelWidth - curvedMargin),
  );

  render.drawText(callsign, LABEL_FONT, WHITE, labelX, labelY);

  render.drawText(detailText, SMALL_FONT, TARGET_TEXT, labelX, labelY + 15);
}

function parseAircraft(text) {
  if (typeof text !== "string" || text.length === 0) {
    return [];
  }

  const parsed = [];
  const records = text.split(";");

  for (const record of records) {
    const fields = record.split(",");
    if (fields.length < 5) {
      continue;
    }

    const distanceTenths = Number(fields[1]);
    const bearing = Number(fields[2]);
    const track = Number(fields[3]);
    const altitude = Number(fields[4]);

    if (!Number.isFinite(distanceTenths) || !Number.isFinite(bearing)) {
      continue;
    }

    parsed.push({
      callsign: fields[0],
      distanceNm: distanceTenths / 10,
      bearing,
      track: Number.isFinite(track) ? track : 0,
      altitude: Number.isFinite(altitude) ? altitude : 0,
    });
  }

  return parsed;
}

function visibleAircraft() {
  return aircraft.filter(function (item) {
    return item.distanceNm <= radarRangeNm;
  });
}

function drawRadar() {
  const centerX = Math.round(render.width / 2);
  const centerY = Math.round(render.height / 2);
  const radarRadius = 110;
  const visible = visibleAircraft();
  const selectedAircraft = visible.length > 0 ? visible[0] : null;

  render.begin();
  render.fillRectangle(BG, 0, 0, render.width, render.height);

  drawSweep(centerX, centerY, radarRadius);

  for (let i = 1; i <= 5; i++) {
    const radius = Math.round((radarRadius * i) / 5);

    drawCircleOutline(i === 5 ? GRID : GRID_DIM, centerX, centerY, radius, 1);
  }

  render.drawLine(
    centerX - radarRadius,
    centerY,
    centerX + radarRadius,
    centerY,
    GRID_DIM,
    1,
  );

  render.drawLine(
    centerX,
    centerY - radarRadius,
    centerX,
    centerY + radarRadius,
    GRID_DIM,
    1,
  );

  render.drawLine(centerX, 4, centerX, 11, WHITE, 2);
  drawCenteredText("N", LABEL_FONT, WHITE, 12);

  render.fillRectangle(CENTER_DOT, centerX - 2, centerY - 2, 5, 5);

  const countText = visible.length + " AC";
  render.drawText(countText, SMALL_FONT, TARGET_TEXT, 8, 6);

  for (let i = visible.length - 1; i >= 0; i--) {
    drawAircraftMarker(
      visible[i],
      centerX,
      centerY,
      radarRadius,
      i === 0,
      true,
    );
  }

  if (!selectedAircraft) {
    drawCenteredText(
      statusText,
      SMALL_FONT,
      statusText === "LIVE" ? SWEEP_EDGE : GRAY,
      211,
    );
  }
  const rangeText = "< " + radarRangeNm + " NM >";
  const rangeTextWidth = render.getTextWidth(rangeText, LABEL_FONT);
  const badgeWidth = rangeTextWidth + 18;
  const badgeHeight = 22;
  const badgeX = Math.round((render.width - badgeWidth) / 2);
  const badgeY = render.height - 26;

  render.fillRectangle(BG, badgeX, badgeY, badgeWidth, badgeHeight);

  render.drawLine(
    badgeX,
    badgeY,
    badgeX + badgeWidth - 1,
    badgeY,
    SWEEP_EDGE,
    2,
  );

  render.drawLine(
    badgeX,
    badgeY + badgeHeight - 1,
    badgeX + badgeWidth - 1,
    badgeY + badgeHeight - 1,
    SWEEP_EDGE,
    2,
  );

  render.drawLine(
    badgeX,
    badgeY,
    badgeX,
    badgeY + badgeHeight - 1,
    SWEEP_EDGE,
    2,
  );

  render.drawLine(
    badgeX + badgeWidth - 1,
    badgeY,
    badgeX + badgeWidth - 1,
    badgeY + badgeHeight - 1,
    SWEEP_EDGE,
    2,
  );

  render.drawText(rangeText, LABEL_FONT, WHITE, badgeX + 9, badgeY + 3);

  render.end();
}

function flushRangeToPhone() {
  if (!messageWritable || !rangeSendPending) {
    return;
  }

  const outgoing = new Map();
  outgoing.set("RADAR_RANGE", radarRangeNm);

  messageWritable = false;
  rangeSendPending = false;

  try {
    message.write(outgoing);
    console.log("Radar range changed to " + radarRangeNm + " NM");
  } catch (error) {
    rangeSendPending = true;
    console.log("Radar range send deferred: " + error);
  }
}

function sendRangeToPhone() {
  rangeSendPending = true;
  statusText = "RANGE " + radarRangeNm + " NM";
  drawRadar();
  flushRangeToPhone();
}

function changeRadarRange(direction) {
  const nextIndex = radarRangeIndex + direction;
  radarRangeIndex = Math.max(
    0,
    Math.min(RADAR_RANGES_NM.length - 1, nextIndex),
  );

  const nextRange = RADAR_RANGES_NM[radarRangeIndex];
  if (nextRange === radarRangeNm) {
    return;
  }

  radarRangeNm = nextRange;
  sendRangeToPhone();
}

const message = new Message({
  keys: ["STATUS", "AIRCRAFT", "RADAR_RANGE"],

  onReadable() {
    const received = this.read();

    received.forEach(function (value, key) {
      if (key === "STATUS") {
        statusText = String(value);
      }
      if (key === "AIRCRAFT" && !DEMO_MODE) {
        aircraft = parseAircraft(String(value));
      }
      if (key === "RADAR_RANGE") {
        const receivedRange = Number(value);
        const receivedIndex = RADAR_RANGES_NM.indexOf(receivedRange);
        if (receivedIndex >= 0) {
          radarRangeIndex = receivedIndex;
          radarRangeNm = receivedRange;
        }
      }
    });

    console.log("Aircraft received: " + aircraft.length);
    drawRadar();
  },

  onWritable() {
    messageWritable = true;
    console.log("Phone messaging ready");
    flushRangeToPhone();
  },

  onSuspend() {
    messageWritable = false;
    statusText = "PHONE DISCONNECTED";
    drawRadar();
  },
});

new Button({
  types: ["up", "down"],
  onPush(down, type) {
    if (!down) {
      return;
    }

    if (type === "up") {
      changeRadarRange(1);
    } else if (type === "down") {
      changeRadarRange(-1);
    }
  },
});

function startSweepAnimation() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
  }

  sweepTimer = setInterval(function () {
    sweepAngle = (sweepAngle + 4) % 360;
    drawRadar();
  }, 80);
}

drawRadar();
startSweepAnimation();
