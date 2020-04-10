/* @noflow */

const noflo = require("noflo");

exports.getComponent = f => {
  const c = new noflo.Component();
  //   c.description = `This component generates a single packet and sends it to
  // the output port. Mostly usable for debugging, but can also be useful
  // for starting up networks.`;
  //   c.icon = "share";

  c.inPorts.add("arg1", {
    datatype: "boolean",
    required: true,
  });
  c.inPorts.add("arg2", {
    datatype: "boolean",
    required: true,
    control: true,
  });
  c.outPorts.add("out", {
    datatype: "boolean",
  });

  return c.process((input, output) => {
    if (!input.hasData("arg1", "arg2")) return;
    const [arg1, arg2] = input.getData("arg1", "arg2");
    output.sendDone({ out: f(arg1, arg2) });
  });
};
