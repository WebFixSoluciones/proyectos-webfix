import forge from 'node-forge';

/**
 * Convierte una cadena hexadecimal a decimal para el serial del certificado
 */
function hexToDec(hex) {
  try {
    return BigInt('0x' + hex).toString(10);
  } catch (e) {
    return parseInt(hex, 16).toString();
  }
}

/**
 * Obtiene la representación en cadena del Issuer del certificado
 */
function getIssuerString(cert) {
  // Formato: C=EC, L=Quito, O=Autoridad de Certificacion, CN=Nombre
  return cert.issuer.attributes.map(attr => {
    const name = attr.shortName || attr.name;
    return `${name}=${attr.value}`;
  }).join(', ');
}

/**
 * Calcula el digest SHA1 en Base64 de un texto o buffer
 */
function sha1Base64(data) {
  const md = forge.md.sha1.create();
  md.update(data, 'utf8');
  return forge.util.encode64(md.digest().getBytes());
}

/**
 * Firma un XML utilizando una firma electrónica en formato .p12 y contraseña
 * Implementa XAdES-BES (enveloped) compatible con el SRI de Ecuador
 */
export function firmarComprobanteXML(xmlString, p12Base64, password) {
  try {
    // 1. Decodificar el archivo P12
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    // 2. Extraer clave privada y certificado
    let keyBag = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    let privateKey;
    for (let keyId in keyBag) {
      if (keyBag[keyId] && keyBag[keyId][0]) {
        privateKey = keyBag[keyId][0].key;
        break;
      }
    }

    if (!privateKey) {
      keyBag = p12.getBags({ bagType: forge.pki.oids.keyBag });
      for (let keyId in keyBag) {
        if (keyBag[keyId] && keyBag[keyId][0]) {
          privateKey = keyBag[keyId][0].key;
          break;
        }
      }
    }

    const certBag = p12.getBags({ bagType: forge.pki.oids.certBag });
    let certificate;
    for (let certId in certBag) {
      if (certBag[certId] && certBag[certId][0]) {
        certificate = certBag[certId][0].cert;
        break;
      }
    }

    if (!privateKey || !certificate) {
      throw new Error("No se pudo extraer la clave privada o el certificado del archivo .p12");
    }

    // 3. Preparar información del certificado
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes();
    const certBase64 = forge.util.encode64(certDer).replace(/\r?\n|\r/g, "");
    
    // Calcular digest del certificado
    const certDigest = sha1Base64(certDer);
    
    const issuerName = getIssuerString(certificate);
    const serialNumber = hexToDec(certificate.serialNumber);

    // 4. Limpiar el XML original (eliminar cabecera XML temporal si tiene)
    let cleanXml = xmlString.trim();
    const xmlHeaderMatch = cleanXml.match(/^<\?xml.*\?>/i);
    let xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    if (xmlHeaderMatch) {
      xmlHeader = xmlHeaderMatch[0];
      cleanXml = cleanXml.replace(xmlHeader, "").trim();
    }

    // Generar IDs aleatorios consistentes para la firma
    const rand = Math.floor(Math.random() * 900000) + 100000;
    const sigId = `Signature${rand}`;
    const sigValueId = `SignatureValue${rand}`;
    const keyInfoId = `KeyInfo${rand}`;
    const signedPropertiesId = `SignedProperties${rand}`;
    const signedInfoRefId = `Reference-ID${rand}`;

    // Obtener la fecha de firma en formato ISO
    const signingTime = new Date().toISOString();

    // 5. Construir nodos auxiliares para calcular sus Hashes
    
    // Objeto SignedProperties (XAdES)
    const signedPropertiesXml = `<xades:SignedProperties Id="${signedPropertiesId}">` +
      `<xades:SignedSignatureProperties>` +
        `<xades:SigningTime>${signingTime}</xades:SigningTime>` +
        `<xades:SigningCertificate>` +
          `<xades:Cert>` +
            `<xades:CertDigest>` +
              `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
              `<ds:DigestValue>${certDigest}</ds:DigestValue>` +
            `</xades:CertDigest>` +
            `<xades:IssuerSerial>` +
              `<ds:X509IssuerName>${issuerName}</ds:X509IssuerName>` +
              `<ds:X509SerialNumber>${serialNumber}</ds:X509SerialNumber>` +
            `</xades:IssuerSerial>` +
          `</xades:Cert>` +
        `</xades:SigningCertificate>` +
      `</xades:SignedSignatureProperties>` +
    `</xades:SignedProperties>`;

    // Objeto ds:KeyInfo
    const modulusHex = certificate.publicKey.n.toString(16);
    const modulusBytes = forge.util.hexToBytes(modulusHex.length % 2 === 0 ? modulusHex : '0' + modulusHex);
    const modulusBase64 = forge.util.encode64(modulusBytes).replace(/\r?\n|\r/g, "");

    const exponent = certificate.publicKey.e.toString(16);
    // Convertir exponent a base64 o hex normal. En SRI se representa como base64.
    const exponentDec = certificate.publicKey.e.toString(10);
    const exponentBase64 = forge.util.encode64(forge.util.hexToBytes(exponentDec === '65537' ? '010001' : exponent.padStart(6, '0')));

    const keyInfoXml = `<ds:KeyInfo Id="${keyInfoId}">` +
      `<ds:X509Data>` +
        `<ds:X509Certificate>${certBase64}</ds:X509Certificate>` +
      `</ds:X509Data>` +
      `<ds:KeyValue>` +
        `<ds:RSAKeyValue>` +
          `<ds:Modulus>${modulusBase64}</ds:Modulus>` +
          `<ds:Exponent>${exponentBase64}</ds:Exponent>` +
        `</ds:RSAKeyValue>` +
      `</ds:KeyValue>` +
    `</ds:KeyInfo>`;

    // Calcular digests
    const documentDigest = sha1Base64(cleanXml);
    const keyInfoDigest = sha1Base64(keyInfoXml);
    const signedPropertiesDigest = sha1Base64(signedPropertiesXml);

    // 6. Construir ds:SignedInfo
    const signedInfoXml = `<ds:SignedInfo Id="SignedInfo-${sigId}">` +
      `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
      `<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
      `<ds:Reference Id="${signedInfoRefId}" URI="#comprobante">` +
        `<ds:Transforms>` +
          `<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
        `</ds:Transforms>` +
        `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
        `<ds:DigestValue>${documentDigest}</ds:DigestValue>` +
      `</ds:Reference>` +
      `<ds:Reference URI="#${keyInfoId}">` +
        `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
        `<ds:DigestValue>${keyInfoDigest}</ds:DigestValue>` +
      `</ds:Reference>` +
      `<ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#${signedPropertiesId}">` +
        `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
        `<ds:DigestValue>${signedPropertiesDigest}</ds:DigestValue>` +
      `</ds:Reference>` +
    `</ds:SignedInfo>`;

    // 7. Firmar el ds:SignedInfo
    const rsa = privateKey;
    const md = forge.md.sha1.create();
    md.update(signedInfoXml, 'utf8');
    const signatureBytes = rsa.sign(md);
    const signatureBase64 = forge.util.encode64(signatureBytes).replace(/\r?\n|\r/g, "");

    // 8. Ensamblar ds:Signature
    const signatureXml = `<ds:Signature Id="${sigId}" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
      signedInfoXml +
      `<ds:SignatureValue Id="${sigValueId}">${signatureBase64}</ds:SignatureValue>` +
      keyInfoXml +
      `<ds:Object>` +
        `<xades:QualifyingProperties Target="#${sigId}" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" xmlns:xades141="http://uri.etsi.org/01903/v1.4.1#">` +
          signedPropertiesXml +
        `</xades:QualifyingProperties>` +
      `</ds:Object>` +
    `</ds:Signature>`;

    // 9. Insertar la firma en el XML (debe ir antes del cierre del nodo raíz)
    // El nodo raíz cierra con </factura>, </comprobanteRetencion>, etc.
    const lastClosingTagIndex = cleanXml.lastIndexOf("</");
    if (lastClosingTagIndex === -1) {
      throw new Error("No se pudo encontrar el tag de cierre del XML original.");
    }

    const signedDocument = xmlHeader + "\n" +
      cleanXml.substring(0, lastClosingTagIndex) +
      signatureXml +
      cleanXml.substring(lastClosingTagIndex);

    return signedDocument;
  } catch (err) {
    console.error("Error en firmarComprobanteXML:", err);
    throw new Error(`Fallo de Firma Electrónica: ${err.message}`);
  }
}
