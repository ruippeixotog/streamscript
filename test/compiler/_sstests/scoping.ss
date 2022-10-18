// FIXME: move to runtime
// terminating due to staleness

import io

a1 <- 1
a2 <- 10
a3 <- 100

sum(a1) => out {
  out <- a1 + a2 + a3
}

io.stdout <- sum(1000)

tee(a1) => stdout {
  io.stdout <- a1
  stdout <- a1
}

io.stdout <- tee(10000)
