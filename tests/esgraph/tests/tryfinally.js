// should handle basic finally
/*
n0 [label="entry", shape="ellipse", style="filled", fillcolor="yellow"]
n1 [label="intry"]
n2 [label="infinally"]
n3 [label="exit", shape="ellipse", style="filled", fillcolor="yellow"]
n0 -> n1 []
n1 -> n2 []
n2 -> n3 []
*/
try {
	intry;
} finally {
	infinally;
}
