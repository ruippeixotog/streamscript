import io

src <- fromArray([1, 10, 100, 1000])
src -> take(_, 3) -> io.stdout
src -> io.stdout
