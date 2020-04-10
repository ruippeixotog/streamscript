cenas(x, y) => res {
  res <- x * y + 2
}

cenasAlt(x, y) => { x * y + 2 }

fib(n) => res {
  res <- if(n <= 1, 1, fib(n - 1) + fib(n - 2))
}

fib2(n) => res {
  a1 <- 1
  a2 <- 1
  zip(a1, a2) -> map(fibStepAux(_)) -> unzip(_) -> (a1, a2)
  res <- nth(n, a1)
}

fibStepAux(p) => res {
  res <- [p[0] + p[1], p[0]]
}
