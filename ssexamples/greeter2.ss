import io

cnt <- kick(nats(), merge(1, buf(name, 1)))

io.stdout <- kick(@"Hello, human #" + buf(cnt, 1) + @"! What's your name?", cnt)
io.stdin -> name
io.stdout <- kick(@"Nice to meet you, " + name + @"!\n", cnt)
