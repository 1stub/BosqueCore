"use strict";

import { runishMainCodeUnsat } from "../../../bin/test/smtoutput/smtemit_nf.js";
import { describe, it } from "node:test";

describe ("SMT -- entity decl inherits", () => {
    it("should smt exec simple inherits eADT", function () {
        runishMainCodeUnsat('datatype Foo using { field f: Int; } of F1 { } | F2 { }; public function main(): Int { return F1{3i}.f; }', "(assert (not (= 3 Main@main)))"); 
        runishMainCodeUnsat('datatype Foo using { field f: Int; invariant $f >= 0i; } of F1 { } | F2 { field g: Bool; }; public function main(): Bool { return F2{3i, false}.g; }', "(assert (not (= (@Result-ok false) Main@main)))"); 

        runishMainCodeUnsat('datatype Foo<T> using { field f: T; } of F1 { } | F2 { }; public function main(): Int { return F1<Int>{3i}.f; }', "(assert (not (= 3 Main@main)))"); 

        runishMainCodeUnsat('concept Bar<U> { field f: U; } datatype Foo provides Bar<Int> using { field g: Bool; } of F1 { invariant $g ==> $f >= 0i; } | F2 { }; public function main(): Int { return F1{3i, true}.f; }', "(assert (not (= (@Result-ok 3) Main@main)))"); 
        runishMainCodeUnsat('concept Bar<U> { field f: U; } datatype Foo provides Bar<Int> using { field g: Bool; } of F1 { invariant $g ==> $f >= 0i; } | F2 { }; public function main(): Int { return F1{-1i, false}.f; }', "(assert (not (= (@Result-ok -1) Main@main)))"); 
    });

    it("should smt fail exec simple inherits eADT", function () {
        runishMainCodeUnsat('concept Bar<U> { field f: U; } datatype Foo provides Bar<Int> using { field g: Bool; } of F1 { invariant $g ==> $f >= 0i; } | F2 { }; public function main(): Int { return F1{-1i, true}.f; }', "(assert (not (is-@Result-err Main@main)))"); 
    });
});
