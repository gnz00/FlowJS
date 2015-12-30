```js
$ npm run compile && DEBUG=flowjs:* ./node_modules/babel-cli/bin/babel-node.js dist/examples/TestFlow.js

  flowjs:flow Created new Flow with options: {"context":{"_states":{}},"decider":{}} +0ms
  flowjs:flow Stepping flow - Symbol(START) +3ms
  flowjs:flow Starting next activity - ActivityA +1ms
Executing ActivityA
  flowjs:flow Activity completed - ActivityA +0ms
  flowjs:flow Stepping flow - Symbol(B) +1ms
  flowjs:flow Starting next activity - ActivityB +0ms
Executing ActivityB
  flowjs:flow Activity completed - ActivityB +0ms
  flowjs:flow Stepping flow - Symbol(END) +0ms
Flow succeeded.
Flow has finished executing.
  flowjs:flow Flow complete +0ms
```