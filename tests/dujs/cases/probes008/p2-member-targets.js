var o = {}, a = [1], k = 'p';
o.p = 1;
o.p.q = 2;
o[k] = 3;
o.p += 4;
o.p++;
[o.p] = a;
for (o.p of a) {}
({p: o.p} = {p: 5});
delete o.p;
console.log(o);
