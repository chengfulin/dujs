/// --- start part1.js ---
var a = 1, b;
function foo(x) {
     var c = x;
     b = c;
}
foo(a - 1);
function fun() {
    foo(1);
    ++a;
}
fun();
/// --- end part1.js ---
/// --- start part2.js ---
while(a > b) {
    a--;
}

/// --- end part2.js ---
/// --- start part3.js ---
var s = 1;
switch(s) {
    case 1: ++s;
            break;
	case 2: --s;
			break;
    default: s = 0;
}
/// --- end part3.js ---
/// --- start part4.js ---
function clickHandler() {
	alert('now: a=' + a + '\nb=' + b + '\ns=' + s);
	a += 1;
	b += 2;
	s += 3;
}

document.addEventListener('click', clickHandler);
/// --- end part4.js ---
