var x = 0;
let f;
f = function () {
  x = 1;
};
function g() {
  f();
}
g();
console.log(x);
