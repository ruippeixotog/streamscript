import io

io.stdout <- "Start!"

counter <- kick(nats(), interval(1000))

io.stdout <- if(
  counter % rep(3) == rep(0),
  if(
    rep(counter) % rep(5) == rep(0),
    rep("FizzBuzz"),
    rep("Fizz")
  ),
  if(
    rep(counter) % rep(5) == rep(0),
    rep("Buzz"),
    rep(counter)
  )
)
