"use strict";

import { runishMainCodeUnsat } from "../../../bin/test/smtoutput/smtemit_nf.js";
import { describe, it } from "node:test";

describe ("SMT List -- construct empty and isEmpty", () => {
    it("smt should create simple list", function () {
        runishMainCodeUnsat('public function main(): Bool { return List<Int>{}.empty(); }', "(assert (not Main@main))"); 
        runishMainCodeUnsat('public function main(): Bool { return List<Int>{1i}.empty(); }', "(assert Main@main)"); 
    });

    it("smt should isSingle list", function () {
        runishMainCodeUnsat('public function main(): Bool { return List<Int>{}.isSingle(); }', "(assert Main@main)"); 
        runishMainCodeUnsat('public function main(): Bool { return List<Int>{1i}.isSingle(); }', "(assert (not Main@main))"); 
        runishMainCodeUnsat('public function main(): Bool { return List<Int>{1i, 2i}.isSingle(); }', "(assert Main@main)"); 
    });
});

describe ("SMT List -- immediate and size", () => {
    it("smt should create and size", function () {
        runishMainCodeUnsat('public function main(): Nat { return List<Int>{}.size(); }', "(assert (not (= #x00 Main@main)))"); 
        runishMainCodeUnsat('public function main(): Nat { return List<Int>{1i}.size(); }', "(assert (not (= #x01 Main@main)))"); 
        runishMainCodeUnsat('public function main(): Nat { return List<Int>{1i, 2i, 3i}.size(); }', "(assert (not (= #x03 Main@main)))"); 
    });

    it("smt should create and lastIndex", function () {
        runishMainCodeUnsat('public function main(): Nat { return List<Int>{1i}.lastIndex(); }', "(assert (not (= (@Result-ok #x00) Main@main)))"); 
        runishMainCodeUnsat('public function main(): Nat { return List<Int>{1i, 2i, 3i}.lastIndex(); }', "(assert (not (= (@Result-ok #x02) Main@main)))"); 
    });

    it("smt should error empty lastIndex", function () {
        runishMainCodeUnsat('public function main(): Nat { return List<Int>{}.lastIndex(); }', "(assert (not (is-@Result-err Main@main)))"); 
    });
});

