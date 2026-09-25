import { consultarAutorizacionSRI } from './sriService.js';
import { saveSriResult } from './sriEmission.js';
import { notifyAuthorizedInvoice } from './invoiceNotification.js';

export function getDocumentTypeName(docType) {
  switch (docType) {
    case 'factura':
      return 'Factura';
    case 'retencion':
    case 'comprobante_retencion':
      return 'Retención';
    case 'nota_credito':
      return 'Nota de Crédito';
    case 'nota_debito':
      return 'Nota de Débito';
    case 'guia_remision':
      return 'Guía de Remisión';
    case 'liquidacion':
    case 'liquidacion_compra':
      return 'Liquidación de Compra';
    case 'nota_venta':
      return 'Nota de Venta';
    default:
      return 'Comprobante';
  }
}

/**
 * Reconcilia de manera atómica e idempotente un documento individual contra el SRI.
 * Valida la clave de acceso de 49 dígitos, consulta el WebService SOAP offline,
 * y en caso de éxito guarda el XML autorizado y dispara las notificaciones por correo.
 */
export async function reconcileSriDocument({
  db,
  appId,
  document,
  api,
  consultSri = consultarAutorizacionSRI,
  notify = notifyAuthorizedInvoice,
}) {
  if (!document?.claveAcceso || !/^\d{49}$/.test(document.claveAcceso)) {
    return {
      success: false,
      status: 'error_clave',
      message: 'El documento no posee una clave de acceso fiscal válida de 49 dígitos.',
      document
    };
  }

  const ambiente = document.sriAmbiente || document.claveAcceso[23] || '1';
  let sriResult;

  try {
    sriResult = await consultSri(document.claveAcceso, ambiente);
  } catch (consultErr) {
    return {
      success: false,
      status: 'error_conexion',
      message: consultErr.message || 'Error conectando con el WebService del SRI.',
      document
    };
  }

  if (sriResult.status === 'autorizado') {
    const saved = await saveSriResult({ db, appId, document, result: sriResult, api });
    
    // Notificación por correo electrónico si está configurado
    let notificationResult = null;
    if (notify) {
      try {
        const customer = saved.thirdParty || {};
        notificationResult = await notify({
          db,
          appId,
          document: saved,
          customer,
          api
        });
      } catch (emailErr) {
        console.warn(`[sriReconciliation] Notificación por correo falló para ${saved.documentNumber}:`, emailErr.message);
      }
    }

    return {
      success: true,
      status: 'autorizado',
      document: saved,
      result: sriResult,
      notification: notificationResult,
      message: `Comprobante ${saved.documentNumber || saved.claveAcceso} AUTORIZADO exitosamente por el SRI.`
    };
  } else if (sriResult.status === 'no_autorizado' || sriResult.status === 'devuelto') {
    const saved = await saveSriResult({ db, appId, document, result: sriResult, api });
    return {
      success: false,
      status: sriResult.status,
      document: saved,
      result: sriResult,
      message: sriResult.message || `Comprobante ${sriResult.status} por el SRI.`
    };
  } else {
    // Sigue pendiente en el SRI (en procesamiento)
    return {
      success: false,
      status: 'pendiente_sri',
      document,
      result: sriResult,
      message: sriResult.message || 'El comprobante continúa en procesamiento en el SRI.'
    };
  }
}

/**
 * Reconciliación en lote multi-tenant con throttle preventivo para no sobrecargar el WSDL del SRI.
 */
export async function batchReconcileSriDocuments({
  db,
  documents = [],
  api,
  consultSri = consultarAutorizacionSRI,
  notify = notifyAuthorizedInvoice,
  onProgress,
  delayMs = 400
}) {
  const stats = {
    total: documents.length,
    processed: 0,
    authorized: 0,
    stillPending: 0,
    failed: 0,
    errors: [],
    results: []
  };

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const appId = doc.tenantId || doc.appId;

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: documents.length,
        currentDoc: doc,
        stats: { ...stats }
      });
    }

    try {
      const res = await reconcileSriDocument({
        db,
        appId,
        document: doc,
        api,
        consultSri,
        notify
      });

      stats.results.push({ id: doc.id, claveAcceso: doc.claveAcceso, tenantId: appId, ...res });

      if (res.status === 'autorizado') {
        stats.authorized++;
      } else if (res.status === 'pendiente_sri') {
        stats.stillPending++;
      } else {
        stats.failed++;
      }
    } catch (err) {
      stats.failed++;
      stats.errors.push({ id: doc.id, documentNumber: doc.documentNumber, error: err.message });
    }

    stats.processed++;

    if (i < documents.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  if (onProgress) {
    onProgress({
      current: documents.length,
      total: documents.length,
      currentDoc: null,
      stats: { ...stats }
    });
  }

  return stats;
}

/**
 * Escanea de forma paralela/controlada todas las colecciones de transacciones
 * de los inquilinos proporcionados en busca de documentos con sriStatus === 'pendiente_sri'.
 */
export async function scanAllTenantsPendingSri({ db, tenants = [], api }) {
  const pendingDocs = [];
  const affectedTenantIds = new Set();

  await Promise.all(
    tenants.map(async (tenant) => {
      const tenantId = tenant.id;
      if (!tenantId) return;

      try {
        const transRef = api.collection(db, 'artifacts', tenantId, 'public', 'data', 'finances_transactions');
        const q = api.query(transRef, api.where('sriStatus', '==', 'pendiente_sri'));
        const snap = await api.getDocs(q);

        if (snap && snap.docs) {
          snap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.claveAcceso) {
              affectedTenantIds.add(tenantId);
              pendingDocs.push({
                ...data,
                id: docSnap.id,
                tenantId,
                tenantName: tenant.companyName || tenant.name || tenantId
              });
            }
          });
        }
      } catch (err) {
        console.warn(`[sriReconciliation] No se pudo escanear tenant ${tenantId}:`, err.message);
      }
    })
  );

  // Ordenar por fecha descendente
  pendingDocs.sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  return {
    pendingDocs,
    affectedTenantCount: affectedTenantIds.size,
    totalPendingCount: pendingDocs.length
  };
}
