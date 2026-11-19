var x = 0;
function f() {
  x = 1;
}
f.p = function () {
  x = 2;
};
f();
console.log(x);
