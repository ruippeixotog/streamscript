delay(x, delay) => out {
  out <- extern("core/RepeatDelayed") <- (x, delay)
}

timer(dueTime, period) => out {
  startBang <- extern("core/RepeatDelayed") <- (true, dueTime)
  out <- extern("core/RunInterval") <- (period, startBang, void)
}

kick(signal, data) => out {
  out <- extern("core/Kick") <- (signal, data)
}

sendNext(signal, data) => out {
  (out, void) <- extern("core/SendNext") <- (data, signal)
}
