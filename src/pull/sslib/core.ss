rep(in) => out {
  out <- extern("core/Repeat") <- in
}

kick(signal, data) => out {
  out <- extern("core/Kick") <- (signal, data)
}

interval(period) => out {
  out <- extern("core/Interval") <- period
}

if(cond, then, else) => out {
  out <- extern("core/If") <- (cond, then, else)
}

buf(in, n) => out {
  out <- extern("core/Buffer") <- (in, n)
}

zip(in1, in2) => out {
  out <- extern("core/Zip") <- (in1, in2)
}

nth(in, n) => out {
  out <- extern("core/Nth") <- (in, n)
}

toArray(in) => out {
  out <- extern("core/ToArray") <- in
}

fromArray(in) => out {
  out <- extern("core/FromArray") <- in
}

/*
delay(x, delay) => out {
  out <- extern("core/Delay") <- (x, delay)
}

combineLatest(in1, in2) => (out1, out2) {
  (out1, out2) <- extern("core/CombineLatest") <- (in1, in2)
}
*/
