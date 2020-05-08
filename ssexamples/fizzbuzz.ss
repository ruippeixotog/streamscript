import core
import io

io.stdout <- "Start!"

counter <- core.interval(1000)

io.stdout <- core.if(
  counter % core.rep(3) == core.rep(0),
  core.if(
    core.rep(counter) % core.rep(5) == core.rep(0),
    core.rep("FizzBuzz"),
    core.rep("Fizz")
  ),
  core.if(
    core.rep(counter) % core.rep(5) == core.rep(0),
    core.rep("Buzz"),
    core.rep(counter)
  )
)
