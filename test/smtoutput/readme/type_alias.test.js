"use strict";

import { runishMainCodeUnsat } from "../../../bin/test/smtoutput/smtemit_nf.js";
import { describe, it } from "node:test";

const decls = 'type Fahrenheit = Int; type Celsius = Int; type Percentage = Nat & { invariant $value <= 100n; } function isFreezing(temp: Celsius): Bool { return temp <= 0i<Celsius>; }'

// TODO: With bitvectors we currentl have a hardcoded bound of 8 bits possible. We will need
// to get things going dynamically (if a literal > max is detected increase nbits) if we want
// to be able to run this test...
/*
describe ("SMT type alias exec", () => {
    it("SMT should succeed", function () {
        runishMainCodeUnsat(`${decls} public function main(): Nat { return 30n<Percentage>.value; }`, "(assert (not (= (@Result-ok #x1e ) Main@main)))"); 

        runishMainCodeUnsat(`${decls} public function main(): Bool { return isFreezing(5i<Celsius>); }`, "(assert Main@main)");
        runishMainCodeUnsat(`${decls} public function main(): Bool { return isFreezing(-5i<Celsius>); }`, "(assert (not Main@main))"); 
    });

    it("SMT should fail", function () {
        runishMainCodeUnsat(`${decls} public function main(): Nat { return 101n<Percentage>.value; }`, "(assert (not (is-@Result-err Main@main)))"); 
    });
});
*/
