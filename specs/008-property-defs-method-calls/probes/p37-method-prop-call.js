var x = 0, o = {}, q = {m: function () {}};
o.m = function () {
  x = 1;
};
o.m();
q.n = 1;
q.m();
console.log(x);
