/*
Emits the last value received repeatedly when there is demand and once the first element is received.
Completes when downstream cancels.
*/
rep(in) => out {
  out <- extern("core/Repeat") <- in
}

/*
Emits every time there is demand.
Completes when downstream cancels.
*/
nats() => out {
  out <- extern("core/Nats")
}

kick(in, sig) => out {
  out <- extern("core/Kick") <- (in, sig)
}

/*
Emits periodically once the first period is received. If there is downstream backpressure ticks are skipped (FIXME).
Completes when downstream cancels.
*/
interval(period) => out {
  out <- extern("core/Interval") <- period
}

if(cond, then, else) => out {
  out <- extern("core/If") <- (cond, then, else)
}

/*
Emits when downstream stops backpressuring and there is a pending element in the buffer.
Backpressures when buffer is full.
Completes when downstream cancels or upstream completes and buffered elements have been drained.
*/
buf(in, n) => out {
  out <- extern("core/Buffer") <- (in, n)
}

/*
Emits when both of the inputs have an element available.
Backpressures both upstreams when downstream backpressures.
Completes when either upstream completes or downstream cancels.
*/
zip(in1, in2) => out {
  out <- extern("core/Zip") <- (in1, in2)
}

/*
Emits when all outputs stop backpressuring and there is an input element available.
Backpressures when any of the outputs backpressures.
Completes when upstream completes or both downstreams cancel.
*/
unzip(in) => (outL, outR) {
  (outL, outR) <- (in[rep(0)], in[rep(1)])
}

/*
Emits a single element once the specified number of elements has been received.
Backpressures when downstream backpressures.
Completes when the defined element has been emitted, if upstream completes or if downstream cancels.
*/
nth(in, n) => out {
  out <- extern("core/Nth") <- (in, n)
}

/*
Emits when upstream completes.
Backpressures when downstream backpressures.
Completes when upstream completes or downstream cancels.
*/
toArray(in) => out {
  out <- extern("core/ToArray") <- in
}

/*
Emits when downstream stops backpressuring and there is a pending element in the buffer.
Backpressures when downstream backpressures.
Completes when upstream completes and all elements have been emitted or when downstream cancels.
*/
fromArray(in) => out {
  out <- extern("core/FromArray") <- in
}

combineLatest(in1, in2) => out {
  out <- extern("core/CombineLatest") <- (in1, in2)
}
