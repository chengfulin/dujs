var x = 0;
function F() {}
F.prototype.m = function () {
  x = 1;
};
const o = new F();
function g() {
  o.m();
}
g();
console.log(x);
