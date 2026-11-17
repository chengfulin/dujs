var x = 0;
var y = (function () {
  x = 1;
  return 2;
})();
console.log(x);
