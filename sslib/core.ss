kick(signal, data) => out {
  out <- extern("core/Kick") <- (signal, data)
}

sendNext(signal, data) => out {
  (out, void) <- extern("core/SendNext") <- (data, signal)
}

// rxjs-like components

delay(x, delay) => out {
  out <- extern("core/RepeatDelayed") <- (x, delay)
}

toArray(in) => out {
  out <- extern("adapters/PacketsToArray") <- in
}

// Observable.of
fromArray(in) => out {
  (out, void) <- extern("adapters/ObjectToPackets") <- (in, void)
}

timer(dueTime, period) => out {
  startSig <- extern("core/RepeatDelayed") <- (true, dueTime)
  pingSig <- extern("core/RunInterval") <- (period, startSig, void)
  ones <- extern("core/Kick") <- (startSig, 0)
  ones <- extern("core/Kick") <- (pingSig, 1)
  out <- extern("math/Accumulate") <- (ones, void, false)
}

interval(period) => out {
  out <- timer(period, period)
}

// Observable.iif
if(cond, then, else) => out {
  jsFunc <- "if(x) { return true; } else { throw new Error(""); }"
  (ifTrue, void, ifFalse) <- extern("core/MakeFunction") <- (cond, jsFunc)
  out <- extern("flow/Gate") <- (then, ifTrue, ifFalse)
  out <- extern("flow/Gate") <- (else, ifFalse, ifTrue)
}
