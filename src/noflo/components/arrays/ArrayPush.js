const noflo = require("noflo");

exports.getComponent = () => {
  const c = new noflo.Component();
  //   c.description = `This component generates a single packet and sends it to
  // the output port. Mostly usable for debugging, but can also be useful
  // for starting up networks.`;
  //   c.icon = "share";

  c.inPorts.add("arr", {
    datatype: "array",
    required: true,
  });
  c.inPorts.add("elem", {
    datatype: "all",
    required: true,
  });
  c.outPorts.add("out", {
    datatype: "array",
  });

  return c.process((input, output) => {
    if (!input.hasData("arr", "elem")) return;
    const [arr, elem] = input.getData("arr", "elem");
    output.sendDone({ out: arr.concat(elem) });
  });
};
