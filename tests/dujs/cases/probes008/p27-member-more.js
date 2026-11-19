var x = 0, o = {};
function g() {
  x = 1;
  return 'p';
}
o.p ||= 1;
o[g()] = 2;
console.log(o, x);
