function randomRange(min, max) {
    return Math.floor(Math.random() * (max-min)) + min;
}

function css(el, props) {
    for (var p in props) {
        el.style[p] = props[p];
    }
}

function create(id) {
    return document.createElement("div");
}

function remove(el) {
    el.parentNode.removeChild(el);
}

function $(id) {
    return document.getElementById(id);
}