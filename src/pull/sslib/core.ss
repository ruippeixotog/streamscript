rep(in) => out {
  out <- extern("core/Repeat") <- in
}

kick(in, sig) => out {
  out <- extern("core/Kick") <- (in, sig)
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

unzip(in) => (outL, outR) {
  (outL, outR) <- (in[rep(0)], in[rep(1)])
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

combineLatest(in1, in2) => out {
  out <- extern("core/CombineLatest") <- (in1, in2)
}
