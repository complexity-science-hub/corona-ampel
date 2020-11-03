var cookies = ["_gat_gtag_UA_152532440_1","_ga","_gid","disclaimer", "allowCookies", "cookieBanner", "lang", "colorblind"];
var USECOOKIES = false;

function showCookieBanner() {
    // Check if it was already accepted
    if(getCookie("allowCookies") === "") {
        var cookieBanner = document.getElementById("cookie-modal");
        cookieBanner.style.display = "block";
    } else {
        var cookieBanner = document.getElementById("cookie-modal");
        cookieBanner.style.display = "none";
        USECOOKIES = true;
        initGoogleAnalytics();
        //todo set attributes from cookies
        let cookieColor = getCookie("colorblind");
        if (cookieColor === "" || cookieColor === "false") {
            COLORBLIND = false;
        } else COLORBLIND = true;
    }
}

function initGoogleAnalytics() {
}

function saveCookieAccept() {
    var cookieBanner = document.getElementById("cookie-modal");
    cookieBanner.style.display = "none";
    USECOOKIES = true;
    console.log("cookies accepted.");
    initGoogleAnalytics();
    setCookie("allowCookies", true, 365);
    //todo: set other cookies
    setCookie("colorblind", COLORBLIND, 365);
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function saveCookieDecline() {
    var cookieBanner = document.getElementById("cookie-modal");
    cookieBanner.style.display = "none";

    console.log("cookies declined.");
    window['ga-disable-UA-152532440-1'] = true;

    USECOOKIES = false;
    for(let i=0; i<cookies.length; i++)
    {
        setCookieExpired(cookies[i]);
    }
}

function setCookieExpired(name) {
    document.cookie = name +"=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}