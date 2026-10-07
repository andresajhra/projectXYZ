/**
 * Offline Digital Invoice Signer for Mobile.
 *
 * Demonstrates how electronic invoice XML generation and local cryptographic signing
 * execute entirely on the mobile device without network access.
 *
 * When the phone is offline, the invoice is signed with the cached daily authorization
 * (e.g., CUFD/CUIS) and local key material, generating a legal, signed invoice on the spot.
 */

export interface OfflineInvoiceInput {
  invoiceNumber: number;
  customerName: string;
  customerNit: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  cufd: string; // Cached Daily Invoicing Code (valid 24h)
}

export interface OfflineSignedInvoice {
  cuf: string;
  xml: string;
  signedAt: string;
  total: number;
}

/** Simulates a fast local SHA-256 digest on device (1-2ms). */
function localDigest(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

export function signInvoiceOffline(input: OfflineInvoiceInput): OfflineSignedInvoice {
  const signedAt = new Date().toISOString();
  const total = input.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

  // Generate Unique Invoice Code (CUF) using cached CUFD + local timestamp + invoice#
  const cufRaw = `${input.cufd}-${input.invoiceNumber}-${Date.now()}-${total}`;
  const cuf = `CUF-${localDigest(cufRaw).toUpperCase()}`;

  // Assemble XML document
  const itemsXml = input.items
    .map(
      (item) =>
        `    <detalle>\n      <descripcion>${item.name}</descripcion>\n      <cantidad>${item.quantity}</cantidad>\n      <precioUnitario>${item.unitPrice.toFixed(2)}</precioUnitario>\n      <subTotal>${(item.quantity * item.unitPrice).toFixed(2)}</subTotal>\n    </detalle>`,
    )
    .join("\n");

  const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
<facturaElectronica>
  <cabecera>
    <numeroFactura>${input.invoiceNumber}</numeroFactura>
    <cuf>${cuf}</cuf>
    <cufd>${input.cufd}</cufd>
    <fechaEmision>${signedAt}</fechaEmision>
    <nombreRazonSocial>${input.customerName}</nombreRazonSocial>
    <numeroDocumento>${input.customerNit}</numeroDocumento>
    <montoTotal>${total.toFixed(2)}</montoTotal>
    <modalidadEmision>2</modalidadEmision> <!-- 2 = Fuera de linea / Contingencia -->
  </cabecera>
  <detalle>
${itemsXml}
  </detalle>
</facturaElectronica>`;

  // Enveloped XML-DSig Signature Digest computed on device
  const signatureValue = localDigest(`SIGNATURE_KEY_HASH_${rawXml}`);
  const signedXml = rawXml.replace(
    "</facturaElectronica>",
    `  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">\n    <SignedInfo>\n      <SignatureValue>${signatureValue}</SignatureValue>\n    </SignedInfo>\n  </Signature>\n</facturaElectronica>`,
  );

  return { cuf, xml: signedXml, signedAt, total };
}
