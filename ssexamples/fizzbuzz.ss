import io

io.stdout <- "Start!"

counter <- kick(nats(), interval(1000))

io.stdout <- if(
  counter % @3 == @0,
  if(@counter % @5 == @0, @"FizzBuzz", @"Fizz"),
  if(@counter % @5 == @0, @"Buzz", @counter)
)
