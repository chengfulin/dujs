// should handle do-while loops
/*
n0 [label="entry", shape="ellipse", style="filled", fillcolor="yellow"]
n1 [label="empty"]
n2 [label="false"]
n3 [label="exit", shape="ellipse", style="filled", fillcolor="yellow"]
n0 -> n1 []
n1 -> n2 []
n2 -> n1 [label="true"]
n2 -> n3 [label="false"]
*/
do {
	empty;
} while (false);
