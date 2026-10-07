import { Injectable } from "@nestjs/common";
import { createSign, createVerify } from "node:crypto";
import * as forge from "node-forge";
import { SignedXml } from "xml-crypto";

export interface KeyMaterial {
  privateKeyPem: string;
  certPem: string;
}

/**
 * Digital signatures:
 *  - XML-DSig (enveloped, RSA-SHA256) for fiscal documents (SIN invoices, packages, events).
 *  - Raw RSA-SHA256 signatures for bank API payloads.
 * Key material is passed per call so each tenant can use its own certificate (store encrypted, never in git).
 */
@Injectable()
export class SignatureService {
  /** Extract PEM key + certificate from a .p12/.pfx file. */
  loadP12(p12: Buffer, password: string): KeyMaterial {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12.toString("binary")));
    const p12Obj = forge.pkcs12.pkcs12FromAsn1(asn1, password);

    const keyBag = p12Obj.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    const certBag = p12Obj.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.[0];
    if (!keyBag?.key || !certBag?.cert) throw new Error("PKCS#12 does not contain a private key and certificate");

    return {
      privateKeyPem: forge.pki.privateKeyToPem(keyBag.key),
      certPem: forge.pki.certificateToPem(certBag.cert),
    };
  }

  signXml(xml: string, { privateKeyPem, certPem }: KeyMaterial): string {
    const sig = new SignedXml({
      privateKey: privateKeyPem,
      publicCert: certPem,
      signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
      canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
    });
    sig.addReference({
      xpath: "/*",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/2001/10/xml-exc-c14n#",
      ],
      digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
    });
    sig.computeSignature(xml);
    return sig.getSignedXml();
  }

  signPayload(data: string | Buffer, privateKeyPem: string): string {
    return createSign("RSA-SHA256").update(data).sign(privateKeyPem, "base64");
  }

  verifyPayload(data: string | Buffer, signatureB64: string, publicKeyOrCertPem: string): boolean {
    return createVerify("RSA-SHA256").update(data).verify(publicKeyOrCertPem, signatureB64, "base64");
  }
}
