// should handle returns
/*
n0 [label="entry", shape="ellipse", style="filled", fillcolor="yellow"]
n1 [label="return a;"]
n2 [label="exit", shape="ellipse", style="filled", fillcolor="yellow"]
n0 -> n1 []
n1 -> n2 []
*/
function t() {
	return a;
}
