"use strict";

import { runMainCode } from "../../../bin/test/cppoutput/cppemit_nf.js";
import { describe, it } from "node:test";

describe ("Exec -- entity methods", () => {
    it("should exec simple entity methods", function () {
        runMainCode('entity Foo { field f: Int; method foo(): Int { return this.f; }} public function main(): Int { return Foo{3i}.foo(); }', "3_i"); 
        runMainCode('entity Foo { field f: Int; method foo(): Int { return this.f; }} public function main(): Int { let x = Foo{3i}; return x.foo(); }', "3_i"); 
    });

    it("should exec simple entity methods with args", function () {
        runMainCode('entity Foo { field f: Int; method foo(x: Int): Int { return this.f + x; }} public function main(): Int { return Foo{3i}.foo(1i); }', "4_i"); 
        runMainCode('entity Foo { field f: Int; method foo(x: Int = 1i): Int { return this.f + x; }} public function main(): Int { let x = Foo{3i}; return x.foo(); }', "4_i"); 
    });

    it("should exec simple entity methods with named args", function () {
        runMainCode('entity Foo { field f: Int; method foo(x: Int, y: Int): Int { return this.f + x + y; }} public function main(): Int { return Foo{3i}.foo(x=1i,y=2i); }', "6_i"); 
    });

/*
    it("should exec simple entity methods with template", function () {
        runMainCode('entity Foo { field f: Int; method foo<T>(): Bool { return this.f?<T>; }} public function main(): Bool { let x = Foo{3i}; return x.foo<Nat>(); }', "false"); 
        runMainCode('entity Foo { field f: Int; method foo<T>(): Bool { return this.f?<T>; }} public function main(): Bool { let x = Foo{3i}; return x.foo<Int>(); }', "true"); 
    });

    it("should exec simple entity methods with type template", function () {
        runMainCode('entity Foo<T> { field f: T; method foo(x: T): T { return if (true) then x else this.f; }} public function main(): Int { let x = Foo<Int>{3i}; return x.foo(2i); }', "2i"); 
    });

    it("should exec simple entity methods with both template", function () {
        runMainCode('entity Foo<T> { field f: T; method foo<U>(): Bool { return this.f?<U>; }} public function main(): Bool { let x = Foo<Int>{3i}; return x.foo<Nat>(); }', "false"); 
        runMainCode('entity Foo<T> { field f: T; method foo<U>(): Bool { return this.f?<U>; }} public function main(): Bool { let x = Foo<Int>{3i}; return x.foo<Int>(); }', "true"); 
    });

    it("should exec simple entity methods with both template and more", function () {
        runMainCode('entity Foo<T> { field f: T; method foo<U>(u: U): U { return if (this.f)@<U> then $_ else u; }} public function main(): Nat { let x = Foo<Int>{3i}; return x.foo<Nat>(3n); }', "3n"); 
        runMainCode('entity Foo<T> { field f: T; method foo<U>(t: T): T { return if (t)<U> then t else this.f; }} public function main(): Int { let x = Foo<Int>{3i}; return x.foo<Int>(3i); }', "3i"); 
    });
*/
});