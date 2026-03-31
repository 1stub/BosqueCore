"use strict";

import { runishMainCodeUnsat } from "../../../bin/test/smtoutput/smtemit_nf.js";
import { describe, it } from "node:test";

describe ("SMT List -- sum integrals", () => {
    it("should do simple integral sums smt", function () {
        runishMainCodeUnsat('public function main(): Int { return List<Int>{}.sum(); }', "(assert (not (= #x00 Main@main)))");
        runishMainCodeUnsat('public function main(): Int { return List<Int>{2i, -1i}.sum(); }', "(assert (not (= #x01 Main@main)))");

        runishMainCodeUnsat('public function main(): Nat { return List<Nat>{}.sum(); }', "(assert (not (= #x00 Main@main)))");
        runishMainCodeUnsat('public function main(): Nat { return List<Nat>{2n, 1n}.sum(); }', "(assert (not (= #x03 Main@main)))");
    });
});

describe ("SMT List -- sum float", () => {
    it("should do simple float sums smt", function () {
        runishMainCodeUnsat('public function main(): Float { return List<Float>{}.sum(); }', "(assert (not (=((_ to_fp 5 11) RNE 0)  Main@main)))");
        runishMainCodeUnsat('public function main(): Float { return List<Float>{2.0f, -1.0f}.sum(); }', "(assert (not (= ((_ to_fp 5 11) RNE 1) Main@main)))");
    });
});

