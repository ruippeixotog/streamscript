import io

cnt <- kick(nats(), merge(1, buf(name, 1)))

io.stdout <- kick(rep("Hello, human #") + buf(cnt, 1) + rep("! What's your name?"), cnt)
io.stdin -> name
io.stdout <- kick(rep("Nice to meet you, ") + name + rep("!\n"), cnt)
