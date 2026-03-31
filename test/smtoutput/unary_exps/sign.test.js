"use strict";

import { runishMainCodeUnsat } from "../../../bin/test/smtoutput/smtemit_nf.js";
import { describe, it } from "node:test";

describe ("SMT -- Simple numeric sign", () => {
    it("should SMT exec simple not", function () {
        runishMainCodeUnsat("public function main(x: Int): Int { return -x; }", "(assert (not (= #x03 (Main@main #xfd))))");
        runishMainCodeUnsat("public function main(x: Nat): Nat { return +x; }", "(assert (not (= #x05 (Main@main #x05))))");
    });
});
