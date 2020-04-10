/* @noflow */

import BinOp from "../template/BinOp";

exports.getComponent = () => BinOp.getComponent((b1, b2) => b1 >= b2);
