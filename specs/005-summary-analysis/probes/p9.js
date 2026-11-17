var x = 0;
function g() {
x = 1;
}
function f() {
switch (x) {
case 1:
g();
}
x;
}
f();
