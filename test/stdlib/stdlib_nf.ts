import * as fs from "fs";
import * as path from "path";

import assert from "node:assert";

import { JSEmitter } from '../../src/backend/jsemitter/jsemitter.js';
import { generateASM } from '../../src/cmd/workflows.js';
import { Assembly } from '../../src/frontend/assembly.js';
import { InstantiationPropagator } from '../../src/frontend/closed_terms.js';

import { fileURLToPath } from 'url';
import { PackageConfig } from "../../src/frontend/build_decls.js";
import { execSync } from "child_process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bosque_dir: string = path.join(__dirname, "../../../");
const runtime_code_path = path.join(bosque_dir, "bin/jsruntime/runtime.mjs");
const bsqon_code_path = path.join(bosque_dir, "bin/jsruntime/bsqon.mjs");
const modules_path = path.join(bosque_dir, "node_modules");

import { tmpdir } from 'node:os';

function wsnorm(s: string): string {
    return s.trim().replace(/\s+/g, " ");
}

function buildAssembly(srcfile: string): Assembly | undefined {
    const userpackage = new PackageConfig(["EXEC_LIBS"], [{ srcpath: "test.bsq", filename: "test.bsq", contents: srcfile }]);
    const [asm, perrors, terrors] = generateASM(userpackage);

    if(perrors.length === 0 && terrors.length === 0) {
        return asm;
    }
    else {
        return undefined;
    }
}

function buildMainCode(assembly: Assembly, outname: string) {
    const iim = InstantiationPropagator.computeExecutableInstantiations(assembly, ["Main"]);
    const jscode = JSEmitter.emitAssembly(assembly, "debug", "test", "Main", iim);

    const nndir = path.normalize(outname);
    try {
        fs.cpSync(runtime_code_path, path.join(nndir, "runtime.mjs"));
        fs.cpSync(bsqon_code_path, path.join(nndir, "bsqon.mjs"));
        fs.cpSync(modules_path, path.join(nndir, "node_modules"), { recursive: true });

        for(let i = 0; i < jscode.length; ++i) {
            const fname = path.join(nndir, `${jscode[i].ns.ns[0]}.mjs`);
            fs.writeFileSync(fname, jscode[i].contents);
        }
    }
    catch(e) {  
        return false;
    }

    return true;
}

function execMainCode(code: string, expectederr: boolean): string {
    const nndir = fs.mkdtempSync(path.join(tmpdir(), "bosque-test-"));

    let result = "";
    try {
        const asm = buildAssembly("declare namespace Main;\n\n" + code);
        if(asm === undefined) {
            result = `[FAILED TO BUILD ASSEMBLY] \n\n ${code}`;
        }
        else {
            if(!buildMainCode(asm, nndir)) {
                result = `[FAILED TO BUILD MAIN CODE] \n\n ${code}`;
            }
            else {
                try {
                    const mjs = path.join(nndir, "Main.mjs");
                    result = execSync(`node ${mjs}`).toString();
                }
                catch(e) {
                    if(expectederr) {
                        result = (e as any).stdout.toString();
                    }
                    else {
                        result = `[FAILED TO RUN MAIN CODE] -- ${e} \n\n ${code}`;
                    }
                }
            }
        }
    }
    catch(e) {
        result = `[Unexpected error ${e}]`;
    }
    finally {
        fs.rmSync(nndir, { recursive: true });
    }

    return wsnorm(result);
}

function runMainCode(code: string, expected: string) {
    const result = execMainCode(code, false);

    assert.equal(wsnorm(result), expected);
}

function runMainCodeError(code: string, expected: string) {
    const result = execMainCode(code, true);

    assert.equal(wsnorm(result).replace(/:\d+$/, ""), expected);
}

export {
    runMainCode, runMainCodeError
};
