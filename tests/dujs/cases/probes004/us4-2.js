var d = 1;
function f({g = function () {
  return d;
}}) {
}
f({});
