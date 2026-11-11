var saved = [];
var count = 0;

function onLoad() {
    saved = JSON.parse(localStorage.getItem('items'));
    count = saved.length;
}

function onClear() {
    localStorage.setItem('items', '[]');
    count = 0;
}

window.addEventListener('load', onLoad);
document.getElementById('clear').addEventListener('click', onClear);
