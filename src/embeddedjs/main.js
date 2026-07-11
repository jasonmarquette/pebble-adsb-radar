import Poco from "commodetto/Poco";
import Button from "pebble/button";
import Message from "pebble/message";

const render = new Poco(screen);

const BG = render.makeColor(3, 10, 20);
const GRID = render.makeColor(0, 150, 180);
const GRID_DIM = render.makeColor(0, 70, 90);
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
let aircraft = [];
let statusText = "WAITING FOR PHONE";
let sweepAngle = 0;
let sweepTimer = null;
let messageWritable = false;

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function polarToScreen(centerX, centerY, distanceNm, bearing, radarRadius) {
  const angle = degreesToRadians(bearing);
  const scaledDistance = Math.min(distanceNm / radarRangeNm, 1) * radarRadius;

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

function drawAircraftMarker(item, centerX, centerY, radarRadius, isSelected, showLabel) {
  if (item.distanceNm > radarRangeNm) {
    return;
  }

  const point = polarToScreen(
    centerX,
    centerY,
    item.distanceNm,
    item.bearing,
    radarRadius
  );
  const markerColor = isSelected ? SELECTED : TARGET;

  render.fillRectangle(markerColor, point.x - 2, point.y - 2, 5, 5);

  const direction = item.track > 0 ? item.track : item.bearing;
  const directionRadians = degreesToRadians(direction);
  const noseX = Math.round(point.x + Math.sin(directionRadians) * 7);
  const noseY = Math.round(point.y - Math.cos(directionRadians) * 7);
  render.drawLine(point.x, point.y, noseX, noseY, markerColor, 2);

  if (!showLabel) {
    return;
  }

  const callsign = item.callsign && item.callsign.length > 0
    ? item.callsign.slice(0, 7)
    : "UNKNOWN";
  const detailText = item.distanceNm.toFixed(1) + "NM " +
    (item.altitude > 0 ? item.altitude + "FT" : "ALT--");
  const labelWidth = Math.max(
    render.getTextWidth(callsign, SMALL_FONT),
    render.getTextWidth(detailText, SMALL_FONT)
  );
  let labelX = point.x + 7;
  let labelY = point.y - 12;

  if (labelX + labelWidth > render.width - 8) {
    labelX = point.x - labelWidth - 7;
  }
  if (labelY < 14) {
    labelY = point.y + 7;
  }

  render.drawText(callsign, SMALL_FONT, SELECTED, labelX, labelY);
  render.drawText(detailText, SMALL_FONT, TARGET_TEXT, labelX, labelY + 13);
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
      altitude: Number.isFinite(altitude) ? altitude : 0
    });
  }

  return parsed;
}

function visibleAircraft() {
  return aircraft.filter(function(item) {
    return item.distanceNm <= radarRangeNm;
  });
}

function drawRadar() {
  const centerX = Math.round(render.width / 2);
  const centerY = Math.round(render.height / 2) - 26;
  const radarRadius = Math.floor(Math.min(render.width, render.height) / 2) - 40;
  const visible = visibleAircraft();
  const selectedAircraft = visible.length > 0 ? visible[0] : null;

  render.begin();
  render.fillRectangle(BG, 0, 0, render.width, render.height);

  drawSweep(centerX, centerY, radarRadius);
  drawCircleOutline(GRID_DIM, centerX, centerY, Math.round(radarRadius * 0.33));
  drawCircleOutline(GRID_DIM, centerX, centerY, Math.round(radarRadius * 0.66));
  drawCircleOutline(GRID, centerX, centerY, radarRadius, 2);

  render.drawLine(
    centerX - radarRadius,
    centerY,
    centerX + radarRadius,
    centerY,
    GRID_DIM,
    1
  );
  render.drawLine(
    centerX,
    centerY - radarRadius,
    centerX,
    centerY + radarRadius,
    GRID_DIM,
    1
  );

  render.fillRectangle(CENTER_DOT, centerX - 2, centerY - 2, 5, 5);
  drawCenteredText("N", LABEL_FONT, WHITE, 3);

  for (let i = 0; i < visible.length; i++) {
    drawAircraftMarker(
      visible[i],
      centerX,
      centerY,
      radarRadius,
      i === 0,
      i === 0
    );
  }

  if (selectedAircraft) {
    const callsign = selectedAircraft.callsign && selectedAircraft.callsign.length > 0
      ? selectedAircraft.callsign
      : "UNKNOWN";
    const distanceText = selectedAircraft.distanceNm.toFixed(1) + " NM";
    const altitudeText = selectedAircraft.altitude > 0
      ? selectedAircraft.altitude + " FT"
      : "ALT --";

    drawCenteredText(
      callsign + "  " + distanceText,
      LABEL_FONT,
      WHITE,
      render.height - 58
    );
    drawCenteredText(
      altitudeText + " | " + visible.length + " AC | " + radarRangeNm + " NM",
      SMALL_FONT,
      TARGET,
      render.height - 41
    );
    drawCenteredText(
      statusText,
      SMALL_FONT,
      statusText === "LIVE" ? SWEEP_EDGE : GRAY,
      render.height - 24
    );
  } else {
    drawCenteredText(
      "0 AC | " + radarRangeNm + " NM",
      LABEL_FONT,
      WHITE,
      render.height - 56
    );
    drawCenteredText(statusText, SMALL_FONT, GRAY, render.height - 32);
  }

  render.end();
}

function sendRangeToPhone() {
  if (!messageWritable) {
    return;
  }

  const outgoing = new Map();
  outgoing.set("RADAR_RANGE", radarRangeNm);
  message.write(outgoing);
  statusText = "RANGE " + radarRangeNm + " NM";
  console.log("Radar range changed to " + radarRangeNm + " NM");
  drawRadar();
}

function changeRadarRange(direction) {
  const nextIndex = radarRangeIndex + direction;
  radarRangeIndex = Math.max(0, Math.min(RADAR_RANGES_NM.length - 1, nextIndex));

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

    received.forEach(function(value, key) {
      if (key === "STATUS") {
        statusText = String(value);
      }
      if (key === "AIRCRAFT") {
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
    sendRangeToPhone();
  },

  onSuspend() {
    messageWritable = false;
    statusText = "PHONE DISCONNECTED";
    drawRadar();
  }
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
  }
});

function startSweepAnimation() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
  }

  sweepTimer = setInterval(function() {
    sweepAngle = (sweepAngle + 4) % 360;
    drawRadar();
  }, 80);
}

drawRadar();
startSweepAnimation();
