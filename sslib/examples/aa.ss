import io
import test

io.stdout <- "Hello world!"

x <- 0.5 + 1.5
io.stdout <- x

io.stdout <- [1, 2, x]

io.stdout <- [
  true && true,
  true && false,
  false && true,
  false && false
]

io.stdout <- {
  "t&t": true && true,
  "t&f": true && false,
  "f&t": false && true,
  "f&f": false && false
}

sum(a, b) => out {
  out <- a + b
}

io.stdout <- sum(100, 10)
io.stdout <- test.testSum(15, 20)
io.stdout <- test.answerToEverything
