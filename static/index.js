var htmlTemp = document.getElementById('temp');
var ONtemp = null;
var htmlONtemp = document.getElementById('ONtemp');
var OFFtemp = null;
var htmlOFFtemp = document.getElementById('OFFtemp');
var htmlONtime = document.getElementById('ONtime');
var htmlOFFtime = document.getElementById('OFFtime');
var timeoutUpdate;

Date.prototype.stdTimezoneOffset = function () {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

Date.prototype.isDstObserved = function () {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
}

var today = new Date();
var summertime = today.isDstObserved();

function update() {
    req('/update', function (response) {
        // Temp
        if (response["status"] != "1") response["temp"] = "OFF";
        if (response["status"] == "2") response["temp"] = "CLOCK!";
        var temp = parseFloat(response["temp"]);
        var color = "green";
        if (temp > 22) color = "red";
        if (temp < 18) color = "blue";
        if (isNaN(temp)) {
            color = "red";
        } else {
            response["temp"] += " ºC"
        }
        htmlTemp.innerHTML = response["temp"];
        htmlTemp.style.color = color;

        // ONtemp
        if (isNaN(parseFloat(response["ONtemp"]))) {
            response["ONtemp"] = "--";
        } else {
            ONtemp = parseFloat(response["ONtemp"]);
        }
        if (response["ONtemp"] == parseFloat(response["target"])) {
            htmlONtemp.style = "opacity: 1;"
        } else {
            htmlONtemp.style = "opacity: 0.5;"
        }
        htmlONtemp.innerHTML = "☀ " + response["ONtemp"] + " ºC";

        // OFFtemp
        if (isNaN(parseFloat(response["OFFtemp"]))) {
            response["OFFtemp"] = "--";
        } else {
            OFFtemp = parseFloat(response["OFFtemp"]);
        }
        if (response["OFFtemp"] == parseFloat(response["target"])) {
            htmlOFFtemp.style = "opacity: 1;"
        } else {
            htmlOFFtemp.style = "opacity: 0.5;"
        }
        htmlOFFtemp.innerHTML = "🌙 " + response["OFFtemp"] + " ºC";

        // ONtime
        htmlONtime.value = convertTime(response["ONtime"]);

        // OFFtime
        htmlOFFtime.value = convertTime(response["OFFtime"]);

        clearTimeout(timeoutUpdate);
        timeoutUpdate = setTimeout(update, 10000);
        hide("countdown");
    });
}

function convertTime(i) {
    if (isNaN(parseInt(i))) return "";
    i = parseInt(i);
    var hour = parseInt(i / 60);
    var minutes = i - hour * 60;
    if (summertime) {
        hour += 1
        if (hour > 23) hour = 0;
    }
    if (hour < 10) hour = "0" + hour;
    if (minutes < 10) minutes = "0" + minutes;
    return hour + ":" + minutes;
}

function unconvertTime(i) {
    i = i.split(':');
    i = parseInt(i[0]) * 60 + parseInt(i[1]);
    if (summertime) {
        i -= 60;
        if (i < 0) i += 24 * 60
    }
    return i;
}

var timeoutONtemp;
function changeONtemp(i) {
    countdown();
    clearTimeout(timeoutUpdate);
    clearTimeout(timeoutONtemp);

    if (i == '+') {
        ONtemp += 0.5;
    }
    if (i == '-') {
        ONtemp -= 0.5;
    }
    ONtemp = parseTemp(ONtemp);

    if (ONtemp < 15) ONtemp = 15;
    if (ONtemp > 25) ONtemp = 25;

    htmlONtemp.innerHTML = "☀ " + ONtemp + " ºC";

    url = "/set?key=1&value=" + ONtemp;

    timeoutONtemp = setTimeout(function () {
        req(url, function (response) {
            if (response["done"]) {
                timeoutUpdate = setTimeout(update, 1000);
            } else {
                alert(response);
            }
        });
    }, 3000);
}

var timeoutOFFtemp;
function changeOFFtemp(i) {
    countdown();
    clearTimeout(timeoutUpdate);
    clearTimeout(timeoutOFFtemp);

    if (i == '+') {
        OFFtemp += 0.5;
    }
    if (i == '-') {
        OFFtemp -= 0.5;
    }
    OFFtemp = parseTemp(OFFtemp);

    if (OFFtemp < 15) OFFtemp = 15;
    if (OFFtemp > 25) OFFtemp = 25;

    htmlOFFtemp.innerHTML = "🌙 " + OFFtemp + " ºC";

    url = "/set?key=2&value=" + OFFtemp;

    timeoutOFFtemp = setTimeout(function () {
        req(url, function (response) {
            if (response["done"]) {
                timeoutUpdate = setTimeout(update, 1000);
            } else {
                alert(response);
            }
        });
    }, 3000);
}

var timeoutONtime;
function changeONtime(i) {
    countdown();
    clearTimeout(timeoutUpdate);
    clearTimeout(timeoutONtime);

    var value = htmlONtime.value;

    if (value != "") {
        value = unconvertTime(value);
    }

    url = "/set?key=4&value=" + value;

    timeoutONtime = setTimeout(function () {
        req(url, function (response) {
            if (response["done"]) {
                timeoutUpdate = setTimeout(update, 1000);
            } else {
                alert(response);
            }
        });
    }, 3000);
}

var timeoutOFFtime;
function changeOFFtime(i) {
    countdown();
    clearTimeout(timeoutUpdate);
    clearTimeout(timeoutOFFtime);

    var value = htmlOFFtime.value;

    if (value != "") {
        value = unconvertTime(value);
    }

    url = "/set?key=5&value=" + value;

    timeoutOFFtime = setTimeout(function () {
        req(url, function (response) {
            if (response["done"]) {
                timeoutUpdate = setTimeout(update, 1000);
            } else {
                alert(response);
            }
        });
    }, 3000);
}

function req(url, callback, data) {
    let req = new XMLHttpRequest();
    if (data != undefined) url += '?data=' + data;
    req.open('GET', url, true);
    req.responseType = 'json';
    req.setRequestHeader('secret', getCookie('secret'));
    req.onreadystatechange = function () {
        if (req.readyState == 4) {
            if (req.status === 200) {
                callback(req.response);
            } else if (req.status === 401) {
                var secret = prompt('Para continuar instroduzca su clave:');
                setCookie('secret', secret, 365 * 24 * 60);
                alert("¡Clave guardada!");
                update();
            } else {
                if (url == '/update') {
                    clearTimeout(timeoutUpdate);
                    timeoutUpdate = setTimeout(update, 10000);
                }
            }
        }
    }.bind(this);
    req.send();
}

function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length === 2)
        return parts
            .pop()
            .split(";")
            .shift();
}

function setCookie(name, data, minutes) {
    if (minutes === 0) {
        document.cookie = name + "=" + data + ";";
    } else {
        var d = new Date();
        d.setTime(d.getTime() + minutes * 60 * 1000);
        /////// Include ¡¡¡¡¡ secure; !!!!!! //////////
        document.cookie =
            name + "=" + data + "; expires=" + d.toUTCString() + ";path=/";
    }
}

function show(id) {
    try {
        var object = document.getElementById(id);
        object.style.display = "inline";
        object.style.visibility = "visible";
    } catch (err) {
        console.log("Can't find object by id: {}".format(id));
    }
}

function hide(id) {
    try {
        var object = document.getElementById(id);
        object.style.display = "none";
    } catch (err) {
        console.log("Can't find object by id: {}".format(id));
    }
}

var timeoutCountdown;
function countdown() {
    clearInterval(timeoutCountdown);
    hide("countdown");
    timeoutCountdown = setTimeout(function () {
        show("countdown");
    }, 150);
}

function parseTemp(i) {
    u = parseInt(i * 100) % 100;
    i = parseInt(i);
    if (u >= 25 && u < 75) {
        i += 0.5;
    } else if (u >= 75) {
        i += 1;
    }
    return i;

}

update();