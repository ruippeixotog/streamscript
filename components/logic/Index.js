/* @noflow */

const noflo = require("noflo");

exports.getComponent = () => {
  const c = new noflo.Component();
  //   c.description = `This component generates a single packet and sends it to
  // the output port. Mostly usable for debugging, but can also be useful
  // for starting up networks.`;
  //   c.icon = "share";

  c.inPorts.add("coll", {
    datatype: "all",
    required: true,
  });
  c.inPorts.add("index", {
    datatype: "all",
    required: true,
  });
  c.outPorts.add("out", {
    datatype: "all",
  });

  return c.process((input, output) => {
    if (!input.hasData("coll", "index")) return;
    const [coll, index] = input.getData("coll", "index");
    output.sendDone({ out: coll[index] });
  });
};
