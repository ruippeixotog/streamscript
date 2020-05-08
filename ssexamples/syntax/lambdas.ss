[1, 2, 3] -> map((elem) => res { res <- elem * elem }, _)

[1, 2, 3] -> map((elem) => { elem * elem }, _)

fold(0, (acc, x) => newAcc { newAcc <- acc + x }, [3, 5, 6, 123])

matrix -> map(_,
  (row) => newRow {
    newRow <- map(_, (elem) => newElem {
      newElem <- !elem
    })
  })

matrix ->
  map(_, (row) => {
    map(_, (elem) => {
      !elem
    })
  })

fib2(n) => res {
  a1 <- 1
  a2 <- 1
  zip(a1, a2) -> map((p) => { [p[0] + p[1], p[0]] }) -> unzip(_) -> (a1, a2)
  res <- nth(n, a1)
}

zip(a1, a2) => p {
  [a1, a2]
}

unzip(p) => (a1, a2) {
  p[0] -> a1
  p[1] -> a2
}

blackhole(a) => () {}
