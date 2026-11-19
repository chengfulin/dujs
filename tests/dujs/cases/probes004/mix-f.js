var x = 0, c = 1;
var f = function () {
  x = 1;
};
if (c) {
  f = function () {
    x = 2;
  };
}
f();
console.log(x);
