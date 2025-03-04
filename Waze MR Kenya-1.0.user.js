// ==UserScript==
// @author       Mate
// @name         Waze MR Kenya
// @description  This script adds a menu with links to a permalink page on several maps.
// @version      1.0
// @include      https://www.waze.com/*/editor*
// @include      https://www.waze.com/editor*
// @include      https://beta.waze.com/*
// @exclude      https://www.waze.com/*user/*editor/*
// @grant        none
// @namespace    https://github.com/vstvst/WME-Kenya-MR
// ==/UserScript==

// Mini How-To:
// 1) Install this script as Greasemonkey script or Tampermonkey script
// 2) Click on desired permalink in the menu

let $ = null;
if (window.$ === undefined) {
    $ = unsafeWindow.$;
} else {
    $ = window.$;
}

let W = null;
if (window.W === undefined) {
    W = unsafeWindow.W;
} else {
    W = window.W;
}

// Extend Storage object to support serialization of objects
Storage.prototype.setObject = function (key, value) {
    this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function (key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
};

var pi = 3.14159265358979;

/* Ellipsoid model constants (actual values here are for WGS84) */
var sm_a = 6378137.0;
var sm_b = 6356752.314;
var sm_EccSquared = 6.69437999013e-3;

var UTMScaleFactor = 0.9996;

/*
 * DegToRad
 *
 * Converts degrees to radians.
 *
 */
function DegToRad(deg) {
    return (deg / 180.0) * pi;
}

/*
 * RadToDeg
 *
 * Converts radians to degrees.
 *
 */
function RadToDeg(rad) {
    return (rad / pi) * 180.0;
}

/*
 * ArcLengthOfMeridian
 *
 * Computes the ellipsoidal distance from the equator to a point at a
 * given latitude.
 *
 * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
 * GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
 *
 * Inputs:
 *     phi - Latitude of the point, in radians.
 *
 * Globals:
 *     sm_a - Ellipsoid model major axis.
 *     sm_b - Ellipsoid model minor axis.
 *
 * Returns:
 *     The ellipsoidal distance of the point from the equator, in meters.
 *
 */
function ArcLengthOfMeridian(phi) {
    var alpha, beta, gamma, delta, epsilon, n;
    var result;

    /* Precalculate n */
    n = (sm_a - sm_b) / (sm_a + sm_b);

    /* Precalculate alpha */
    alpha =
        ((sm_a + sm_b) / 2.0) *
        (1.0 + Math.pow(n, 2.0) / 4.0 + Math.pow(n, 4.0) / 64.0);

    /* Precalculate beta */
    beta =
        (-3.0 * n) / 2.0 +
        (9.0 * Math.pow(n, 3.0)) / 16.0 +
        (-3.0 * Math.pow(n, 5.0)) / 32.0;

    /* Precalculate gamma */
    gamma =
        (15.0 * Math.pow(n, 2.0)) / 16.0 + (-15.0 * Math.pow(n, 4.0)) / 32.0;

    /* Precalculate delta */
    delta =
        (-35.0 * Math.pow(n, 3.0)) / 48.0 + (105.0 * Math.pow(n, 5.0)) / 256.0;

    /* Precalculate epsilon */
    epsilon = (315.0 * Math.pow(n, 4.0)) / 512.0;

    /* Now calculate the sum of the series and return */
    result =
        alpha *
        (phi +
            beta * Math.sin(2.0 * phi) +
            gamma * Math.sin(4.0 * phi) +
            delta * Math.sin(6.0 * phi) +
            epsilon * Math.sin(8.0 * phi));

    return result;
}

/*
 * UTMCentralMeridian
 *
 * Determines the central meridian for the given UTM zone.
 *
 * Inputs:
 *     zone - An integer value designating the UTM zone, range [1,60].
 *
 * Returns:
 *   The central meridian for the given UTM zone, in radians, or zero
 *   if the UTM zone parameter is outside the range [1,60].
 *   Range of the central meridian is the radian equivalent of [-177,+177].
 *
 */
function UTMCentralMeridian(zone) {
    var cmeridian;

    cmeridian = DegToRad(-183.0 + zone * 6.0);

    return cmeridian;
}

/*
 * FootpointLatitude
 *
 * Computes the footpoint latitude for use in converting transverse
 * Mercator coordinates to ellipsoidal coordinates.
 *
 * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
 *   GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
 *
 * Inputs:
 *   y - The UTM northing coordinate, in meters.
 *
 * Returns:
 *   The footpoint latitude, in radians.
 *
 */
function FootpointLatitude(y) {
    var y_, alpha_, beta_, gamma_, delta_, epsilon_, n;
    var result;

    /* Precalculate n (Eq. 10.18) */
    n = (sm_a - sm_b) / (sm_a + sm_b);

    /* Precalculate alpha_ (Eq. 10.22) */
    /* (Same as alpha in Eq. 10.17) */
    alpha_ =
        ((sm_a + sm_b) / 2.0) *
        (1 + Math.pow(n, 2.0) / 4 + Math.pow(n, 4.0) / 64);

    /* Precalculate y_ (Eq. 10.23) */
    y_ = y / alpha_;

    /* Precalculate beta_ (Eq. 10.22) */
    beta_ =
        (3.0 * n) / 2.0 +
        (-27.0 * Math.pow(n, 3.0)) / 32.0 +
        (269.0 * Math.pow(n, 5.0)) / 512.0;

    /* Precalculate gamma_ (Eq. 10.22) */
    gamma_ =
        (21.0 * Math.pow(n, 2.0)) / 16.0 + (-55.0 * Math.pow(n, 4.0)) / 32.0;

    /* Precalculate delta_ (Eq. 10.22) */
    delta_ =
        (151.0 * Math.pow(n, 3.0)) / 96.0 + (-417.0 * Math.pow(n, 5.0)) / 128.0;

    /* Precalculate epsilon_ (Eq. 10.22) */
    epsilon_ = (1097.0 * Math.pow(n, 4.0)) / 512.0;

    /* Now calculate the sum of the series (Eq. 10.21) */
    result =
        y_ +
        beta_ * Math.sin(2.0 * y_) +
        gamma_ * Math.sin(4.0 * y_) +
        delta_ * Math.sin(6.0 * y_) +
        epsilon_ * Math.sin(8.0 * y_);

    return result;
}

/*
 * MapLatLonToXY
 *
 * Converts a latitude/longitude pair to x and y coordinates in the
 * Transverse Mercator projection.  Note that Transverse Mercator is not
 * the same as UTM; a scale factor is required to convert between them.
 *
 * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
 * GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
 *
 * Inputs:
 *    phi - Latitude of the point, in radians.
 *    lambda - Longitude of the point, in radians.
 *    lambda0 - Longitude of the central meridian to be used, in radians.
 *
 * Outputs:
 *    xy - A 2-element array containing the x and y coordinates
 *         of the computed point.
 *
 * Returns:
 *    The function does not return a value.
 *
 */
function MapLatLonToXY(phi, lambda, lambda0, xy) {
    var N, nu2, ep2, t, t2, l;
    var l3coef, l4coef, l5coef, l6coef, l7coef, l8coef;
    var tmp;

    /* Precalculate ep2 */
    ep2 = (Math.pow(sm_a, 2.0) - Math.pow(sm_b, 2.0)) / Math.pow(sm_b, 2.0);

    /* Precalculate nu2 */
    nu2 = ep2 * Math.pow(Math.cos(phi), 2.0);

    /* Precalculate N */
    N = Math.pow(sm_a, 2.0) / (sm_b * Math.sqrt(1 + nu2));

    /* Precalculate t */
    t = Math.tan(phi);
    t2 = t * t;
    tmp = t2 * t2 * t2 - Math.pow(t, 6.0);

    /* Precalculate l */
    l = lambda - lambda0;

    /* Precalculate coefficients for l**n in the equations below
       so a normal human being can read the expressions for easting
       and northing
       -- l**1 and l**2 have coefficients of 1.0 */
    l3coef = 1.0 - t2 + nu2;

    l4coef = 5.0 - t2 + 9 * nu2 + 4.0 * (nu2 * nu2);

    l5coef = 5.0 - 18.0 * t2 + t2 * t2 + 14.0 * nu2 - 58.0 * t2 * nu2;

    l6coef = 61.0 - 58.0 * t2 + t2 * t2 + 270.0 * nu2 - 330.0 * t2 * nu2;

    l7coef = 61.0 - 479.0 * t2 + 179.0 * (t2 * t2) - t2 * t2 * t2;

    l8coef = 1385.0 - 3111.0 * t2 + 543.0 * (t2 * t2) - t2 * t2 * t2;

    /* Calculate easting (x) */
    xy[0] =
        N * Math.cos(phi) * l +
        (N / 6.0) * Math.pow(Math.cos(phi), 3.0) * l3coef * Math.pow(l, 3.0) +
        (N / 120.0) * Math.pow(Math.cos(phi), 5.0) * l5coef * Math.pow(l, 5.0) +
        (N / 5040.0) * Math.pow(Math.cos(phi), 7.0) * l7coef * Math.pow(l, 7.0);

    /* Calculate northing (y) */
    xy[1] =
        ArcLengthOfMeridian(phi) +
        (t / 2.0) * N * Math.pow(Math.cos(phi), 2.0) * Math.pow(l, 2.0) +
        (t / 24.0) *
            N *
            Math.pow(Math.cos(phi), 4.0) *
            l4coef *
            Math.pow(l, 4.0) +
        (t / 720.0) *
            N *
            Math.pow(Math.cos(phi), 6.0) *
            l6coef *
            Math.pow(l, 6.0) +
        (t / 40320.0) *
            N *
            Math.pow(Math.cos(phi), 8.0) *
            l8coef *
            Math.pow(l, 8.0);

    return;
}

/*
 * MapXYToLatLon
 *
 * Converts x and y coordinates in the Transverse Mercator projection to
 * a latitude/longitude pair.  Note that Transverse Mercator is not
 * the same as UTM; a scale factor is required to convert between them.
 *
 * Reference: Hoffmann-Wellenhof, B., Lichtenegger, H., and Collins, J.,
 *   GPS: Theory and Practice, 3rd ed.  New York: Springer-Verlag Wien, 1994.
 *
 * Inputs:
 *   x - The easting of the point, in meters.
 *   y - The northing of the point, in meters.
 *   lambda0 - Longitude of the central meridian to be used, in radians.
 *
 * Outputs:
 *   philambda - A 2-element containing the latitude and longitude
 *               in radians.
 *
 * Returns:
 *   The function does not return a value.
 *
 * Remarks:
 *   The local variables Nf, nuf2, tf, and tf2 serve the same purpose as
 *   N, nu2, t, and t2 in MapLatLonToXY, but they are computed with respect
 *   to the footpoint latitude phif.
 *
 *   x1frac, x2frac, x2poly, x3poly, etc. are to enhance readability and
 *   to optimize computations.
 *
 */
function MapXYToLatLon(x, y, lambda0, philambda) {
    var phif, Nf, Nfpow, nuf2, ep2, tf, tf2, tf4, cf;
    var x1frac, x2frac, x3frac, x4frac, x5frac, x6frac, x7frac, x8frac;
    var x2poly, x3poly, x4poly, x5poly, x6poly, x7poly, x8poly;

    /* Get the value of phif, the footpoint latitude. */
    phif = FootpointLatitude(y);

    /* Precalculate ep2 */
    ep2 = (Math.pow(sm_a, 2.0) - Math.pow(sm_b, 2.0)) / Math.pow(sm_b, 2.0);

    /* Precalculate cos (phif) */
    cf = Math.cos(phif);

    /* Precalculate nuf2 */
    nuf2 = ep2 * Math.pow(cf, 2.0);

    /* Precalculate Nf and initialize Nfpow */
    Nf = Math.pow(sm_a, 2.0) / (sm_b * Math.sqrt(1 + nuf2));
    Nfpow = Nf;

    /* Precalculate tf */
    tf = Math.tan(phif);
    tf2 = tf * tf;
    tf4 = tf2 * tf2;

    /* Precalculate fractional coefficients for x**n in the equations
       below to simplify the expressions for latitude and longitude. */
    x1frac = 1.0 / (Nfpow * cf);

    Nfpow *= Nf; /* now equals Nf**2) */
    x2frac = tf / (2.0 * Nfpow);

    Nfpow *= Nf; /* now equals Nf**3) */
    x3frac = 1.0 / (6.0 * Nfpow * cf);

    Nfpow *= Nf; /* now equals Nf**4) */
    x4frac = tf / (24.0 * Nfpow);

    Nfpow *= Nf; /* now equals Nf**5) */
    x5frac = 1.0 / (120.0 * Nfpow * cf);

    Nfpow *= Nf; /* now equals Nf**6) */
    x6frac = tf / (720.0 * Nfpow);

    Nfpow *= Nf; /* now equals Nf**7) */
    x7frac = 1.0 / (5040.0 * Nfpow * cf);

    Nfpow *= Nf; /* now equals Nf**8) */
    x8frac = tf / (40320.0 * Nfpow);

    /* Precalculate polynomial coefficients for x**n.
       -- x**1 does not have a polynomial coefficient. */
    x2poly = -1.0 - nuf2;

    x3poly = -1.0 - 2 * tf2 - nuf2;

    x4poly =
        5.0 +
        3.0 * tf2 +
        6.0 * nuf2 -
        6.0 * tf2 * nuf2 -
        3.0 * (nuf2 * nuf2) -
        9.0 * tf2 * (nuf2 * nuf2);

    x5poly = 5.0 + 28.0 * tf2 + 24.0 * tf4 + 6.0 * nuf2 + 8.0 * tf2 * nuf2;

    x6poly =
        -61.0 - 90.0 * tf2 - 45.0 * tf4 - 107.0 * nuf2 + 162.0 * tf2 * nuf2;

    x7poly = -61.0 - 662.0 * tf2 - 1320.0 * tf4 - 720.0 * (tf4 * tf2);

    x8poly = 1385.0 + 3633.0 * tf2 + 4095.0 * tf4 + 1575 * (tf4 * tf2);

    /* Calculate latitude */
    philambda[0] =
        phif +
        x2frac * x2poly * (x * x) +
        x4frac * x4poly * Math.pow(x, 4.0) +
        x6frac * x6poly * Math.pow(x, 6.0) +
        x8frac * x8poly * Math.pow(x, 8.0);

    /* Calculate longitude */
    philambda[1] =
        lambda0 +
        x1frac * x +
        x3frac * x3poly * Math.pow(x, 3.0) +
        x5frac * x5poly * Math.pow(x, 5.0) +
        x7frac * x7poly * Math.pow(x, 7.0);

    return;
}

/*
 * LatLonToUTMXY
 *
 * Converts a latitude/longitude pair to x and y coordinates in the
 * Universal Transverse Mercator projection.
 *
 * Inputs:
 *   lat - Latitude of the point, in radians.
 *   lon - Longitude of the point, in radians.
 *   zone - UTM zone to be used for calculating values for x and y.
 *          If zone is less than 1 or greater than 60, the routine
 *          will determine the appropriate zone from the value of lon.
 *
 * Outputs:
 *   xy - A 2-element array where the UTM x and y values will be stored.
 *
 * Returns:
 *   The UTM zone used for calculating the values of x and y.
 *
 */
function LatLonToUTMXY(lat, lon, zone, xy) {
    MapLatLonToXY(lat, lon, UTMCentralMeridian(zone), xy);

    /* Adjust easting and northing for UTM system. */
    xy[0] = xy[0] * UTMScaleFactor + 500000.0;
    xy[1] = xy[1] * UTMScaleFactor;
    if (xy[1] < 0.0) xy[1] = xy[1] + 10000000.0;

    return zone;
}

/*
 * UTMXYToLatLon
 *
 * Converts x and y coordinates in the Universal Transverse Mercator
 * projection to a latitude/longitude pair.
 *
 * Inputs:
 *	x - The easting of the point, in meters.
 *	y - The northing of the point, in meters.
 *	zone - The UTM zone in which the point lies.
 *	southhemi - True if the point is in the southern hemisphere;
 *               false otherwise.
 *
 * Outputs:
 *	latlon - A 2-element array containing the latitude and
 *            longitude of the point, in radians.
 *
 * Returns:
 *	The function does not return a value.
 *
 */
function UTMXYToLatLon(x, y, zone, southhemi, latlon) {
    var cmeridian;

    x -= 500000.0;
    x /= UTMScaleFactor;

    /* If in southern hemisphere, adjust y accordingly. */
    if (southhemi) y -= 10000000.0;

    y /= UTMScaleFactor;

    cmeridian = UTMCentralMeridian(zone);
    MapXYToLatLon(x, y, cmeridian, latlon);

    return;
}

function getQueryString(link, name) {
    var pos = link.indexOf(name + "=") + name.length + 1;
    var len = link.substr(pos).indexOf("&");
    if (-1 == len) len = link.substr(pos).length;
    return link.substr(pos, len);
}

// ========================================================================= //

function googleMap() {
    var href = $(".WazeControlPermalink a").attr("href");

    var lon = getQueryString(href, "lon");
    var lat = getQueryString(href, "lat");
    var zoom = parseInt(getQueryString(href, "zoom"));

    var mapsUrl =
        "https://maps.google.com/?ll=" + lat + "," + lon + "&z=" + zoom;
    window.open(mapsUrl, "_blank");
}

function bingMap() {
    var href = $(".WazeControlPermalink a").attr("href");

    var lon = getQueryString(href, "lon");
    var lat = getQueryString(href, "lat");
    var zoom = parseInt(getQueryString(href, "zoom"));

    var mapsUrl =
        " http://www.bing.com/maps/default.aspx?v=2&cp=" +
        lat +
        "~" +
        lon +
        "&lvl=" +
        zoom +
        "&sty=h";
    window.open(mapsUrl, "_blank");
}

function osmMap() {
    var href = $(".WazeControlPermalink a").attr("href");

    var lon = getQueryString(href, "lon");
    var lat = getQueryString(href, "lat");
    var zoom = parseInt(getQueryString(href, "zoom"));

    var mapsUrl =
        "http://www.openstreetmap.org/?lat=" +
        lat +
        "&lon=" +
        lon +
        "&zoom=" +
        zoom +
        "&layers=M";
    window.open(mapsUrl, "_blank");
}


function mapillaryMap(urlBase) {

    var href = $(".WazeControlPermalink a").attr("href");
    var lon = getQueryString(href, "lon");
    var lat = getQueryString(href, "lat");
    var zoom = parseInt(getQueryString(href, "zoom"));

    zoom = zoom - 1;

    var mapsUrl =
        "http://www.mapillary.com/app/?lat=" + lat + "&lng=" + lon + "&z=" + zoom;
    window.open(mapsUrl, "_blank");
 }

function Kartaview(urlBase) {

    var href = $(".WazeControlPermalink a").attr("href");
    var lon = getQueryString(href, "lon");
    var lat = getQueryString(href, "lat");
    var zoom = parseInt(getQueryString(href, "zoom"));

    zoom = zoom - 1;

    var mapsUrl =
        "http://kartaview.org/map/@" + lat + "," + lon + "," + zoom + "z";
    window.open(mapsUrl, "_blank");
 }

function roadregister(urlBase) {

    var href = $(".WazeControlPermalink a").attr("href");
    var lon = getQueryString(href, "lon");
    var lat = getQueryString(href, "lat");
    var zoom = parseInt(getQueryString(href, "zoom"));

    zoom = zoom +1;

    var mapsUrl =
        "http://maps.krb.go.ke/kenya-roads-board12769/maps/144382/8-proposed-road-register-2024#zoom=" + zoom + "&lat=" + lat + "&lng=" + lon + "&layergroups=krb%3A06bd8048-06e0-11ef-b655-0affd391111f%2Ckrb%3Aa35fc458-06c0-11ef-9368-0affd391111f&bck=ffffff&permalink=true";
    window.open(mapsUrl, "_blank");
 }

function Here(urlBase) {
    var href = $(".WazeControlPermalink a").attr("href");
    var lon = getQueryString(href, "lon");
    var lat = getQueryString(href, "lat");
    var zoom = parseInt(getQueryString(href, "zoom"));

    var mapsUrl =
        "https://wego.here.com/?map=" + lat + "," + lon + "," + zoom + ",satellite";
    window.open(mapsUrl, "_blank");
}

function MapTomTom() {
    var href = $(".WazeControlPermalink a").attr("href");
    var lon = getQueryString(href, "lon");
    var lat = getQueryString(href, "lat");
    var zoom = parseInt(getQueryString(href, "zoom"));

    //https://mydrive.tomtom.com/no_no/#mode=viewport+viewport=59.93091,10.88519,12
    //https://plan.tomtom.com/en?p=60.07678,9.87494,7.89z#mode=viewport+viewport=59.95401,10.90569,17
    zoom = zoom -1;
    var mapsUrl =
        "https://plan.tomtom.com/hu?p=" + lat + "," + lon + "," + zoom + "z";
    window.open(mapsUrl, "_blank");
}

var mapFunctions = {
    Google: googleMap,
    Bing: bingMap,
    OSM: osmMap,
    TomTom: function () {
        MapTomTom();
    },
    Mapillary: function () {
        mapillaryMap(
            "https://www.mapillary.com/app/?lat=%lokasjon%");
    },
    Kartaview: function () {
        Kartaview(
            "https://kartaview.org/map/@%lokasjon%");
    },
    Here: function () {
        Here("https://wego.here.com/?map=%lokasjon%");
    },
    roadregister: function () {
        roadregister("http://maps.krb.go.ke/kenya-roads-board12769/maps/144382/8-proposed-road-register-2024#zoom=%lokasjon%");
    },
};

var mapFeatures = {
    Google: {
        Name: "Google Maps",
        ShortName: "Google",
        Enabled: true,
    },
    Bing: {
        Name: "Bing Maps",
        ShortName: "Bing",
        Enabled: false,
    },
    OSM: {
        Name: "OpenStreetMap",
        ShortName: "OSM",
        Enabled: true,
    },
    Here: {
        Name: "Here",
        ShortName: "Here",
        Enabled: true,
    },
   TomTom: {
        Name: "TomTom",
        ShortName: "TomTom",
        Enabled: true,
    },
    Mapillary: {
        Name: "Mapillary - streetview",
        ShortName: "Mapillary",
        Enabled: true,
    },
    Kartaview: {
        Name: "Kartaview - streetview",
        ShortName: "Kartaview",
        Enabled: true,
    },
    roadregister: {
        Name: "8. Proposed Road Register 2024",
        ShortName: "roadregister",
        Enabled: true,
    },
};

// Restore saved settings
/*var savedSettings = localStorage.getObject('waze-kenya-mr_settings');
if (savedSettings !== null) {
  for (var map in savedSettings.maps) {
    if (mapFeatures[map] !== null) {
      mapFeatures[map].Enabled = savedSettings.maps[map].Enabled;
    }
  }
}*/


$("head").append(`
  <style>
    .waze-kenya-mr-link-list {
      display: grid;
      gap: 6px;
    }
  <style>`);

// Save settings
/*window.addEventListener("beforeunload", function() {
  var savedSettings = {};
  savedSettings.maps = {};
  for (var map in mapFeatures) {
    var mapObject = mapFeatures[map];
    savedSettings.maps[map] = {};
    savedSettings.maps[map].Enabled = mapObject.Enabled;
  }
  localStorage.setObject('waze-kenya-mr_settings', savedSettings);
}, true);
*/

function htmlToElement(html) {
    var template = document.createElement("template");
    html = html.trim();
    template.innerHTML = html;
    return template.content.firstChild;
}

async function initializeMyUserscript() {
    const { tabLabel, tabPane } =
        W.userscripts.registerSidebarTab("WME-Kenya-MR");

    tabLabel.innerText = "WME-Kenya-MR";
    tabLabel.title = "WME Permalink to Serveral Maps — Kenya MR Edition";

    tabPane.classList.add("waze-kenya-mr-link-list");

    for (const map in mapFeatures) {
        const mapObject = mapFeatures[map];
        if (!mapObject.Enabled) continue;

        const item = htmlToElement(`
            <wz-card selected="false" elevation-on-hover="4" class="list-item-card drive-list-item">
                <div class="list-item-card-layout">
                    <div class="list-item-card-icon list-item-card-icon-blue"><i class="w-icon w-icon-map"></i></div>
                    <div class="list-item-card-info"><div class="list-item-card-title">${mapObject.Name}</div><div><wz-caption></wz-caption></div></div>
                </div>
            </wz-card>`);
        item.addEventListener("click", mapFunctions[map]);
        tabPane.appendChild(item);
    }
}

if (W?.userscripts?.state.isReady ?? false) {
    initializeMyUserscript();
} else {
    document.addEventListener("wme-ready", initializeMyUserscript, {
        once: true,
    });
}
