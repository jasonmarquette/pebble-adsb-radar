/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	__webpack_require__(1);
	module.exports = __webpack_require__(2);


/***/ }),
/* 1 */
/***/ (function(module, exports) {

	/**
	 * Copyright 2024 Google LLC
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	
	(function(p) {
	  if (!p === undefined) {
	    console.error('Pebble object not found!?');
	    return;
	  }
	
	  // Aliases:
	  p.on = p.addEventListener;
	  p.off = p.removeEventListener;
	
	  // For Android (WebView-based) pkjs, print stacktrace for uncaught errors:
	  if (typeof window !== 'undefined' && window.addEventListener) {
	    window.addEventListener('error', function(event) {
	      if (event.error && event.error.stack) {
	        console.error('' + event.error + '\n' + event.error.stack);
	      }
	    });
	  }
	
	})(Pebble);


/***/ }),
/* 2 */
/***/ (function(module, exports) {

	const RADAR_RANGE_NM = 10;
	const MAX_AIRCRAFT = 8;
	const REFRESH_MS = 7200;
	
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
	    Math.sin(deltaLatitude / 2) *
	      Math.sin(deltaLatitude / 2) +
	    Math.cos(latitude1) *
	      Math.cos(latitude2) *
	      Math.sin(deltaLongitude / 2) *
	      Math.sin(deltaLongitude / 2);
	
	  const c =
	    2 *
	    Math.atan2(
	      Math.sqrt(a),
	      Math.sqrt(1 - a)
	    );
	
	  return earthRadiusNm * c;
	}
	
	function calculateBearing(lat1, lon1, lat2, lon2) {
	  const latitude1 = degreesToRadians(lat1);
	  const latitude2 = degreesToRadians(lat2);
	  const deltaLongitude = degreesToRadians(lon2 - lon1);
	
	  const y =
	    Math.sin(deltaLongitude) *
	    Math.cos(latitude2);
	
	  const x =
	    Math.cos(latitude1) *
	      Math.sin(latitude2) -
	    Math.sin(latitude1) *
	      Math.cos(latitude2) *
	      Math.cos(deltaLongitude);
	
	  return normalizeBearing(
	    radiansToDegrees(Math.atan2(y, x))
	  );
	}
	
	function getCallsign(rawAircraft) {
	  if (
	    typeof rawAircraft.flight === "string" &&
	    rawAircraft.flight.trim().length > 0
	  ) {
	    return rawAircraft.flight.trim();
	  }
	
	  if (
	    typeof rawAircraft.r === "string" &&
	    rawAircraft.r.trim().length > 0
	  ) {
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
	    if (
	      typeof rawAircraft.lat !== "number" ||
	      typeof rawAircraft.lon !== "number"
	    ) {
	      return;
	    }
	
	    const distanceNm = calculateDistanceNm(
	      userLat,
	      userLon,
	      rawAircraft.lat,
	      rawAircraft.lon
	    );
	
	    if (distanceNm > RADAR_RANGE_NM) {
	      return;
	    }
	
	    results.push({
	      callsign: getCallsign(rawAircraft),
	      distanceTenths: Math.round(distanceNm * 10),
	      bearing: Math.round(
	        calculateBearing(
	          userLat,
	          userLon,
	          rawAircraft.lat,
	          rawAircraft.lon
	        )
	      ),
	      track:
	        typeof rawAircraft.track === "number"
	          ? Math.round(rawAircraft.track)
	          : 0,
	      altitude: getAltitude(rawAircraft)
	    });
	  });
	
	  results.sort(function(first, second) {
	    return first.distanceTenths - second.distanceTenths;
	  });
	
	  return results.slice(0, MAX_AIRCRAFT);
	}
	
	/*
	 * Compact format:
	 *
	 * callsign,distanceTenths,bearing,track,altitude;
	 * callsign,distanceTenths,bearing,track,altitude
	 */
	function serializeAircraft(aircraft) {
	  return aircraft
	    .map(function(item) {
	      return [
	        item.callsign,
	        item.distanceTenths,
	        item.bearing,
	        item.track,
	        item.altitude
	      ].join(",");
	    })
	    .join(";");
	}
	
	function sendStatus(status, aircraftText) {
	  Pebble.sendAppMessage(
	    {
	      STATUS: status,
	      AIRCRAFT: aircraftText || ""
	    },
	    function() {
	      console.log("Sent update to watch: " + status);
	    },
	    function(error) {
	      console.log(
	        "Could not send update: " +
	        JSON.stringify(error)
	      );
	    }
	  );
	}
	
	function fetchAircraft(latitude, longitude) {
	  const url =
	    "https://opendata.adsb.fi/api/v3/lat/" +
	    latitude +
	    "/lon/" +
	    longitude +
	    "/dist/" +
	    RADAR_RANGE_NM;
	
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
	
	      const aircraft = processAircraft(
	        response.ac,
	        latitude,
	        longitude
	      );
	
	      const compactAircraft =
	        serializeAircraft(aircraft);
	
	      console.log(
	        "Aircraft returned: " + aircraft.length
	      );
	
	      console.log(
	        "Compact payload bytes: " +
	        compactAircraft.length
	      );
	
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
	
	      console.log(
	        "Location: " +
	        latitude +
	        ", " +
	        longitude
	      );
	
	      sendStatus("LOADING ADS-B", "");
	
	      fetchAircraft(latitude, longitude);
	    },
	
	    function(error) {
	      requestRunning = false;
	
	      console.log(
	        "Location error " +
	        error.code +
	        ": " +
	        error.message
	      );
	
	      sendStatus("GPS ERROR", "");
	    },
	
	    {
	      enableHighAccuracy: false,
	      maximumAge: 300000,
	      timeout: 10000
	    }
	  );
	}
	
	Pebble.addEventListener("ready", function() {
	  console.log("ADS-B PKJS ready");
	
	  updateRadar();
	
	  if (refreshTimer) {
	    clearInterval(refreshTimer);
	  }
	
	  refreshTimer = setInterval(
	    updateRadar,
	    REFRESH_MS
	  );
	});

/***/ })
/******/ ]);
//# sourceMappingURL=pebble-js-app.js.map