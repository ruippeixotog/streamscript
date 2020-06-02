import io

// simulate regular changes of A and B

aTick <- interval(1000)
bTick <- interval(2500)
a <- kick(_, aTick) <- fromArray([1, 42, 35, 4, 100])
b <- kick(_, bTick) <- fromArray([4, 3.2, -4, 4.5, 0])

// every time one of the configs change, print current state to console

format(in) => out {
  out <- @"Config change: a = " + in[@0] + @", b = " + in[@1]
}

io.stdout <- format(_) <- combineLatest(a, b)
