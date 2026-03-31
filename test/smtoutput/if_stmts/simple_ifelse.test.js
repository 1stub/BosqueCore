"use strict";

import { runishMainCodeUnsat, checkProperties } from "../../../bin/test/smtoutput/smtemit_nf.js";
import { describe, it } from "node:test";

describe ("SMT Exec -- IfElse Statement", () => {
    it("should SMT exec simple ifs", function () {
        runishMainCodeUnsat("public function main(x: Int): Int { if(x == 0i) { return 3i; } else { return 1i; } }", "(assert (not (= #x03 (Main@main #x00))))");
        runishMainCodeUnsat("public function main(x: Int): Int { if(x == 0i) { return 3i; } else { return 1i; } }", "(assert (not (= #x01 (Main@main #x01))))");

        runishMainCodeUnsat("public function main(x: Int): Int { if(x == 0i) { return 3i; } else { ; } return 1i; }", "(assert (not (= #x01 (Main@main #x03))))");
    
        runishMainCodeUnsat("public function main(x: Int): Int { if(x == 0i) { return 3i; } else { return 1i // 0i; } }", "(assert (not (= (@Result-ok #x03) (Main@main #x00))))");
        runishMainCodeUnsat("public function main(x: Int): Int { if(x == 0i) { return 3i // 0i; } else { return 1i; } }", "(assert (not (is-@Result-err (Main@main #x00))))");
    });

    it("should smt check simple simple", function () {
        checkProperties("public function main(): Int { if(true) { return 2i; } else { return 3i; } }", [{ pkey: ";;--FUNCTION_DECLS--;;", expected: "(define-fun Main@main () @Int #x02 )" }]);
        checkProperties("public function main(): Int { if(false) { return 2i; } else {;} return 3i; }", [{ pkey: ";;--FUNCTION_DECLS--;;", expected: "(define-fun Main@main () @Int #x03 )" }]);
    });

    it("should SMT exec itest ifs", function () {
        runishMainCodeUnsat("public function main(): Int { let x: Option<Int> = some(3i); if(x)some { return 3i; } else { return 1i; } }", "(assert (not (= #x03 Main@main)))");
        runishMainCodeUnsat("public function main(): Int { let x: Option<Int> = none; if(x)some { return 3i; } else { return 1i; } }", "(assert (not (= #x01 Main@main)))");
    });


    it("should SMT exec binder itest ifs", function () {
        runishMainCodeUnsat("public function main(): Int { let x: Option<Int> = some(3i); if(x)@some { return $x; } else { return 1i; } }", "(assert (not (= #x03 Main@main)))");
        runishMainCodeUnsat("public function main(): Int { let x: Option<Int> = some(3i); if($y = x)@some { return $y; } else { return 1i; } }", "(assert (not (= #x03 Main@main)))");

        runishMainCodeUnsat("public function main(): Int { let x: Option<Int> = some(3i); if(x)@none { return 1i; } else { return $x; } }", "(assert (not (= #x03 Main@main)))");
        runishMainCodeUnsat("public function main(): Int { let x: Option<Int> = none; if(x)@none { return 1i; } else { return $x; } }", "(assert (not (= #x01 Main@main)))");
    });

    it("should SMT exec binder & reflow itest ifs", function () {
        runishMainCodeUnsat("public function main(): Int { let x: Option<Int> = some(3i); if(x)@@!some { return 0i; } else { ; } return x; }", "(assert (not (= #x03 Main@main)))");
    });
});
