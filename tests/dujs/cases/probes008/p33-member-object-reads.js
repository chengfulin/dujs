var o = [{}], i = 0, a = 1;
function f(v) {
  return o[v];
}
f(a).p = 1;
o[i].q = 2;
console.log(o);
