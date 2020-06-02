import io

io.stdout <- fromArray([1, 10, 100, 1000]) * @5

x <- 1
x <- 2
x <- 3
x <- 4
io.stdout <- toArray(x)
io.stdout <- fromArray(toArray(x))

y <- fromArray([1, 2, 3, 4, 5])

zip(y * @-10, y * @10) -> yPair -> io.stdout
yPair -> unzip(_) -> (io.stdout, void)
