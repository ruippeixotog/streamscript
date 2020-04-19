kick(signal, data) => out {
  out <- extern("core/Kick") <- (signal, data)
}

// rxjs-like components

delay(x, delay) => out {
  out <- extern("core/Delay") <- (x, delay)
}

toArray(in) => out {
  out <- extern("core/ToArray") <- in
}

// Observable.of
fromArray(in) => out {
  out <- extern("core/FromArray") <- in
}

interval(period) => out {
  out <- extern("core/Interval") <- period
}

// Observable.iif
if(cond, then, else) => out {
  out <- extern("core/If") <- (cond, then, else)
}

combineLatest(in1, in2) => (out1, out2) {
  (out1, out2) <- extern("core/CombineLatest") <- (in1, in2)
}
