# StreamScript

A stream-based programming language. This is an experiment to see how far we can take streams as the basic unit of computation on a language.


## Computation Model

StreamScript's runtime model is heavily inspired in concepts from [Flow-Based Programming](https://en.wikipedia.org/wiki/Flow-based_programming) and [Reactive Streams](https://www.reactive-streams.org).

StreamScript programs get compiled to a computation graph. Nodes in this computation graphs are _components_ - black boxes with a fixed number of _input ports_ and _output ports_ - while edges are connections from out ports to in ports. Initial values can be connected to in ports to inject constant data into the graph. When executed, components are instantiated as asynchronous _processes_ which exchange messages (_packets_) between them until all components _terminate_ (come to a halt).

Contrary to flow-based programming, streams in StreamScript are pull-based: a process cannot emit elements to an out port unless connected in ports request them. Internally, component ports follow [the JavaScript's spec](https://github.com/reactive-streams/reactive-streams-js/) of [Reactive Streams](https://www.reactive-streams.org). This means a few things:

- Communication between ports is actually bidirectional: data and completion/error signals flow downstream, while demand signals flow upstream;
- A back pressure mechanism is in place to prevent fast producers overloading slow consumers;
- Processes are typically lazy: they don't pull from in ports and perform work until demand is signalled from consumers connected to out ports.


## Language

For example programs, take a look at [ssexamples](https://github.com/ruippeixotog/streamscript/tree/master/ssexamples). If you're feeling brave you can also read the [PEG grammar](https://github.com/ruippeixotog/streamscript/blob/master/src/grammar.ohm).

### Element Types

Elements emitted and received by components are of any JavaScript primitive value (anything representable as JSON).

### Constants

Constants compile to components that emit the value a single time and then complete.

### Symbols

Symbols (akin to variables in other languages) compile to single-input, single-output identity components. They can be used to give nicer names to certain pipes and connect different components.

### Operators

`->` and `<-` are special operators used to connect components:

- `a -> b` (equivalent to `b <- a`) connects the out ports of `a` to the in ports of `b`. The out-arity of `a` is expected to match the in-arity of `b`;
- `(a1, a2) -> b` connects the out ports of `a1` and `a2` to the in ports of `b` (ports in components are ordered, so the left side is treated as the concatenation of out ports of `a1` and `a2`). Pairing can be used on both sides of the expression.

All other operators apply operations element-wise, pairing input elements in case of binary operations. For example:

- `a + b` pairs each element emitted by `a` with an element emitted by `b` and emits an element with value `a + b`;
- `a[idx]` pairs each element emitted by `a` (expected to be an array or object) with an element emitted by `idx` and emits an element with value `a + b`.

Type coercion in StreamScript occurs with the same semantics as JavaScript.

### Functions

Functions define a new type of component that can be instantiated multiple times later.


## Standard Library

You can take a look at [this folder](https://github.com/ruippeixotog/streamscript/tree/master/src/runtime/sslib). Function names are mostly taken from [Akka Streams](https://doc.akka.io/docs/akka/current/stream/index.html), so if you're unsure of what some function does try to find it [here](https://doc.akka.io/docs/akka/current/stream/operators/index.html).

## Copyright

Copyright (c) 2020 Rui Gonçalves. See LICENSE for details.
