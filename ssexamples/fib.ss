import io

fib() => out {
  out <- a1 <- 1
  a2 <- 1
  p <- zip(buf(a1, 1), buf(a2, 1))
  (a1, a2) <- (p[rep(1)], p[rep(0)] + p[rep(1)])
}

fibN(n) => out {
  fib() -> nth(_, n) -> out
}

io.stdout <- fibN(0)
io.stdout <- fibN(1)
io.stdout <- fibN(2)
io.stdout <- fibN(3)
io.stdout <- fibN(4)
io.stdout <- fibN(10)
io.stdout <- fibN(100)
io.stdout <- fibN(1000)
