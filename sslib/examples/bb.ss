import core
import io

io.stdout <- "Start!"

// counter <- core.timer(1000, 1000)
// io.stdout <- core.if(counter % 10 == 0, counter, "Nope!")

x <- 10
y <- core.fromArray([1, 2, 3, 4, 5])
(x2, y2) <- core.combineLatest(x, y)
io.stdout <- x2 * y2

// io.stdout <- core.fromArray(x) * core.fromArray(y)
