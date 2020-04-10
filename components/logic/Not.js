const noflo = require("noflo");
const UnOp = require("./UnOp");

exports.getComponent = () => UnOp.getComponent(e => !e);

// exports.getComponent = () => {
//   const c = new noflo.Component();
//   //   c.description = `This component generates a single packet and sends it to
//   // the output port. Mostly usable for debugging, but can also be useful
//   // for starting up networks.`;
//   //   c.icon = "share";
//
//   c.inPorts.add("in", {
//     datatype: "bool",
//     required: true,
//   });
//   c.outPorts.add("out", {
//     datatype: "bool",
//   });
//
//   return c.process((input, output) => {
//     if (!input.hasData("in")) return;
//     const inValue = input.getData("in");
//     output.sendDone({ out: !inValue });
//   });
// };
