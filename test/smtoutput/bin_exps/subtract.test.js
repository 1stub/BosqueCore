"use strict";

import { runishMainCodeUnsat, checkProperties } from "../../../bin/test/smtoutput/smtemit_nf.js";
import { describe, it } from "node:test";

describe ("SMT evaluate -- Simple subtraction", () => {
    it("should smt eval simple", function () {
        runishMainCodeUnsat("public function main(x: Int): Int { return x - 2i; }", "(declare-const b @Int) (assert (= b (Main@main #x03))) (assert (not (= b #x01)))");

        runishMainCodeUnsat("public function main(x: Nat): Nat { return x - 2n; }", "(declare-const b (@Result Nat)) (assert (= b (Main@main #x03))) (assert (not (= b (@Result-ok #x01))))");
        runishMainCodeUnsat("public function main(x: Nat): Nat { return x - 2n; }", "(declare-const b (@Result Nat)) (assert (= b (Main@main #x01))) (assert (not (is-@Result-err b)))");
    });
});

describe ("SMT check props -- Simple subtraction", () => {
    it("should smt eval simple", function () {
        checkProperties("public function main(x: Nat): Nat { return x - 2n; }", [{ pkey: ";;--FUNCTION_DECLS--;;", expected: "(define-fun Main@main ((x Nat)) (@Result Nat) (ite (bvult x #x02) ((as @Result-err (@Result Nat)) @err-other) (@Result-ok (bvsub x #x02))) )" }]);
    });
});


