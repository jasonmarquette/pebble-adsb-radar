const DEFAULT_RADAR_RANGE_NM = 10;
const ALLOWED_RADAR_RANGES_NM = [5, 10, 20, 40];
const MAX_AIRCRAFT = 8;
const REFRESH_MS = 7200;

let radarRangeNm = DEFAULT_RADAR_RANGE_NM;
let refreshTimer = null;
let requestRunning = false;

function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function radiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}

function normalizeBearing(degrees) {
  return (degrees + 360) % 360;
}

function calculateDistanceNm(lat1, lon1, lat2, lon2) {
  const earthRadiusNm = 3440.065;
  const latitude1 = degreesToRadians(lat1);
  const latitude2 = degreesToRadians(lat2);
  const deltaLatitude = degreesToRadians(lat2 - lat1);
  const deltaLongitude = degreesToRadians(lon2 - lon1);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(latitude1) * Math.cos(latitude2) *
    Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusNm * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const latitude1 = degreesToRadians(lat1);
  const latitude2 = degreesToRadians(lat2);
  const deltaLongitude = degreesToRadians(lon2 - lon1);
  const y = Math.sin(deltaLongitude) * Math.cos(latitude2);
  const x =
    Math.cos(latitude1) * Math.sin(latitude2) -
    Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(deltaLongitude);
  return normalizeBearing(radiansToDegrees(Math.atan2(y, x)));
}

function getCallsign(rawAircraft) {
  if (typeof rawAircraft.flight === "string" && rawAircraft.flight.trim().length > 0) {
    return rawAircraft.flight.trim();
  }
  if (typeof rawAircraft.r === "string" && rawAircraft.r.trim().length > 0) {
    return rawAircraft.r.trim();
  }
  if (typeof rawAircraft.hex === "string") {
    return rawAircraft.hex.toUpperCase();
  }
  return "UNKNOWN";
}

function getAltitude(rawAircraft) {
  if (typeof rawAircraft.alt_baro === "number") {
    return Math.round(rawAircraft.alt_baro);
  }
  if (typeof rawAircraft.alt_geom === "number") {
    return Math.round(rawAircraft.alt_geom);
  }
  return 0;
}

function processAircraft(rawList, userLat, userLon) {
  if (!Array.isArray(rawList)) {
    return [];
  }

  const results = [];

  rawList.forEach(function(rawAircraft) {
    if (typeof rawAircraft.lat !== "number" || typeof rawAircraft.lon !== "number") {
      return;
    }

    const distanceNm = calculateDistanceNm(
      userLat,
      userLon,
      rawAircraft.lat,
      rawAircraft.lon
    );

    if (distanceNm > radarRangeNm) {
      return;
    }

    results.push({
      callsign: getCallsign(rawAircraft),
      distanceTenths: Math.round(distanceNm * 10),
      bearing: Math.round(
        calculateBearing(userLat, userLon, rawAircraft.lat, rawAircraft.lon)
      ),
      track: typeof rawAircraft.track === "number" ? Math.round(rawAircraft.track) : 0,
      altitude: getAltitude(rawAircraft)
    });
  });

  results.sort(function(first, second) {
    return first.distanceTenths - second.distanceTenths;
  });

  return results.slice(0, MAX_AIRCRAFT);
}

function serializeAircraft(aircraft) {
  return aircraft.map(function(item) {
    return [
      item.callsign,
      item.distanceTenths,
      item.bearing,
      item.track,
      item.altitude
    ].join(",");
  }).join(";");
}

function sendStatus(status, aircraftText) {
  Pebble.sendAppMessage(
    {
      STATUS: status,
      AIRCRAFT: aircraftText || "",
      RADAR_RANGE: radarRangeNm
    },
    function() {
      console.log("Sent update to watch: " + status);
    },
    function(error) {
      console.log("Could not send update: " + JSON.stringify(error));
    }
  );
}

function fetchAircraft(latitude, longitude) {
  const url =
    "https://opendata.adsb.fi/api/v3/lat/" + latitude +
    "/lon/" + longitude +
    "/dist/" + radarRangeNm;

  console.log("Requesting: " + url);
  const request = new XMLHttpRequest();
  request.open("GET", url, true);

  request.onload = function() {
    requestRunning = false;

    if (request.status < 200 || request.status >= 300) {
      console.log("ADS-B HTTP error: " + request.status);
      sendStatus("HTTP " + request.status, "");
      return;
    }

    try {
      const response = JSON.parse(request.responseText);
      const aircraft = processAircraft(response.ac, latitude, longitude);
      const compactAircraft = serializeAircraft(aircraft);
      console.log("Aircraft returned: " + aircraft.length);
      console.log("Compact payload bytes: " + compactAircraft.length);
      sendStatus("LIVE", compactAircraft);
    } catch (error) {
      console.log("JSON processing error: " + error);
      sendStatus("DATA ERROR", "");
    }
  };

  request.onerror = function() {
    requestRunning = false;
    console.log("ADS-B network request failed");
    sendStatus("NETWORK ERROR", "");
  };

  request.send();
}

function updateRadar() {
  if (requestRunning) {
    console.log("Update already running");
    return;
  }

  requestRunning = true;
  sendStatus("GETTING GPS", "");

  navigator.geolocation.getCurrentPosition(
    function(position) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      console.log("Location: " + latitude + ", " + longitude);
      sendStatus("LOADING ADS-B", "");
      fetchAircraft(latitude, longitude);
    },
    function(error) {
      requestRunning = false;
      console.log("Location error " + error.code + ": " + error.message);
      sendStatus("GPS ERROR", "");
    },
    {
      enableHighAccuracy: false,
      maximumAge: 60000,
      timeout: 10000
    }
  );
}

Pebble.addEventListener("appmessage", function(event) {
  const requestedRange = Number(event.payload.RADAR_RANGE);

  if (ALLOWED_RADAR_RANGES_NM.indexOf(requestedRange) < 0) {
    return;
  }

  if (requestedRange === radarRangeNm) {
    sendStatus("LIVE", "");
    return;
  }

  radarRangeNm = requestedRange;
  requestRunning = false;
  console.log("Watch requested " + radarRangeNm + " NM range");
  updateRadar();
});

Pebble.addEventListener("ready", function() {
  console.log("ADS-B PKJS ready");
  updateRadar();

  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(updateRadar, REFRESH_MS);
});
