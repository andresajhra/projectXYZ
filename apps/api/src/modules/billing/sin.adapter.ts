import { Injectable } from "@nestjs/common";
import { SignatureService, } from "../integrations/signature/signature.service";
import type { KeyMaterial } from "../integrations/signature/signature.service";
import { SoapService } from "../integrations/soap/soap.service";
import { FiscalAdapter } from "./fiscal-adapter";

/** Skeleton: shows how SOAP + XML signature compose. WSDL URL/operation names must be verified against the SIN docs. */
@Injectable()
export class SinAdapter implements FiscalAdapter {
  private readonly wsdl = "https://pilotosiat.impuestos.gob.bo/v2/ServicioFacturacionCompraVenta?wsdl"; // [VERIFY]

  constructor(private readonly soap: SoapService, private readonly signatures: SignatureService) {}

  async issue({ xml }: { xml: string }, keys?: KeyMaterial) {
    const signed = keys ? this.signatures.signXml(xml, keys) : xml;
    const res = await this.soap.call<{ RespuestaServicioFacturacion?: { codigoRecepcion?: string } }>(
      this.wsdl,
      "recepcionFactura",
      { SolicitudServicioRecepcionFactura: { archivo: Buffer.from(signed).toString("base64") } },
    );
    const reference = res.RespuestaServicioFacturacion?.codigoRecepcion;
    return { accepted: !!reference, reference };
  }

  async cancel(_: { reference: string; reason: string }) {
    throw new Error("Not implemented yet");
  }
}
