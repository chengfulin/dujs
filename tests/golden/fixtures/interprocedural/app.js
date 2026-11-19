var total = 0;
var limit = 3;
function addTo(value) {
  function scale() {
    return value * 2;
  }
  total = total + value;
  scale();
  return total;
}
function isReady() {
  return total > limit;
}
addTo(1);
if (isReady()) {
  total = 0;
}
function onClick() {
  function log() {
    console.log(total);
  }
  log();
}
function onLoad() {
  limit = 5;
}
window.addEventListener('click', onClick);
window.addEventListener('load', onLoad);
localStorage.total = total;
