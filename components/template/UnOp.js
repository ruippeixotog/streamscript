/* @noflow */

const noflo = require("noflo");

exports.getComponent = f => {
  const c = new noflo.Component();
  //   c.description = `This component generates a single packet and sends it to
  // the output port. Mostly usable for debugging, but can also be useful
  // for starting up networks.`;
  //   c.icon = "share";

  c.inPorts.add("in", {
    datatype: "all",
    required: true,
  });
  c.outPorts.add("out", {
    datatype: "all",
  });

  return c.process((input, output) => {
    if (!input.hasData("in")) return;
    const inValue = input.getData("in");
    output.sendDone({ out: f(inValue) });
  });
};
