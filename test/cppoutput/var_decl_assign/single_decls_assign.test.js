"use strict";

import { runMainCode } from "../../../bin/test/cppoutput/cppemit_nf.js";
import { describe, it } from "node:test";

describe ("CPP Emit Evaluate -- simple declare only", () => {
    it("should exec simple declares", function () {
        runMainCode("public function main(): Int { var x: Int; return 0i; }", "0_i");
        runMainCode("public function main(): Bool { var x: Bool; return true; }", "true");
    });
});

describe ("CPP Emit Evaluate -- simple declare-assign only", () => {
    it("should exec simple declare-assign", function () {
        runMainCode("public function main(): Int { var x: Int = 5i; return x; }", "5_i");
        runMainCode("public function main(): Bool { let x: Bool = true; return x; }", "true");
    });

    it("should exec simple declare-assign infer type", function () {
        runMainCode("public function main(): Int { var x = 5i; return x; }", "5_i");
        runMainCode("public function main(): Bool { let x = true; return x; }", "true");
    });
});

describe ("CPP Emit Evaluate -- simple assign", () => {
    it("should exec simple assign", function () {
        runMainCode("public function main(): Int { var x: Int = 5i; x = 2i; return x; }", "2_i");
        runMainCode("public function main(): Int { var x: Int = 5i; x = 2i; x = 0i; return x; }", "0_i");
    });

    it("should ignore assign", function () {
        runMainCode("public function main(): Int { _ = 2i; return 0i; }", "0_i");
    });
});

