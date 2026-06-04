/**
 * Servicio de Inteligencia Artificial con Gemini
 * Permite OCR de facturas (PDF/Imágenes), extracción de campos y Chatbot Contable.
 */

// Obtener la clave API desde las configuraciones o variables de entorno
function getApiKey() {
  const localKey = localStorage.getItem('finances_gemini_api_key');
  return localKey || import.meta.env.VITE_GEMINI_API_KEY || '';
}

// Convertir un archivo en base64 legible para Gemini
function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Parseador de XML nativo para evitar llamadas innecesarias a Gemini en archivos XML
export function parsearXMLComprobante(xmlText) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Buscar RUC emisor (proveedor si es egreso)
    const ruc = xmlDoc.getElementsByTagName("ruc")[0]?.textContent || "";
    const razonSocial = xmlDoc.getElementsByTagName("razonSocial")[0]?.textContent || "";
    const correo = xmlDoc.getElementsByTagName("correoElectronico")[0]?.textContent || 
                   xmlDoc.getElementsByTagName("email")[0]?.textContent || "";
    const telefono = xmlDoc.getElementsByTagName("telefono")[0]?.textContent || "";

    // Número de comprobante: estab - ptoEmi - secuencial
    const estab = xmlDoc.getElementsByTagName("estab")[0]?.textContent || "001";
    const ptoEmi = xmlDoc.getElementsByTagName("ptoEmi")[0]?.textContent || "001";
    const secuencial = xmlDoc.getElementsByTagName("secuencial")[0]?.textContent || "";
    const documentNumber = secuencial ? `${estab}-${ptoEmi}-${secuencial}` : "";

    // Fecha
    const fechaEmisionRaw = xmlDoc.getElementsByTagName("fechaEmision")[0]?.textContent || "";
    let date = new Date().toISOString().split('T')[0];
    if (fechaEmisionRaw) {
      const partes = fechaEmisionRaw.split('/');
      if (partes.length === 3) {
        date = `${partes[2]}-${partes[1]}-${partes[0]}`; // YYYY-MM-DD
      }
    }

    // Totales
    const baseImponible = parseFloat(xmlDoc.getElementsByTagName("totalSinImpuestos")[0]?.textContent || "0");
    const total = parseFloat(xmlDoc.getElementsByTagName("importeTotal")[0]?.textContent || "0");
    const ivaValor = parseFloat(xmlDoc.getElementsByTagName("valor")[0]?.textContent || (total - baseImponible).toFixed(2));

    // Determinar categoría recomendada
    let category = "otros";
    const razonSocialLower = razonSocial.toLowerCase();
    if (razonSocialLower.includes("movistar") || razonSocialLower.includes("claro") || razonSocialLower.includes("cnt") || razonSocialLower.includes("netlife")) {
      category = "gastos_administrativos";
    } else if (razonSocialLower.includes("supermaxi") || razonSocialLower.includes("comisariato") || razonSocialLower.includes("restaurante") || razonSocialLower.includes("alimentos")) {
      category = "gastos_administrativos";
    } else if (razonSocialLower.includes("facebook") || razonSocialLower.includes("google") || razonSocialLower.includes("hosting") || razonSocialLower.includes("aws")) {
      category = "gastos_marketing";
    } else if (razonSocialLower.includes("sri") || razonSocialLower.includes("municipio") || razonSocialLower.includes("notaria")) {
      category = "gastos_administrativos";
    }

    return {
      success: true,
      data: {
        ruc,
        razonSocial,
        documentNumber,
        date,
        baseImponible,
        ivaPorcentaje: 15, // Por defecto SRI actual
        ivaValor,
        retencionFuente: 0,
        retencionIva: 0,
        total,
        paymentMethod: "transferencia",
        category,
        email: correo,
        phone: telefono
      }
    };
  } catch (err) {
    console.error("Error al parsear XML nativo", err);
    return { success: false, error: err.message };
  }
}

// Analizar archivo PDF o Imagen con Gemini 1.5 Flash
export async function analizarComprobanteConGemini(file) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No se ha configurado la clave API de Gemini. Por favor configúrala en Ajustes.");
  }

  const generativePart = await fileToGenerativePart(file);
  const prompt = `Actúa como un extractor de datos de facturas del SRI de Ecuador.
Analiza la imagen o PDF adjunto y extrae los siguientes datos en formato JSON estricto.
Esquema de salida JSON esperado:
{
  "ruc": "Número de RUC o CI del emisor (10 o 13 dígitos)",
  "razonSocial": "Razón Social o Nombre del Emisor",
  "documentNumber": "Número de documento en formato 000-000-000000000",
  "date": "Fecha de emisión en formato YYYY-MM-DD",
  "baseImponible": Subtotal sin impuestos (número flotante),
  "ivaValor": Valor del IVA cobrado (número flotante),
  "total": Total facturado (número flotante),
  "paymentMethod": "Forma de pago ('transferencia', 'efectivo', o 'tarjeta')",
  "category": "Categoría de gasto sugerida entre: 'costos' (operaciones), 'gastos_administrativos' (servicios básicos, arriendos, suministros, comida), 'gastos_marketing' (publicidad, hosting, dominios), 'activos' (laptops, oficinas, muebles), o 'otros'",
  "email": "Correo electrónico del emisor si existe",
  "phone": "Teléfono del emisor si existe"
}
Devuelve únicamente el código JSON, sin decoradores markdown ni bloques de código (no uses triple backticks ni la palabra json).`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          generativePart.inlineData,
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || "Error al conectar con la API de Gemini");
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  try {
    const cleanedText = text.trim();
    const data = JSON.parse(cleanedText);
    return data;
  } catch (err) {
    console.error("Error al decodificar respuesta JSON de Gemini", text, err);
    throw new Error("La respuesta de la IA no tiene el formato JSON esperado. Intente subir el archivo nuevamente.");
  }
}

// Chatbot Contable Asistente
export async function chatearConAsistenteContable(mensaje, historial, transactions, thirdParties) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No se ha configurado la clave API de Gemini. Configúrala en Ajustes.");
  }

  const contextData = {
    totalComprobantes: transactions.length,
    tercerosRegistrados: thirdParties.length,
    comprobantesResumen: transactions.slice(0, 50).map(t => ({
      fecha: t.date,
      tipo: t.type,
      documento: t.documentNumber,
      total: t.total,
      categoria: t.category,
      sriStatus: t.sriStatus,
      contacto: thirdParties.find(tp => tp.id === t.thirdPartyId)?.name || 'Desconocido'
    }))
  };

  const systemPrompt = `Eres un Asistente Contable Inteligente de alta fidelidad, integrado en el ERP de control de ingresos y egresos de la empresa.
Tu objetivo es responder las dudas financieras del usuario de forma clara, directa y estructurada en formato markdown.
Tienes acceso al contexto financiero actual de la empresa en el siguiente objeto JSON:
${JSON.stringify(contextData)}

Por favor, utiliza estos datos reales para responder preguntas como sumas, filtros, promedios, listados de proveedores o alertas. Si el usuario te pregunta por datos que no están aquí, infórmale cordialmente. Mantén tus respuestas profesionales y en idioma español.`;

  // Construir historial en formato Gemini
  const contents = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }]
    },
    {
      role: 'model',
      parts: [{ text: "Entendido. Estoy listo para asistirte con la información contable y tributaria de tu empresa." }]
    }
  ];

  // Agregar historial de mensajes previos
  historial.forEach(msg => {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  });

  // Agregar el mensaje actual del usuario
  contents.push({
    role: 'user',
    parts: [{ text: mensaje }]
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contents })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || "Error al conectar con la API de Gemini");
  }

  const result = await response.json();
  const reply = result.candidates?.[0]?.content?.parts?.[0]?.text || "No obtuve respuesta de la IA.";
  return reply;
}

// Analizar el contexto consolidado del ERP (Proyectos, Tareas, Inventario, Finanzas, Clientes)
export async function analizarERPContextoConGemini(projects, tasks, products, transactions, thirdParties) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No se ha configurado la clave API de Gemini. Por favor configúrala en Ajustes.");
  }

  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status !== 'done').length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  
  // Productos en bajo stock (stock <= minStock)
  const lowStockProducts = products.filter(p => p.type === 'producto' && Number(p.stock) <= Number(p.minStock)).map(p => ({
    name: p.name,
    sku: p.sku,
    stock: p.stock,
    minStock: p.minStock
  }));

  // Resumen Financiero
  let totalIncome = 0;
  let totalExpense = 0;
  let outstandingCollections = 0; // Cuentas por cobrar
  
  transactions.forEach(t => {
    const val = Number(t.total) || 0;
    if (t.type === 'ingreso') {
      totalIncome += val;
      if (t.paymentStatus === 'pendiente') {
        outstandingCollections += val;
      }
    } else if (t.type === 'egreso') {
      totalExpense += val;
    }
  });

  const contextData = {
    proyectos: {
      total: totalProjects,
      tareasTotales: totalTasks,
      tareasPendientes: pendingTasks,
      tareasCompletadas: completedTasks
    },
    inventario: {
      totalItems: products.length,
      bajoStock: lowStockProducts
    },
    finanzas: {
      ingresosTotales: totalIncome.toFixed(2),
      egresosTotales: totalExpense.toFixed(2),
      cuentasPorCobrar: outstandingCollections.toFixed(2),
      balanceNeto: (totalIncome - totalExpense).toFixed(2)
    }
  };

  const prompt = `Eres un Consultor Estratégico de Negocios y Asesor de IA (AI ERP Advisor) de nivel premium integrado en el ERP de la empresa.
Analiza la siguiente información consolidada de la empresa (Proyectos, Tareas, Inventario y Finanzas) y genera un diagnóstico estratégico e informe ejecutivo:
${JSON.stringify(contextData)}

Por favor, elabora un informe en español que sea profesional, motivador y directo al punto.
Usa formato de Markdown claro con viñetas y emojis.
El informe debe incluir:
1. **Análisis de Estado**: Resumen rápido de la salud del negocio (proyectos y finanzas).
2. **Alertas Críticas**: Llama la atención sobre productos específicos que estén con stock crítico y requieran reposición inmediata, o tareas pendientes acumuladas, o deudas/cobros importantes de clientes que comprometan la liquidez.
3. **Recomendaciones de Acción**: Sugerencias claras y concretas de negocio para mejorar el flujo de caja, la rotación de inventarios o la agilidad de los proyectos.

Mantén el informe conciso y accionable.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || "Error al conectar con la API de Gemini");
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || "No obtuve respuesta de la IA.";
}

// Analizar texto copiado de una factura digital con Gemini 1.5 Flash
export async function analizarTextoFacturaConGemini(texto) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No se ha configurado la clave API de Gemini. Por favor configúrala en Ajustes.");
  }

  const prompt = `Actúa como un extractor de datos de facturas del SRI de Ecuador a partir del siguiente texto copiado de una factura digital o física:
"${texto}"

Analiza el texto y extrae los siguientes datos en formato JSON estricto:
{
  "ruc": "Número de RUC o CI del emisor (10 o 13 dígitos)",
  "razonSocial": "Razón Social o Nombre del Emisor",
  "documentNumber": "Número de documento en formato 000-000-000000000",
  "date": "Fecha de emisión en formato YYYY-MM-DD",
  "baseImponible": Subtotal sin impuestos (número flotante),
  "ivaValor": Valor del IVA cobrado (número flotante),
  "total": Total facturado (número flotante),
  "paymentMethod": "Forma de pago ('transferencia', 'efectivo', o 'tarjeta')",
  "category": "Categoría de gasto sugerida entre: 'costos' (operaciones), 'gastos_administrativos' (servicios básicos, arriendos, suministros, comida), 'gastos_marketing' (publicidad, hosting, dominios), 'activos' (laptops, oficinas, muebles), o 'otros'",
  "email": "Correo electrónico del emisor si existe",
  "phone": "Teléfono del emisor si existe"
}

Devuelve únicamente el código JSON, sin decoradores markdown ni bloques de código (no uses triple backticks ni la palabra json).`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || "Error al conectar con la API de Gemini");
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  try {
    const cleanedText = text.trim();
    const data = JSON.parse(cleanedText);
    return data;
  } catch (err) {
    console.error("Error al decodificar respuesta JSON de Gemini", text, err);
    throw new Error("La respuesta de la IA no tiene el formato JSON esperado. Intente reescribir o pegar con más claridad.");
  }
}

