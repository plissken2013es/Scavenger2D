function randomRange(min, max) {
    return Math.floor(Math.random() * (max-min)) + min;
}

function rd(value) {
    return Math.round(value);
}

function css(el, props) {
    for (var p in props) {
        el.style[p] = props[p];
    }
}

function create(type, id) {
    var el = document.createElement(type);
    if (id) el.setAttribute("id", id);
    return el;
}

function remove(el) {
    el.parentNode.removeChild(el);
}

function $(id) {
    return document.getElementById(id);
}