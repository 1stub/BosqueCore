
import { AbstractConceptTypeDecl, Assembly, ConstMemberDecl, DatatypeMemberEntityTypeDecl, EntityTypeDecl, MethodDecl, NamespaceConstDecl, NamespaceDeclaration, NamespaceFunctionDecl, TypeFunctionDecl } from "../frontend/assembly.js";
import { SourceInfo } from "../frontend/build_decls.js";
import { EListTypeSignature, FullyQualifiedNamespace, NominalTypeSignature, TemplateNameMapper, TemplateTypeSignature, TypeSignature } from "../frontend/type.js";

class JSCodeFormatter {
    private level: number;

    constructor(iidnt: number) {
        this.level = iidnt;
    }

    indentPush() {
        this.level++;
    }
    
    indentPop() {
        this.level--;
    }
    
    indent(code: string): string {
        return "    ".repeat(this.level) + code;
    }

    static isEscapeFreeString(str: string): boolean {
        return JSON.stringify(str).slice(1, -1) === str;
    }

    static emitEscapedString(str: string): string {
        return  '"' + encodeURI(str) + '"';
    }
}

class EmitNameManager {
    static isUniqueTypeForSubtypeChecking(ttype: TypeSignature): boolean {
        return (ttype instanceof NominalTypeSignature) && !(ttype.decl instanceof AbstractConceptTypeDecl);
    }

    static isNakedTypeRepr(ttype: TypeSignature): boolean {
        if(ttype instanceof EListTypeSignature) {
            return true;
        }
        else if(ttype instanceof NominalTypeSignature) {
            return !(ttype.decl instanceof AbstractConceptTypeDecl);
        }
        else {
            return false;
        }
    }

    static isBoxedTypeRepr(ttype: TypeSignature): boolean {
        return !this.isNakedTypeRepr(ttype);
    }

    static isMethodCallObjectRepr(ttype: TypeSignature): boolean {
        if(!(ttype instanceof NominalTypeSignature)) {
            return false;
        }

        const tdecl = ttype.decl;
        return (tdecl instanceof EntityTypeDecl) || (tdecl instanceof DatatypeMemberEntityTypeDecl);
    }

    static generateTypeKey(ttype: NominalTypeSignature): string {
        const nscope = ttype.decl.ns.ns.join(".");

        if(ttype.decl.terms.length === 0) {
            return nscope + "." + ttype.decl.name;
        }
        else {
            const termstr = `<${ttype.alltermargs.map((t) => t.tkeystr).join(", ")}>`;
            return `${nscope}.${ttype.decl.name}${termstr}`;
        }
    }

    static generateTypeKeySymbol(ttype: NominalTypeSignature): string {
        const tkey = this.generateTypeKey(ttype);
        return `Symbol.for("${tkey}")`;
    }

    static resolveNamespaceDecl(assembly: Assembly, ns: FullyQualifiedNamespace): NamespaceDeclaration {
        let curns = assembly.getToplevelNamespace(ns.ns[0]) as NamespaceDeclaration;

        for(let i = 1; i < ns.ns.length; ++i) {
            curns = curns.subns.find((nns) => nns.name === ns.ns[i]) as NamespaceDeclaration;
        }

        return curns as NamespaceDeclaration;
    }

    private static emitNamespaceAccess(currentns: NamespaceDeclaration, tns: NamespaceDeclaration): string {
        return currentns.fullnamespace.ns[0] === tns.fullnamespace.ns[0] ? (tns.fullnamespace.ns.slice(1).join(".")) : ("$" + tns.fullnamespace.ns.join("."));
    }

    static emitTypeTermKey(tsig: NominalTypeSignature): string {
        return `"<${tsig.alltermargs.map((t) => t.tkeystr).join(", ")}>"`;
    }

    private static emitTypeAccess(currentns: NamespaceDeclaration, ttype: NominalTypeSignature): string {
        const nscope = currentns.fullnamespace.ns[0] === ttype.decl.ns.ns[0] ? (ttype.decl.ns.ns.slice(1).join(".")) : ("$" + ttype.decl.ns.ns.join("."));
        const acroot = nscope !== "" ?  nscope + "." : "";

        if(ttype.alltermargs.length === 0) {
            return acroot + ttype.decl.name;
        }
        else {
            const termstr = `<${ttype.alltermargs.map((t) => t.tkeystr).join(", ")}>`;
            if(ttype.decl.isSpecialResultEntity()) {
                return `${acroot}Result["${termstr}"].${ttype.decl.name}`;
            }
            else if(ttype.decl.isSpecialAPIResultEntity()) {
                return `${acroot}APIResult["${termstr}"].${ttype.decl.name}`;
            }
            else {
                return `${acroot}${ttype.decl.name}["${termstr}"]`;
            }
        }
    }

    static generateDeclarationNameForNamespaceConstant(currentns: NamespaceDeclaration, cv: NamespaceConstDecl): string {
        const nns = EmitNameManager.emitNamespaceAccess(currentns, currentns);
        if(nns === "") {
            return `const ${cv.name} = `;
        }
        else {
            return `${cv.name}: `;
        }
    }

    static generateDeclarationNameForNamespaceFunction(currentns: NamespaceDeclaration, fv: NamespaceFunctionDecl, mapper: TemplateNameMapper | undefined): [string, boolean] {
        const nns = EmitNameManager.emitNamespaceAccess(currentns, currentns);

        if(nns === "") {
            if(fv.terms.length === 0) {
                return [`export function ${fv.name}`, false];
            }
            else {
                const termstr = `<${fv.terms.map((t) => (mapper as TemplateNameMapper).resolveTemplateMapping(new TemplateTypeSignature(SourceInfo.implicitSourceInfo(), t.name)).tkeystr).join(", ")}>`;
                return [`"${termstr}": `, true];
            }
        }
        else {
            if(fv.terms.length === 0) {
                return [`"${fv.name}": `, true];
            }
            else {
                const termstr = `<${fv.terms.map((t) => (mapper as TemplateNameMapper).resolveTemplateMapping(new TemplateTypeSignature(SourceInfo.implicitSourceInfo(), t.name)).tkeystr).join(", ")}>`;
                return [`"${termstr}": `, true];
            }
        }
    }

    static generateOnCompleteDeclarationNameForNamespaceFunction(currentns: NamespaceDeclaration, fv: NamespaceFunctionDecl, mapper: TemplateNameMapper | undefined): [string, boolean] {
        const nns = EmitNameManager.emitNamespaceAccess(currentns, currentns);

        if(nns === "") {
            if(fv.terms.length === 0) {
                return [`export function ${fv.name}$OnReturn`, false];
            }
            else {
                const termstr = `<${fv.terms.map((t) => (mapper as TemplateNameMapper).resolveTemplateMapping(new TemplateTypeSignature(SourceInfo.implicitSourceInfo(), t.name)).tkeystr).join(", ")}>`;
                return [`"${termstr}$OnReturn": `, true];
            }
        }
        else {
            if(fv.terms.length === 0) {
                return [`"${fv.name}$OnReturn": `, true];
            }
            else {
                const termstr = `<${fv.terms.map((t) => (mapper as TemplateNameMapper).resolveTemplateMapping(new TemplateTypeSignature(SourceInfo.implicitSourceInfo(), t.name)).tkeystr).join(", ")}>`;
                return [`"${termstr}$OnReturn": `, true];
            }
        }
    }

    static generateDeclarationNameForTypeConstant(ttype: NominalTypeSignature, cv: ConstMemberDecl): string {
        return `${cv.name}: `;
    }

    static generateDeclarationNameForTypeFunction(fv: TypeFunctionDecl, mapper: TemplateNameMapper | undefined): string {
        if(fv.terms.length === 0) {
            return `${fv.name}: `;
        }
        else {
            const termstr = `<${fv.terms.map((t) => (mapper as TemplateNameMapper).resolveTemplateMapping(new TemplateTypeSignature(SourceInfo.implicitSourceInfo(), t.name)).tkeystr).join(", ")}>`;
            return `"${termstr}": `;
        }
    }

    static generateDeclarationNameForMethod(ttype: NominalTypeSignature, fv: MethodDecl, mapper: TemplateNameMapper | undefined): string {
        if(fv.terms.length === 0) {
            return `${fv.name}: `;
        }
        else {
            const termstr = `<${fv.terms.map((t) => (mapper as TemplateNameMapper).resolveTemplateMapping(new TemplateTypeSignature(SourceInfo.implicitSourceInfo(), t.name)).tkeystr).join(", ")}>`;
            return `"${termstr}": `;
        }
    }

    static generateOnCompleteDeclarationNameForTypeFunction(fv: TypeFunctionDecl, mapper: TemplateNameMapper | undefined): string {
        if(fv.terms.length === 0) {
            return `${fv.name}$OnReturn: `;
        }
        else {
            const termstr = `<${fv.terms.map((t) => (mapper as TemplateNameMapper).resolveTemplateMapping(new TemplateTypeSignature(SourceInfo.implicitSourceInfo(), t.name)).tkeystr).join(", ")}>`;
            return `"${termstr}$OnReturn": `;
        }
    }

    static generateOnCompleteDeclarationNameForMethod(ttype: NominalTypeSignature, fv: MethodDecl, mapper: TemplateNameMapper | undefined): string {
        if(fv.terms.length === 0) {
            return `${fv.name}$OnReturn: `;
        }
        else {
            const termstr = `<${fv.terms.map((t) => (mapper as TemplateNameMapper).resolveTemplateMapping(new TemplateTypeSignature(SourceInfo.implicitSourceInfo(), t.name)).tkeystr).join(", ")}>`;
            return `"${termstr}$OnReturn": `;
        }
    }

    static generateAccssorNameForNamespaceConstant(currentns: NamespaceDeclaration, inns: NamespaceDeclaration, cv: NamespaceConstDecl): string {
        const nns = this.emitNamespaceAccess(currentns, inns);
        const ans = nns !== "" ? (nns + ".") : "";

        return `${ans}${cv.name}()`;
    }

    static generateAccssorNameForNamespaceFunction(currentns: NamespaceDeclaration, inns: NamespaceDeclaration, fv: NamespaceFunctionDecl, terms: TypeSignature[]): string {
        const nns = this.emitNamespaceAccess(currentns, inns);
        const ans = nns !== "" ? (nns + ".") : "";

        if(fv.terms.length === 0) {
            return `${ans}${fv.name}`;
        }
        else {
            const termstr = `<${terms.map((t) => t.tkeystr).join(", ")}>`;
            return `${ans}${fv.name}["${termstr}"]`;
        }
    }

    static generateOnCompleteAccssorNameForNamespaceFunction(currentns: NamespaceDeclaration, fv: NamespaceFunctionDecl, terms: TypeSignature[]): string {
        const nns = this.emitNamespaceAccess(currentns, currentns);
        const ans = nns !== "" ? (nns + ".") : "";

        if(fv.terms.length === 0) {
            return `${ans}${fv.name}$OnReturn`;
        }
        else {
            const termstr = `<${terms.map((t) => t.tkeystr).join(", ")}>`;
            return `${ans}${fv.name}["${termstr}$OnReturn"]`;
        }
    }

    static generateAccssorNameForEnumMember(currentns: NamespaceDeclaration, ttype: NominalTypeSignature, ename: string): string {
        return `${this.emitTypeAccess(currentns, ttype)}.${ename}`;
    }

    static generateAccssorNameForTypeConstant(currentns: NamespaceDeclaration, ttype: NominalTypeSignature, cv: ConstMemberDecl): string {
        return `${this.emitTypeAccess(currentns, ttype)}.${cv.name}()`;
    }

    static generateAccssorNameForTypeFunction(currentns: NamespaceDeclaration, ttype: NominalTypeSignature, fv: TypeFunctionDecl, terms: TypeSignature[]): string {
        const tas = this.emitTypeAccess(currentns, ttype);

        if(fv.terms.length === 0) {
            return `${tas}.${fv.name}`;
        }
        else {
            const termstr = `<${terms.map((t) => t.tkeystr).join(", ")}>`;
            return `${tas}.${fv.name}["${termstr}"]`;
        }
    }

    static generateAccssorNameForMethodImplicit(currentns: NamespaceDeclaration, rcvrtype: NominalTypeSignature, mv: MethodDecl, terms: TypeSignature[]): string {
        if(mv.terms.length === 0) {
            return `${mv.name}`;
        }
        else {
            const termstr = `<${terms.map((t) => t.tkeystr).join(", ")}>`;
            return `${mv.name}["${termstr}"]`;
        }
    }

    static generateAccssorNameForMethodFull(currentns: NamespaceDeclaration, rcvrtype: NominalTypeSignature, mv: MethodDecl, terms: TypeSignature[]): string {
        const tas = this.emitTypeAccess(currentns, rcvrtype);

        if(mv.terms.length === 0) {
            return `${tas}.${mv.name}`;
        }
        else {
            const termstr = `<${terms.map((t) => t.tkeystr).join(", ")}>`;
            return `${tas}.${mv.name}["${termstr}"]`;
        }
    }

    static generateOnCompleteAccssorNameForTypeFunction(currentns: NamespaceDeclaration, ttype: NominalTypeSignature, fv: TypeFunctionDecl, terms: TypeSignature[]): string {
        const tas = this.emitTypeAccess(currentns, ttype);

        if(fv.terms.length === 0) {
            return `${tas}.${fv.name}$OnReturn`;
        }
        else {
            const termstr = `<${terms.map((t) => t.tkeystr).join(", ")}>`;
            return `${tas}["${termstr}$OnReturn"]`;
        }
    }

    static generateAccessorForTypeConstructor(currentns: NamespaceDeclaration, ttype: NominalTypeSignature, directVersion: boolean): string {
        return this.emitTypeAccess(currentns, ttype) + (directVersion ? ".$create" : ".$kreate");
    }

    static generateAccessorForTypeKey(currentns: NamespaceDeclaration, ttype: NominalTypeSignature): string {
        return `${this.emitTypeAccess(currentns, ttype)}.$tsym`;
    }

    static generateAccessorForTypeSpecialName(currentns: NamespaceDeclaration, ttype: NominalTypeSignature, name: string): string {
        return `${this.emitTypeAccess(currentns, ttype)}.${name}`;
    }

    static generateAccessorForTypeConstructorProto(currentns: NamespaceDeclaration, ttype: NominalTypeSignature): string {
        return `${this.emitTypeAccess(currentns, ttype)}`;
    }
}

export {
    JSCodeFormatter,
    EmitNameManager
};
