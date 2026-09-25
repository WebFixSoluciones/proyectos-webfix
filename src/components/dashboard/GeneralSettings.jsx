import { useState, useEffect } from 'react';
import { 
  Sparkles, Users, Shield, 
  Save, Download, CheckCircle2, AlertTriangle, Mail, 
  Phone, Building, ShoppingCart, ShoppingBag, DollarSign, Package, Calendar, 
  Plus, Trash2, LayoutDashboard, ToggleLeft, ToggleRight,
  CreditCard, Award, UploadCloud, X, Lock, RefreshCw, FileText,
  AlertCircle, CheckCircle, Send
} from 'lucide-react';
import { doc, setDoc, getDoc } from'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from'firebase/storage';
import forge from'node-forge';
import { consultarRucSri } from'../../services/sriService';
import FinanceSettings from'../finances/FinanceSettings';
import SriRecoveryPanel from '../finances/SriRecoveryPanel';

export default function GeneralSettings({ 
 showToast, db, appId, storage,
  users = [], // eslint-disable-next-line no-unused-vars
  trash = [], handleDownloadBackup, 
 googleClientId, setGoogleClientId, 
 activeModules = {}, setActiveModules
}) {
 const [activeSubTab, setActiveSubTab] = useState('profile');
 
 // States for Company Profile
 const [companyProfile, setCompanyProfile] = useState({
 razonSocial:'',
 nombreComercial:'',
 ruc:'',
 direccionMatriz:'',
 telefono:'',
 email:'',
 web:'',
 rucActivo: true,
 rucEstado:'ACTIVO',
 rucRegimen:'RIMPE Emprendedor',
 obligadoContabilidad: false,
 contribuyenteTipo:'rimpe_emprendedor',
 sucursales: [
 { codigo:'001', nombre:'Casa Matriz', direccion:'Av. de los Shyris y Naciones Unidas, Quito', activa: true, bodegas: ['Bodega Central'] }
 ],
 bodegas: ['Bodega Central'],
 agenteRetencion: false,
 agenteResolucion:'',
 contribuyenteEspecial: false,
 especialResolucion:'',
 certificadoCargado: false,
 certificadoNombre:'',
 certificadoClave:'',
 certificadoVence:'',
 certificadoBase64:'',
 certificadoRuc:'',
 certificadoSujeto:'',
 logoUrl:'',
 smtpHost:'',
 smtpPort:'',
 smtpUser:'',
 smtpPass:'',
 smtpSecure: false,
 smtpActivo: true
 });

 const [isExtractingSRI, setIsExtractingSRI] = useState(false);
 const [newWarehouseName, setNewWarehouseName] = useState('');
 const [isUploadingLogo, setIsUploadingLogo] = useState(false);
 const [isTestingSmtp, setIsTestingSmtp] = useState(false);
 const [smtpTestResult, setSmtpTestResult] = useState(null);

 // States for signature configuration
 const [isFirmaOpen, setIsFirmaOpen] = useState(false);
 const [certValidation, setCertValidation] = useState({
 verificado: false,
 mensaje:'Cargue su firma electrónica (.p12 / .pfx) e ingrese la contraseña para verificarla.',
 tipo:'info',
 sujeto:'',
 emisor:'',
 vence:'',
 ruc:''
 });

 const [tempFirma, setTempFirma] = useState({
 certificadoCargado: false,
 certificadoNombre:'',
 certificadoClave:'',
 certificadoVence:'',
 certificadoBase64:''
 });

 // States for User Management
 const [localUsers, setLocalUsers] = useState(users);
 const [newUser, setNewUser] = useState({ name:'', role:'Miembro', job:'', email:'' });

 // Load configuration on mount
 useEffect(() => {
    if (!appId || !db) return;
    async function loadConfig() {
      try {
        const docRef = doc(db,'artifacts', appId,'public','data','meta','info');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.users) {
            setLocalUsers(data.users);
          }
        }

        const finRef = doc(db,'artifacts', appId,'public','data','finances_settings','config');
        const finSnap = await getDoc(finRef);
        if (finSnap.exists()) {
          const finData = finSnap.data();
          setCompanyProfile(prev => ({
            ...prev,
            razonSocial: finData.razonSocial ||'',
            nombreComercial: finData.nombreComercial ||'',
            ruc: finData.ruc ||'',
            direccionMatriz: finData.direccionMatriz ||'',
            telefono: finData.telefonoContacto || finData.telefono ||'',
            email: finData.correoContacto || finData.email ||'',
            web: finData.web ||'',
            rucActivo: finData.rucActivo !== false,
            rucEstado: finData.rucEstado ||'ACTIVO',
            rucRegimen: finData.rucRegimen ||'RIMPE Emprendedor',
            obligadoContabilidad: finData.obligadoContabilidad || false,
            contribuyenteTipo: finData.contribuyenteTipo ||'rimpe_emprendedor',
            sucursales: finData.sucursales || [
              { codigo:'001', nombre:'Casa Matriz', direccion: finData.direccionMatriz ||'Av. de los Shyris y Naciones Unidas, Quito', activa: true, bodegas: ['Bodega Central'] }
            ],
            bodegas: finData.bodegas || ['Bodega Central'],
            agenteRetencion: finData.agenteRetencion || false,
            agenteResolucion: finData.agenteResolucion ||'',
            contribuyenteEspecial: finData.contribuyenteEspecial || false,
            especialResolucion: finData.especialResolucion ||'',
            certificadoCargado: finData.certificadoCargado || false,
            certificadoNombre: finData.certificadoNombre ||'',
            certificadoClave: finData.certificadoClave ||'',
            certificadoVence: finData.certificadoVence ||'',
            certificadoBase64: finData.certificadoBase64 ||'',
            certificadoRuc: finData.certificadoRuc ||'',
            certificadoSujeto: finData.certificadoSujeto ||'',
            logoUrl: finData.logoUrl ||'',
            smtpHost: finData.smtpHost ||'',
            smtpPort: finData.smtpPort ||'',
            smtpUser: finData.smtpUser ||'',
            smtpPass: finData.smtpPass ||'',
            smtpSecure: finData.smtpSecure || false,
            smtpActivo: finData.smtpActivo !== false
          }));
        } else if (snap.exists() && snap.data().companyProfile) {
          const cp = snap.data().companyProfile;
          setCompanyProfile(prev => ({
            ...prev,
            ...cp,
            rucActivo: cp.rucActivo !== false,
            rucEstado: cp.rucEstado ||'ACTIVO',
            rucRegimen: cp.rucRegimen ||'RIMPE Emprendedor',
            sucursales: cp.sucursales || [
              { codigo:'001', nombre:'Casa Matriz', direccion: cp.direccionMatriz ||'Av. de los Shyris y Naciones Unidas, Quito', activa: true, bodegas: ['Bodega Central'] }
            ],
            bodegas: cp.bodegas || ['Bodega Central'],
            certificadoCargado: cp.certificadoCargado || false,
            certificadoNombre: cp.certificadoNombre ||'',
            certificadoClave: cp.certificadoClave ||'',
            certificadoVence: cp.certificadoVence ||'',
            certificadoBase64: cp.certificadoBase64 ||'',
            certificadoRuc: cp.certificadoRuc ||'',
            certificadoSujeto: cp.certificadoSujeto ||'',
            logoUrl: cp.logoUrl ||'',
            smtpHost: cp.smtpHost ||'',
            smtpPort: cp.smtpPort ||'',
            smtpUser: cp.smtpUser ||'',
            smtpPass: cp.smtpPass ||'',
            smtpSecure: cp.smtpSecure || false,
            smtpActivo: cp.smtpActivo !== false
          }));
        }
      } catch (err) {
        console.error("Error al cargar configuración general", err);
      }
    }
    loadConfig();
  }, [appId, db]);

  // Sync users prop with local state
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setLocalUsers(users);
  }, [users]);

  // Sync tempFirma when modal opens
  useEffect(() => {
  if (isFirmaOpen) {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setTempFirma({
  certificadoCargado: companyProfile.certificadoCargado || false,
  certificadoNombre: companyProfile.certificadoNombre ||'',
  certificadoClave: companyProfile.certificadoClave ||'',
  certificadoVence: companyProfile.certificadoVence ||'',
  certificadoBase64: companyProfile.certificadoBase64 ||''
  });
  if (companyProfile.certificadoCargado && companyProfile.certificadoBase64 && companyProfile.certificadoClave) {
  setTimeout(() => {
  verifySignatureDetails(companyProfile.certificadoBase64, companyProfile.certificadoClave, companyProfile.ruc ||'');
  }, 100);
  } else {
  setCertValidation({
  verificado: false,
  mensaje:'Cargue su firma electrónica (.p12 / .pfx) e ingrese la contraseña para verificarla.',
  tipo:'info',
  sujeto:'',
  emisor:'',
  vence:'',
  ruc:''
  });
  }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirmaOpen, companyProfile]);

 // Extract from SRI Service
 const handleSRIExtraction = async () => {
 if (!companyProfile.ruc || companyProfile.ruc.length !== 13) {
 showToast("El RUC debe tener exactamente 13 dígitos","error");
 return;
 }
 setIsExtractingSRI(true);
 showToast("Consultando RUC en el Servicio de Rentas Internas (SRI)...","info");

 try {
 const data = await consultarRucSri(companyProfile.ruc);
 setIsExtractingSRI(false);

 if (data.rucActivo === false || data.rucEstado ==='SUSPENDIDO / INACTIVO') {
 setCompanyProfile(prev => ({
 ...prev,
 razonSocial: data.razonSocial || data.name,
 nombreComercial: data.nombreComercial || data.name,
 direccionMatriz: data.direccion,
 rucActivo: false,
 rucEstado:'SUSPENDIDO / INACTIVO',
 rucRegimen:'Régimen General',
 obligadoContabilidad: true,
 contribuyenteTipo:'general',
 sucursales: [
 { codigo:'001', nombre: data.nombreComercial || data.name, direccion: data.direccion, activa: false, bodegas: ['Bodega Central'] }
 ],
 bodegas: ['Bodega Central'],
 agenteRetencion: false,
 agenteResolucion:'',
 contribuyenteEspecial: false,
 especialResolucion:''
 }));
 showToast("RUC INACTIVO / SUSPENDIDO en el SRI. Facturación electrónica bloqueada.","warning");
 } else {
 const razonSocial = data.razonSocial || data.name;
 const nombreComercial = data.nombreComercial || data.name;
 const direccionMatriz = data.direccion;
 
 let regimen ='Régimen General';
 if (data.tipoContribuyente ==='rimpe_emprendedor') regimen ='RIMPE Emprendedor';
 else if (data.tipoContribuyente ==='rimpe_popular') regimen ='RIMPE Popular';
 else if (data.tipoContribuyente ==='microempresas') regimen ='Microempresas';
 else if (data.tipoContribuyente ==='general') regimen ='Régimen General';

 const obligado = data.obligadoContabilidad || false;
 const agenteRet = data.agenteRetencion || false;
 const agenteRes = data.agenteResolucion ||'';
 const contEsp = data.contribuyenteEspecial || false;
 const espRes = data.especialResolucion ||'';

 // Usar los establecimientos que devuelve la API directamente
 const sucursales = (data.establecimientos && data.establecimientos.length > 0) 
 ? data.establecimientos
 : [{ codigo:'001', nombre: nombreComercial, direccion: direccionMatriz, activa: true, bodegas: ['Bodega Central'] }];

 setCompanyProfile(prev => ({
 ...prev,
 razonSocial,
 nombreComercial,
 direccionMatriz,
 rucActivo: data.rucActivo !== false,
 rucEstado: data.rucEstado ||'ACTIVO',
 rucRegimen: regimen,
 obligadoContabilidad: obligado,
 contribuyenteTipo: data.tipoContribuyente ||'general',
 sucursales,
 bodegas: prev.bodegas && prev.bodegas.length > 0 ? prev.bodegas : ['Bodega Central'],
 agenteRetencion: agenteRet,
 agenteResolucion: agenteRes,
 contribuyenteEspecial: contEsp,
 especialResolucion: espRes
 }));
 showToast(`RUC ${data.rucEstado ||'ACTIVO'} en el SRI. Datos de"${razonSocial}" cargados correctamente.`,"success");
 }
 } catch (err) {
 setIsExtractingSRI(false);
 console.error("Error al consultar SRI:", err);
 const errorMsg = err.message ||"Error al consultar RUC en el SRI";
 showToast(errorMsg,"error");
 }
 };

 const getPersonaTipoStr = (rucVal) => {
 if (!rucVal || rucVal.length < 3) return'';
 const thirdDigit = parseInt(rucVal.charAt(2), 10);
 return thirdDigit < 6 ?'Persona Natural' :'Persona Jurídica';
 };

 const cleanStringForComparison = (str) => {
 if (!str) return'';
 return str
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g,"") // Quitar acentos
 .replace(/[^a-z0-9\s]/g,"") // Quitar caracteres especiales
 .trim();
 };

 const checkNameMatch = (name1, name2) => {
 const clean1 = cleanStringForComparison(name1);
 const clean2 = cleanStringForComparison(name2);
 if (!clean1 || !clean2) return false;
 
 if (clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1)) {
 return true;
 }
 
 const ignoreWords = new Set(['sa','cia','ltda','sas','de','la','los','y','e','el','un','una','en','con','del']);
 const words1 = clean1.split(/\s+/).filter(w => w.length > 2 && !ignoreWords.has(w));
 const words2 = clean2.split(/\s+/).filter(w => w.length > 2 && !ignoreWords.has(w));
 
 if (words1.length === 0 || words2.length === 0) return false;
 
 const intersection = words1.filter(w => words2.includes(w));
 
 // Si coinciden al menos 2 palabras significativas, es válido
 if (intersection.length >= 2) {
 return true;
 }
 
 // Si solo hay una palabra en alguna de las listas y coincide
 if (intersection.length === 1 && (words1.length === 1 || words2.length === 1)) {
 return true;
 }
 
 return false;
 };

 const isFirmaMatch = () => {
 if (!companyProfile.certificadoCargado) return true;
 if (!companyProfile.ruc) return false;
 
 const compRuc = String(companyProfile.ruc).trim();
 const certRuc = String(companyProfile.certificadoRuc ||'').trim();
 
 // 1. Coincidencia por RUC/CI (primeros 10 dígitos)
 if (compRuc.length >= 10 && certRuc.length >= 10) {
 if (compRuc.substring(0, 10) === certRuc.substring(0, 10)) {
 return true;
 }
 }
 
 // 2. Coincidencia lógica por Razón Social / Nombre Comercial vs Nombre del Certificado
 const certSujeto = String(companyProfile.certificadoSujeto ||'').trim();
 const compRazon = String(companyProfile.razonSocial ||'').trim();
 const compComercial = String(companyProfile.nombreComercial ||'').trim();
 
 if (certSujeto) {
 if (checkNameMatch(compRazon, certSujeto)) return true;
 if (checkNameMatch(compComercial, certSujeto)) return true;
 }
 
 return false;
 };

 const compressImage = (base64Str, maxWidth = 500, maxHeight = 500) => {
 return new Promise((resolve) => {
 const img = new Image();
 img.src = base64Str;
 img.onload = () => {
 let width = img.width;
 let height = img.height;
 
 if (width > maxWidth || height > maxHeight) {
 if (width > height) {
 height = Math.round((height * maxWidth) / width);
 width = maxWidth;
 } else {
 width = Math.round((width * maxHeight) / height);
 height = maxHeight;
 }
 }
 
 const canvas = document.createElement('canvas');
 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 if (ctx) {
 ctx.drawImage(img, 0, 0, width, height);
 const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
 resolve(compressedDataUrl);
 } else {
 resolve(base64Str);
 }
 };
 img.onerror = () => {
 resolve(base64Str);
 };
 });
 };

 const handleLogoUpload = async (e) => {
 const file = e.target.files[0];
 if (!file) return;

 if (!file.type.startsWith('image/')) {
 showToast("El archivo debe ser una imagen","error");
 return;
 }

 setIsUploadingLogo(true);
 
 const reader = new FileReader();
 reader.onload = async (event) => {
 const rawBase64 = event.target.result;
 
 let finalBase64 = rawBase64;
 if (file.type !=='image/svg+xml' && file.size > 300 * 1024) {
 try {
 finalBase64 = await compressImage(rawBase64);
 } catch (compressErr) {
 console.warn("Error compressing image:", compressErr);
 }
 }
 
 try {
 const extension = file.name.split('.').pop();
 const path =`artifacts/${appId}/finances/logo_${new Date().getTime()}.${extension}`;
 
 let logoUrl = finalBase64;
 if (storage) {
 const storageRef = ref(storage, path);
 const uploadTask = await uploadBytesResumable(storageRef, file);
 logoUrl = await getDownloadURL(uploadTask.ref);
 }
 
 setCompanyProfile(prev => {
 const updated = { ...prev, logoUrl };
 
 // Auto-save RUC logo to config
 const configRef = doc(db,'artifacts', appId,'public','data','finances_settings','config');
 setDoc(configRef, { logoUrl }, { merge: true }).catch(console.error);
 
 const infoRef = doc(db,'artifacts', appId,'public','data','meta','info');
 setDoc(infoRef, { companyProfile: { ...prev, logoUrl } }, { merge: true }).catch(console.error);
 
 return updated;
 });
 showToast("Logotipo cargado y guardado exitosamente","success");
 } catch (err) {
 console.warn("Storage upload failed, using fallback:", err);
 setCompanyProfile(prev => {
 const updated = { ...prev, logoUrl: finalBase64 };
 
 const configRef = doc(db,'artifacts', appId,'public','data','finances_settings','config');
 setDoc(configRef, { logoUrl: finalBase64 }, { merge: true }).catch(console.error);
 
 const infoRef = doc(db,'artifacts', appId,'public','data','meta','info');
 setDoc(infoRef, { companyProfile: { ...prev, logoUrl: finalBase64 } }, { merge: true }).catch(console.error);
 
 return updated;
 });
 showToast("Logotipo cargado y guardado localmente (Base64)","success");
 } finally {
 setIsUploadingLogo(false);
 }
 };
 reader.onerror = () => {
 showToast("Error al leer el archivo de imagen","error");
 setIsUploadingLogo(false);
 };
 reader.readAsDataURL(file);
 };

 const handleRemoveLogo = () => {
 setCompanyProfile(prev => ({
 ...prev,
 logoUrl:''
 }));
 showToast("Logo removido. Guarde los cambios para confirmar.","info");
 };

  const handleTestSmtp = async () => {
    if (!companyProfile.smtpHost || !companyProfile.smtpUser || !companyProfile.smtpPass) {
      showToast("Completa Servidor, Usuario y Contraseña SMTP antes de probar.", "warning");
      return;
    }
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: companyProfile.smtpHost,
          smtpPort: companyProfile.smtpPort || (companyProfile.smtpSecure ? 465 : 587),
          smtpUser: companyProfile.smtpUser,
          smtpPass: companyProfile.smtpPass,
          smtpSecure: companyProfile.smtpSecure,
          emitterEmail: companyProfile.smtpUser,
          to: companyProfile.smtpUser,
          companyName: companyProfile.nombreComercial || companyProfile.razonSocial || 'Mi Empresa',
          isTest: true
        })
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = { error: `Servidor devolvió código HTTP ${res.status}` };
      }

      if (res.ok && data?.success) {
        setSmtpTestResult({ success: true, message: `¡Conexión exitosa! Correo de prueba enviado a ${companyProfile.smtpUser}.` });
        showToast("¡Prueba exitosa! El servidor de correos funciona correctamente.", "success");
      } else {
        const errDesc = data?.error || "Error al conectar con el servidor SMTP.";
        setSmtpTestResult({ success: false, message: errDesc });
        showToast(errDesc, "error");
      }
    } catch (err) {
      const errDesc = `Error de red: ${err.message || 'Sin conexión'}`;
      setSmtpTestResult({ success: false, message: errDesc });
      showToast(errDesc, "error");
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // Signature verification logic (node-forge)
  function verifySignatureDetails(base64, password, emisorRuc) {
 if (!base64) return;
 if (!password) return;

 try {
 const p12Der = forge.util.decode64(base64);
 const p12Asn1 = forge.asn1.fromDer(p12Der);
 const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
 
 const certBag = p12.getBags({ bagType: forge.pki.oids.certBag });
 let certificate;
 for (let certId in certBag) {
 if (certBag[certId] && certBag[certId][0]) {
 certificate = certBag[certId][0].cert;
 break;
 }
 }

 if (!certificate) {
 setCertValidation({
 verificado: false,
 mensaje:'Error: No se encontró ningún certificado en el archivo cargado.',
 tipo:'error',
 sujeto:'',
 emisor:'',
 vence:'',
 ruc:''
 });
 return;
 }

 const cn = certificate.subject.getField('CN')?.value ||'Desconocido';
 const o = certificate.subject.getField('O')?.value ||'';
 const issuerCN = certificate.issuer.getField('CN')?.value ||'Autoridad Certificadora';
 const issuerO = certificate.issuer.getField('O')?.value ||'';
 
 const expirationDate = certificate.validity.notAfter;
 const now = new Date();
 const isExpired = expirationDate < now;
 const venceStr = expirationDate.toISOString().split('T')[0];

 // Extract RUC from subject attributes
 let certRuc ='';
 for (let attr of certificate.subject.attributes) {
 if (attr.name ==='serialNumber' || attr.shortName ==='SN') {
 const val = attr.value;
 if (typeof val ==='string') {
 const match13 = val.match(/\d{13}/);
 if (match13) {
 certRuc = match13[0];
 break;
 }
 const match10 = val.match(/\d{10}/);
 if (match10) {
 certRuc = match10[0] +'001';
 }
 }
 }
 }

 if (!certRuc) {
 for (let attr of certificate.subject.attributes) {
 if (typeof attr.value ==='string') {
 const match13 = attr.value.match(/\d{13}/);
 if (match13) {
 certRuc = match13[0];
 break;
 }
 const match10 = attr.value.match(/\d{10}/);
 if (match10) {
 certRuc = match10[0] +'001';
 break;
 }
 }
 }
 }

 const certSujeto = cn + (o ?` (${o})` :'');
 let hasMatch = false;
 if (emisorRuc && certRuc) {
 if (emisorRuc.substring(0, 10) === certRuc.substring(0, 10)) {
 hasMatch = true;
 }
 }
 if (!hasMatch && emisorRuc && certSujeto) {
 const compRazon = String(companyProfile.razonSocial ||'').trim();
 const compComercial = String(companyProfile.nombreComercial ||'').trim();
 if (checkNameMatch(compRazon, certSujeto) || checkNameMatch(compComercial, certSujeto)) {
 hasMatch = true;
 }
 }

 let tipo ='success';
 let mensaje ='Firma digital descifrada correctamente. ¡Lista para facturar!';

 if (isExpired) {
 tipo ='error';
 mensaje =`La firma electrónica EXPIRÓ el ${venceStr}. Por favor, renuévela para poder firmar comprobantes.`;
 } else if (emisorRuc && !hasMatch) {
 tipo ='warning';
 mensaje =`Advertencia: Los datos de la firma (${certRuc ||'RUC no detectado'}, ${certSujeto}) no coinciden con la empresa por identificación (RUC/CI) ni Razón Social.`;
 } else if (emisorRuc && !certRuc) {
 tipo ='warning';
 mensaje ='Firma descifrada. No pudimos extraer un RUC de la firma. Se asume compatibilidad por razón social.';
 }

 setCertValidation({
 verificado: !isExpired,
 mensaje,
 tipo,
 sujeto: certSujeto,
 emisor: issuerCN || issuerO,
 vence: venceStr,
 ruc: certRuc
 });

 setTempFirma(prev => ({
 ...prev,
 certificadoVence: venceStr
 }));

 } catch (err) {
 console.error("Error decrypting p12:", err);
 setCertValidation({
 verificado: false,
 mensaje:'Error de descifrado: La contraseña ingresada es incorrecta o el archivo está dañado.',
 tipo:'error',
 sujeto:'',
 emisor:'',
 vence:'',
 ruc:''
 });
 }
 };

 const handleCertificateUpload = (e) => {
 const file = e.target.files[0];
 if (!file) return;

 if (!file.name.endsWith('.p12') && !file.name.endsWith('.pfx')) {
 showToast("El certificado debe ser un archivo .p12 o .pfx","error");
 return;
 }

 const reader = new FileReader();
 reader.onload = (event) => {
 const base64Data = event.target.result.split(',')[1];
 setTempFirma(prev => ({
 ...prev,
 certificadoCargado: true,
 certificadoNombre: file.name,
 certificadoBase64: base64Data,
 certificadoClave:'',
 certificadoVence:''
 }));
 setCertValidation({
 verificado: false,
 mensaje:'Certificado cargado. Ingrese la contraseña y haga clic en Verificar.',
 tipo:'info',
 sujeto:'',
 emisor:'',
 vence:'',
 ruc:''
 });
 showToast(`Certificado'${file.name}' cargado. Ingrese la contraseña.`,"info");
 };
 reader.onerror = () => {
 showToast("Error al leer el archivo de certificado","error");
 };
 reader.readAsDataURL(file);
 };

 const removeCertificate = () => {
 setTempFirma({
 certificadoCargado: false,
 certificadoNombre:'',
 certificadoClave:'',
 certificadoVence:'',
 certificadoBase64:''
 });
 setCertValidation({
 verificado: false,
 mensaje:'Cargue su firma electrónica (.p12 / .pfx) para comenzar.',
 tipo:'info',
 sujeto:'',
 emisor:'',
 vence:'',
 ruc:''
 });
 showToast("Certificado quitado temporalmente. Guarde para aplicar.","info");
 };

 const handleSaveFirma = async () => {
 if (tempFirma.certificadoCargado && !certValidation.verificado) {
 showToast("Por favor verifique la contraseña de la firma antes de guardar","error");
 return;
 }

 if (tempFirma.certificadoCargado) {
 const compRuc = String(companyProfile.ruc).trim();
 const certRuc = String(certValidation.ruc).trim();
 const certSujeto = String(certValidation.sujeto ||'').trim();
 const compRazon = String(companyProfile.razonSocial ||'').trim();
 const compComercial = String(companyProfile.nombreComercial ||'').trim();

 let matched = false;
 if (compRuc.length >= 10 && certRuc.length >= 10) {
 if (compRuc.substring(0, 10) === certRuc.substring(0, 10)) {
 matched = true;
 }
 }
 if (!matched && certSujeto) {
 if (checkNameMatch(compRazon, certSujeto) || checkNameMatch(compComercial, certSujeto)) {
 matched = true;
 }
 }

 if (!matched) {
 showToast("La firma electrónica no coincide con el RUC ni la razón social de la empresa","error");
 return;
 }
 }

 try {
 const configRef = doc(db,'artifacts', appId,'public','data','finances_settings','config');
 const updatedConfig = {
 certificadoCargado: tempFirma.certificadoCargado,
 certificadoNombre: tempFirma.certificadoNombre,
 certificadoClave: tempFirma.certificadoClave,
 certificadoBase64: tempFirma.certificadoBase64,
 certificadoVence: tempFirma.certificadoVence,
 certificadoRuc: certValidation.ruc ||'',
 certificadoSujeto: certValidation.sujeto ||''
 };
 await setDoc(configRef, updatedConfig, { merge: true });

 setCompanyProfile(prev => ({
 ...prev,
 ...updatedConfig
 }));

 // Synchronize meta/info
 const infoRef = doc(db,'artifacts', appId,'public','data','meta','info');
 await setDoc(infoRef, { 
 companyProfile: {
 ...companyProfile,
 ...updatedConfig
 } 
 }, { merge: true });

 showToast("Firma electrónica guardada exitosamente","success");
 setIsFirmaOpen(false);
 } catch (err) {
 console.error(err);
 showToast("Error al guardar firma electrónica","error");
 }
 };

 // Save Company Profile
 const handleSaveProfile = async (e) => {
 if (e) e.preventDefault();
 if (companyProfile.ruc && companyProfile.ruc.length !== 13) {
 showToast("El RUC debe tener exactamente 13 dígitos para Ecuador","error");
 return;
 }
 if (companyProfile.certificadoCargado && !isFirmaMatch()) {
 showToast("No se puede guardar: La firma electrónica activa no coincide con los datos ni Razón Social de la empresa","error");
 return;
 }
 try {
 const configRef = doc(db,'artifacts', appId,'public','data','finances_settings','config');
 const profileToSave = {
 razonSocial: companyProfile.razonSocial,
 nombreComercial: companyProfile.nombreComercial,
 ruc: companyProfile.ruc,
 direccionMatriz: companyProfile.direccionMatriz,
 telefonoContacto: companyProfile.telefono,
 correoContacto: companyProfile.email,
 web: companyProfile.web,
 rucActivo: companyProfile.rucActivo,
 rucEstado: companyProfile.rucEstado,
 rucRegimen: companyProfile.rucRegimen,
 obligadoContabilidad: companyProfile.obligadoContabilidad,
 contribuyenteTipo: companyProfile.contribuyenteTipo,
 sucursales: companyProfile.sucursales,
 bodegas: companyProfile.bodegas,
 agenteRetencion: companyProfile.agenteRetencion,
 agenteResolucion: companyProfile.agenteResolucion,
 contribuyenteEspecial: companyProfile.contribuyenteEspecial,
 especialResolucion: companyProfile.especialResolucion,
 certificadoCargado: companyProfile.certificadoCargado || false,
 certificadoNombre: companyProfile.certificadoNombre ||'',
 certificadoClave: companyProfile.certificadoClave ||'',
 certificadoVence: companyProfile.certificadoVence ||'',
 certificadoBase64: companyProfile.certificadoBase64 ||'',
 certificadoRuc: companyProfile.certificadoRuc ||'',
 certificadoSujeto: companyProfile.certificadoSujeto ||'',
 logoUrl: companyProfile.logoUrl ||'',
 smtpHost: companyProfile.smtpHost ||'',
 smtpPort: companyProfile.smtpPort ||'',
 smtpUser: companyProfile.smtpUser ||'',
 smtpPass: companyProfile.smtpPass ||'',
 smtpSecure: companyProfile.smtpSecure || false,
 smtpActivo: companyProfile.smtpActivo !== false
 };
 await setDoc(configRef, profileToSave, { merge: true });

 // Synchronize meta/info
 const infoRef = doc(db,'artifacts', appId,'public','data','meta','info');
 await setDoc(infoRef, { companyProfile: profileToSave }, { merge: true });

 showToast("Perfil de la empresa guardado exitosamente","success");
 } catch (err) {
 console.error(err);
 showToast("Error al guardar perfil","error");
 }
 };

 const handleAddWarehouse = () => {
 const name = newWarehouseName.trim();
 if (!name) return;
 if (companyProfile.bodegas.includes(name)) {
 showToast("Ya existe una bodega con ese nombre","error");
 return;
 }
 const updated = [...companyProfile.bodegas, name];
 setCompanyProfile(prev => ({ ...prev, bodegas: updated }));
 setNewWarehouseName('');
 showToast("Bodega'" + name +"' agregada. Guarde los cambios para confirmar.","success");
 };

 const handleRemoveWarehouse = (name) => {
 if (name ==='Bodega Central') {
 showToast("No se puede eliminar la bodega por defecto (Bodega Central)","error");
 return;
 }
 const updated = companyProfile.bodegas.filter(w => w !== name);
 const updatedBranches = companyProfile.sucursales.map(b => ({
 ...b,
 bodegas: b.bodegas.filter(w => w !== name)
 }));
 setCompanyProfile(prev => ({ ...prev, bodegas: updated, sucursales: updatedBranches }));
 showToast("Bodega eliminada. Guarde los cambios para confirmar.","info");
 };

 const handleToggleWarehouseForBranch = (branchCode, whName) => {
 const updated = companyProfile.sucursales.map(b => {
 if (b.codigo !== branchCode) return b;
 const exist = b.bodegas.includes(whName);
 const newWhs = exist ? b.bodegas.filter(w => w !== whName) : [...b.bodegas, whName];
 return { ...b, bodegas: newWhs };
 });
 setCompanyProfile(prev => ({ ...prev, sucursales: updated }));
 };

 // Save Gemini Key
 // Handle module activation toggles
 const handleToggleModule = async (moduleId) => {
 const updatedModules = {
 ...activeModules,
 [moduleId]: !activeModules[moduleId]
 };
 
 // Prevent disabling dashboard entirely as a fallback
 if (moduleId ==='dashboard' && !updatedModules.dashboard) {
 showToast("El módulo principal'Mi Espacio' no puede ser desactivado","error");
 return;
 }

 try {
 const docRef = doc(db,'artifacts', appId,'public','data','meta','info');
 await setDoc(docRef, { activeModules: updatedModules }, { merge: true });
 setActiveModules(updatedModules);
 showToast(`Módulo ${moduleId.toUpperCase()} ${updatedModules[moduleId] ?'activado' :'desactivado'}`,"success");
 } catch (err) {
 console.error(err);
 showToast("Error al actualizar estado del módulo","error");
 }
 };

 // User list actions
 const handleAddUser = async (e) => {
 e.preventDefault();
 if (!newUser.name) {
 showToast("El nombre del usuario es obligatorio","error");
 return;
 }
 const initials = newUser.name.split('').map(n => n[0]).join('').substring(0, 2).toUpperCase();
 const colors = [
'from-blue-400 to-blue-600',
'from-purple-400 to-purple-600',
'from-emerald-400 to-emerald-600',
'from-red-400 to-red-600',
'from-yellow-400 to-yellow-600'
 ];
 const userColor = colors[Math.floor(Math.random() * colors.length)];
 const id =`u_${new Date().getTime()}`;

 const createdUser = {
 id,
 name: newUser.name,
 role: newUser.role,
 job: newUser.job ||'Miembro del Equipo',
 initials,
 color: userColor,
 email: newUser.email ||''
 };

 const updatedUsers = [...localUsers, createdUser];
 try {
 const docRef = doc(db,'artifacts', appId,'public','data','meta','info');
 await setDoc(docRef, { users: updatedUsers }, { merge: true });
 setLocalUsers(updatedUsers);
 setNewUser({ name:'', role:'Miembro', job:'', email:'' });
 showToast("Usuario creado y guardado","success");
 } catch (err) {
 console.error(err);
 showToast("Error al guardar usuario","error");
 }
 };

 const handleDeleteUser = async (userId) => {
    if (localUsers.length <= 1) {
      showToast("Debe haber al menos un usuario administrador en el espacio","error");
      return;
    }
    if (await window.confirm("¿Seguro que deseas remover este usuario?")) {
      const updatedUsers = localUsers.filter(u => u.id !== userId);
      try {
        const docRef = doc(db,'artifacts', appId,'public','data','meta','info');
        await setDoc(docRef, { users: updatedUsers }, { merge: true });
        setLocalUsers(updatedUsers);
        showToast("Usuario removido del espacio","success");
      } catch {
        showToast("Error al remover usuario","error");
      }
    }
  }

  const inputClass = "w-full text-xs px-3.5 py-2.5 rounded-xl outline-none transition-all border bg-white border-slate-200 text-slate-900 font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 placeholder:text-slate-400";
  const readonlyInputClass = "w-full text-xs px-3.5 py-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-700 font-medium cursor-default select-text";

 const tabs = [
 { id:'profile', label:'Perfil de Empresa', icon: Building },
 { id:'einvoicing', label:'Facturación Electrónica', icon: FileText },
 { id:'recovery', label:'Recuperar Facturas SRI', icon: RefreshCw },
 { id:'modules', label:'Módulos ERP', icon: ToggleRight },
 { id:'gemini', label:'Google Gemini', icon: Sparkles },
 { id:'users', label:'Usuarios y Roles', icon: Users },
 { id:'backup', label:'Copia de Seguridad', icon: Download }
 ];

 return (
 <div className="flex flex-col md:flex-row gap-6 h-full w-full animate-in fade-in duration-300">
 
 {/* MENU LATERAL DE PESTAÑAS (ESTILO BREVO) */}
  <div className="md:w-64 shrink-0 flex flex-col gap-1.5">
    {tabs.map(tab => {
      const Icon = tab.icon;
      const isActive = activeSubTab === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveSubTab(tab.id)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer select-none ${
            isActive 
              ? 'bg-[#1b1b1b] text-white shadow-none font-bold'
              : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/90'
          }`}
        >
          <Icon size={16} strokeWidth={isActive ? 2.2 : 2} className={isActive ? 'text-white' : 'text-slate-500'} />
          <span>{tab.label}</span>
        </button>
      );
    })}
  </div>

  {/* CONTENIDO DE PESTAÑA */}
 <div className="flex-1 p-5 sm:p-7 rounded-2xl border border-slate-200/90 bg-white text-slate-900 shadow-none">
 
 {/* PESTAÑA: PERFIL EMPRESA */}
 {activeSubTab ==='profile' && (
 <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-200">
  {/* BARRA SUPERIOR DE ACCIONES */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
    <div>
      <h2 className="text-base font-bold text-slate-900 tracking-tight">
        {companyProfile.nombreComercial || companyProfile.razonSocial || 'Perfil de Empresa'}
      </h2>
      <p className="text-xs text-slate-500 mt-0.5">
        Identidad fiscal, firma electrónica y parámetros operativos para facturación electrónica ante el SRI.
      </p>
    </div>

    <div className="flex items-center gap-2">
      {(!companyProfile.certificadoCargado || isFirmaMatch()) ? (
        <button 
          type="submit" 
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#1b1b1b] hover:bg-slate-800 text-white transition-all cursor-pointer shadow-none"
        >
          <Save size={14} />
          <span>Guardar Empresa</span>
        </button>
      ) : (
        <div className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
          <AlertTriangle size={13} className="shrink-0" />
          <span>Firma incompatible con RUC</span>
        </div>
      )}
    </div>
  </div>

 {/* ALERTA RUC INACTIVO */}
  {!companyProfile.rucActivo && (
    <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2.5">
      <AlertTriangle size={16} className="text-rose-600 shrink-0" />
      <span className="font-medium">El RUC de la empresa está inactivo o suspendido en el SRI. La facturación electrónica permanecerá deshabilitada.</span>
    </div>
  )}

  {/* ALERTA FIRMA INCOMPATIBLE */}
  {companyProfile.certificadoCargado && !isFirmaMatch() && (
    <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2.5">
      <AlertTriangle size={16} className="text-rose-600 shrink-0" />
      <span className="font-medium">La firma electrónica activa pertenece al RUC {companyProfile.certificadoRuc} ({getPersonaTipoStr(companyProfile.certificadoRuc)}), el cual no coincide con el RUC configurado ({companyProfile.ruc}).</span>
    </div>
  )}

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
    
    {/* COLUMNA 1 (IZQUIERDA) */}
    <div className="space-y-6">
      
      {/* CARD 1: IDENTIFICACIÓN FISCAL Y RÉGIMEN */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-none">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Building size={14} />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Identificación Fiscal</h4>
          </div>
          {companyProfile.ruc && companyProfile.ruc.length === 13 && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              companyProfile.rucActivo
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${companyProfile.rucActivo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {companyProfile.rucEstado || 'ACTIVO'} ({companyProfile.rucRegimen || 'Régimen General'})
            </span>
          )}
        </div>

        {/* RUC con Buscador SRI */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">RUC del Emisor (13 dígitos)</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              maxLength={13}
              value={companyProfile.ruc} 
              onChange={e => setCompanyProfile({...companyProfile, ruc: e.target.value})} 
              className={inputClass} 
              placeholder="1790000000001" 
            />
            <button
              type="button"
              onClick={handleSRIExtraction}
              disabled={isExtractingSRI}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1b1b1b] hover:bg-slate-800 text-white flex items-center gap-1.5 shrink-0 cursor-pointer transition-all disabled:opacity-50 shadow-none"
            >
              {isExtractingSRI && <RefreshCw size={12} className="animate-spin" />}
              <span>{isExtractingSRI ? 'Consultando...' : 'Consultar SRI'}</span>
            </button>
          </div>
        </div>

        {/* Razón Social y Nombre Comercial */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Razón Social</label>
            <input 
              type="text" 
              readOnly
              disabled
              value={companyProfile.razonSocial} 
              className={readonlyInputClass}
              placeholder="Razón Social oficial SRI" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Nombre Comercial</label>
            <input 
              type="text" 
              readOnly
              disabled
              value={companyProfile.nombreComercial} 
              className={readonlyInputClass}
              placeholder="Nombre Comercial oficial SRI" 
            />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Dirección Matriz</label>
            <input 
              type="text" 
              readOnly
              disabled
              value={companyProfile.direccionMatriz} 
              className={readonlyInputClass}
              placeholder="Dirección Matriz oficial SRI" 
            />
          </div>
        </div>

        {/* Parámetros Tributarios Integrados */}
        <div className="pt-3 border-t border-slate-100 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-end">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Régimen / Tipo de Contribuyente</label>
              <select 
                value={companyProfile.contribuyenteTipo} 
                onChange={e => setCompanyProfile({...companyProfile, contribuyenteTipo: e.target.value, rucRegimen: e.target.value.replace('_',' ').toUpperCase()})} 
                className={inputClass}
              >
                <option value="general">Régimen General</option>
                <option value="rimpe_popular">RIMPE Negocio Popular</option>
                <option value="rimpe_emprendedor">RIMPE Emprendedor</option>
                <option value="microempresas">Microempresas</option>
              </select>
            </div>

            <div className="flex items-center gap-2.5 pb-2">
              <input 
                type="checkbox" 
                id="obligadoCont" 
                checked={companyProfile.obligadoContabilidad} 
                onChange={e => setCompanyProfile({...companyProfile, obligadoContabilidad: e.target.checked})} 
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="obligadoCont" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Obligado a llevar contabilidad
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <input 
                  type="checkbox" 
                  id="agenteRet" 
                  checked={companyProfile.agenteRetencion} 
                  onChange={e => setCompanyProfile({...companyProfile, agenteRetencion: e.target.checked})} 
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="agenteRet" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Agente de Retención
                </label>
              </div>
              {companyProfile.agenteRetencion && (
                <input 
                  type="text" 
                  value={companyProfile.agenteResolucion} 
                  onChange={e => setCompanyProfile({...companyProfile, agenteResolucion: e.target.value})} 
                  className={inputClass} 
                  placeholder="Resolución Nro. NAC-..." 
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <input 
                  type="checkbox" 
                  id="contEspecial" 
                  checked={companyProfile.contribuyenteEspecial} 
                  onChange={e => setCompanyProfile({...companyProfile, contribuyenteEspecial: e.target.checked})} 
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="contEspecial" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Contribuyente Especial
                </label>
              </div>
              {companyProfile.contribuyenteEspecial && (
                <input 
                  type="text" 
                  value={companyProfile.especialResolucion} 
                  onChange={e => setCompanyProfile({...companyProfile, especialResolucion: e.target.value})} 
                  className={inputClass} 
                  placeholder="Resolución Nro. ..." 
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CARD 2: INFORMACIÓN DE CONTACTO */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-none">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Phone size={14} />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Información de Contacto</h4>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Teléfono Corporativo</label>
            <input 
              type="text" 
              value={companyProfile.telefono} 
              onChange={e => setCompanyProfile({...companyProfile, telefono: e.target.value})} 
              className={inputClass} 
              placeholder="0999999999" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Correo Electrónico de Contacto</label>
            <input 
              type="email" 
              value={companyProfile.email} 
              onChange={e => setCompanyProfile({...companyProfile, email: e.target.value})} 
              className={inputClass} 
              placeholder="contacto@empresa.com" 
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Sitio Web Corporativo</label>
            <input 
              type="text" 
              value={companyProfile.web} 
              onChange={e => setCompanyProfile({...companyProfile, web: e.target.value})} 
              className={inputClass} 
              placeholder="www.empresa.com" 
            />
          </div>
        </div>
      </div>

      {/* CARD 3: CORREO SALIENTE (SMTP) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Mail size={14} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Correo Saliente (SMTP)</h4>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox"
              checked={companyProfile.smtpActivo !== false}
              onChange={e => setCompanyProfile({ ...companyProfile, smtpActivo: e.target.checked })}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
            />
            <span className="text-xs font-bold text-slate-800">
              {companyProfile.smtpActivo !== false ? 'Activo' : 'Desactivado'}
            </span>
          </label>
        </div>

        <p className="text-xs text-slate-500 leading-normal">
          Envía comprobantes autorizados (XML y PDF) automáticamente al emitir facturas y entrega copias al emisor.
        </p>

        {companyProfile.smtpActivo === false && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <span>Envío automático por correo desactivado. Los comprobantes se autorizarán sin emitir correos.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Servidor SMTP (Host)</label>
            <input 
              type="text" 
              value={companyProfile.smtpHost || ''} 
              onChange={e => setCompanyProfile({ ...companyProfile, smtpHost: e.target.value })} 
              className={inputClass} 
              placeholder="smtp.gmail.com o mail.tuempresa.com" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Puerto SMTP</label>
            <input 
              type="text" 
              value={companyProfile.smtpPort || ''} 
              onChange={e => setCompanyProfile({ ...companyProfile, smtpPort: e.target.value })} 
              className={inputClass} 
              placeholder="465 (SSL) o 587 (TLS)" 
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input 
              type="checkbox" 
              id="smtpSecure"
              checked={!!companyProfile.smtpSecure} 
              onChange={e => setCompanyProfile({ ...companyProfile, smtpSecure: e.target.checked })} 
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4 cursor-pointer"
            />
            <label htmlFor="smtpSecure" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Conexión Segura SSL (Puerto 465)
            </label>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Usuario / Correo SMTP</label>
            <input 
              type="email" 
              value={companyProfile.smtpUser || ''} 
              onChange={e => setCompanyProfile({ ...companyProfile, smtpUser: e.target.value })} 
              className={inputClass} 
              placeholder="facturacion@tuempresa.com" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Contraseña SMTP</label>
            <input 
              type="password" 
              value={companyProfile.smtpPass || ''} 
              onChange={e => setCompanyProfile({ ...companyProfile, smtpPass: e.target.value })} 
              className={inputClass} 
              placeholder="••••••••••••" 
            />
          </div>

          <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 flex items-start gap-2">
            <AlertCircle size={14} className="text-slate-500 mt-0.5 shrink-0" />
            <span className="leading-relaxed">
              <strong>Para Gmail:</strong> Utiliza una <em>Contraseña de Aplicación de 16 letras</em> generada en la configuración de seguridad de tu cuenta Google.
            </span>
          </div>

          <div className="sm:col-span-2 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isTestingSmtp}
              onClick={handleTestSmtp}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isTestingSmtp ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
              <span>{isTestingSmtp ? 'Probando conexión...' : 'Probar Envío SMTP'}</span>
            </button>
            {smtpTestResult && (
              <div className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${smtpTestResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {smtpTestResult.success ? <CheckCircle2 size={13} className="text-emerald-600" /> : <AlertTriangle size={13} className="text-rose-600" />}
                <span>{smtpTestResult.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>

    {/* COLUMNA 2 (DERECHA) */}
    <div className="space-y-6">

      {/* CARD 4: FIRMA ELECTRÓNICA (.p12 / .pfx) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-none">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Award size={14} />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Firma Electrónica</h4>
          </div>
          {companyProfile.certificadoCargado && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isFirmaMatch()
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isFirmaMatch() ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isFirmaMatch() ? 'Firma Activa' : 'Incompatible'}
            </span>
          )}
        </div>

        {companyProfile.certificadoCargado ? (
          <div className="space-y-3.5">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <span className="text-slate-500 font-medium">Archivo:</span>
                <span className="font-mono font-semibold text-slate-900 text-right truncate max-w-[200px]" title={companyProfile.certificadoNombre}>
                  {companyProfile.certificadoNombre}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Fecha de Vencimiento:</span>
                <span className="font-semibold text-slate-900">{companyProfile.certificadoVence}</span>
              </div>
              {companyProfile.certificadoRuc && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">RUC / CI Firma:</span>
                  <span className="font-mono font-semibold text-slate-900">{companyProfile.certificadoRuc}</span>
                </div>
              )}
              {companyProfile.certificadoSujeto && (
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 font-medium">Sujeto:</span>
                  <span className="font-semibold text-slate-900 text-right truncate max-w-[200px]" title={companyProfile.certificadoSujeto}>
                    {companyProfile.certificadoSujeto}
                  </span>
                </div>
              )}
            </div>

            <p className={`text-xs p-3 rounded-xl border leading-relaxed ${
              !isFirmaMatch()
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {!isFirmaMatch()
                ? `El RUC/CI de la firma (${companyProfile.certificadoRuc}) no coincide con el RUC de la empresa (${companyProfile.ruc}).`
                : 'Firma electrónica verificada y lista para facturar en el SRI.'}
            </p>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsFirmaOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors cursor-pointer"
              >
                Actualizar Firma
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-center py-4">
            <p className="text-xs text-slate-500 leading-normal">
              Configure su firma digital (.p12 / .pfx) para emitir facturas electrónicas válidas ante el SRI.
            </p>
            <button
              type="button"
              onClick={() => setIsFirmaOpen(true)}
              disabled={!companyProfile.ruc}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#1b1b1b] hover:bg-slate-800 text-white transition-all cursor-pointer disabled:opacity-40"
            >
              <Award size={13} /> Cargar Firma Electrónica
            </button>
            {!companyProfile.ruc && (
              <p className="text-[11px] text-slate-400 italic">Configure el RUC primero para cargar la firma.</p>
            )}
          </div>
        )}
      </div>

      {/* CARD 5: LOGOTIPO DE LA EMPRESA */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-none">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <UploadCloud size={14} />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Logotipo Oficial</h4>
        </div>

        {companyProfile.logoUrl ? (
          <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="w-36 h-24 flex items-center justify-center bg-white rounded-xl p-2 border border-slate-200">
              <img src={companyProfile.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <label className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 cursor-pointer transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                {isUploadingLogo ? 'Subiendo...' : 'Cambiar Imagen'}
              </label>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> Eliminar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="w-full flex flex-col items-center justify-center gap-2.5 p-6 rounded-xl border border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50 cursor-pointer transition-all text-slate-600">
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
              <UploadCloud size={24} className={isUploadingLogo ? 'animate-bounce text-slate-900' : 'text-slate-400'} />
              <span className="text-xs font-semibold text-center">
                {isUploadingLogo ? 'Subiendo imagen...' : 'Seleccionar imagen de logotipo (PNG, JPG, SVG)'}
              </span>
            </label>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Se mostrará en la cabecera del RIDE (PDF), cotizaciones y correos al cliente.
            </p>
          </div>
        )}
      </div>

      {/* CARD 6: ESTABLECIMIENTOS DEL SRI */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-none">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Building size={14} />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Establecimientos del SRI</h4>
        </div>

        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
          {companyProfile.sucursales && companyProfile.sucursales.map(branch => (
            <div key={branch.codigo} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{branch.codigo} — {branch.nombre}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{branch.direccion}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  branch.activa 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {branch.activa ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Checkboxes de bodegas asociadas */}
              <div className="pt-2 border-t border-slate-200/60 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bodegas Asignadas:</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {companyProfile.customBodegas || companyProfile.bodegas ? (companyProfile.bodegas.map(whName => {
                    const isAssoc = branch.bodegas && branch.bodegas.includes(whName);
                    return (
                      <label key={whName} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isAssoc} 
                          onChange={() => handleToggleWarehouseForBranch(branch.codigo, whName)} 
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span>{whName}</span>
                      </label>
                    );
                  })) : null}
                </div>
              </div>
            </div>
          ))}
          {(!companyProfile.sucursales || companyProfile.sucursales.length === 0) && (
            <p className="text-xs text-slate-400 italic">No hay establecimientos cargados. Ingrese el RUC y pulse Consultar SRI.</p>
          )}
        </div>
      </div>

      {/* CARD 7: BODEGAS DE INVENTARIO */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-none">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Package size={14} />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Bodegas de Inventario</h4>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[50px] p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 items-center">
          {companyProfile.bodegas.map(wh => (
            <div key={wh} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-slate-200 shadow-none">
              <span>{wh}</span>
              {wh !== 'Bodega Central' && (
                <button 
                  type="button" 
                  onClick={() => handleRemoveWarehouse(wh)} 
                  className="text-slate-400 hover:text-rose-600 font-bold ml-1 text-sm leading-none cursor-pointer"
                  title="Eliminar bodega"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Nombre de bodega (ej. Bodega Norte)" 
            value={newWarehouseName} 
            onChange={e => setNewWarehouseName(e.target.value)} 
            className={inputClass} 
          />
          <button 
            type="button" 
            onClick={handleAddWarehouse} 
            className="px-4 py-2.5 rounded-xl bg-[#1b1b1b] hover:bg-slate-800 text-white font-semibold text-xs shrink-0 transition-all cursor-pointer shadow-none"
          >
            Agregar
          </button>
        </div>
      </div>

    </div>

  </div>

  {/* BOTONES DE ACCIÓN PRINCIPALES AL PIE */}
  <div className="flex justify-end items-center pt-6 border-t border-slate-100 mt-6">
    {(!companyProfile.certificadoCargado || isFirmaMatch()) ? (
      <button 
        type="submit" 
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-[#1b1b1b] hover:bg-slate-800 text-white transition-all cursor-pointer shadow-none"
      >
        <Save size={14} />
        <span>Guardar Empresa</span>
      </button>
    ) : (
      <div className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl flex items-center gap-2">
        <AlertTriangle size={14} className="shrink-0" />
        <span>Firma no coincide con RUC/Razón Social. Corrija para habilitar Guardar Empresa.</span>
      </div>
    )}
  </div>
  </form>
  )}

  {/* PESTAÑA: FACTURACIÓN ELECTRÓNICA */}
 {activeSubTab ==='einvoicing' && (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-border-default pb-3 mb-4">
 <h3 className="text-base font-bold text-slate-950 tracking-tight">Facturación Electrónica (SRI)</h3>
 <p className="text-xs text-text-secondary mt-1">Configure el ambiente de emisión, los secuenciales de cada comprobante y los formatos de impresión. El certificado de firma electrónica se gestiona en la pestaña Perfil de Empresa.</p>
 </div>
 <div className="bg-slate-50/70 border border-border-default rounded-card p-4 space-y-3">
 <div className="flex items-center gap-2 pb-2 border-b border-border-default">
 <RefreshCw size={15} className="text-primary" />
 <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">Recuperación de Facturas Autorizadas</h4>
 </div>
 <SriRecoveryPanel db={db} appId={appId} showToast={showToast} />
 </div>
 <FinanceSettings showToast={showToast} db={db} storage={storage} appId={appId} />
 </div>
 )}

 {/* PESTAÑA: RECUPERACIÓN SRI */}
 {activeSubTab ==='recovery' && (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-border-default pb-3 mb-4">
 <h3 className="text-base font-bold text-slate-950 tracking-tight">Recuperación de Facturas Autorizadas (SRI)</h3>
 <p className="text-xs text-text-secondary mt-1">
 Importa directamente desde los servidores del SRI cualquier comprobante autorizado que no aparezca en tu base de datos de WebFix.
 </p>
 </div>
 <div className="bg-white border border-border-default rounded-card p-5 sm:p-6 space-y-4">
 <div className="flex items-start gap-3.5 pb-3 border-b border-border-default">
 <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
 <RefreshCw size={20} />
 </div>
 <div>
 <h4 className="text-sm font-bold text-text-primary">Consulta e Importación Directa del SRI</h4>
 <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
 Ingresa la clave de acceso de 49 dígitos del comprobante. WebFix consultará los servidores del SRI, descargará el XML autorizado oficial, protegerá el secuencial para evitar duplicidad y registrará la factura en el sistema.
 </p>
 </div>
 </div>
 <SriRecoveryPanel db={db} appId={appId} showToast={showToast} />
 <div className="pt-3 border-t border-border-default text-xs text-text-secondary space-y-1">
 <p className="font-semibold text-text-primary">Información importante:</p>
 <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-text-secondary">
 <li>No vuelve a emitir ni reenviar comprobantes al SRI (operación segura de solo lectura e importación).</li>
 <li>Los cobros bancarios y el inventario de documentos nuevos quedan listos para conciliación manual.</li>
 <li>Si el documento ya existía previamente, conserva los registros y movimientos asociados.</li>
 </ul>
 </div>
 </div>
 </div>
 )}


 {/* PESTAÑA: MODULOS ERP (ACTIVACION / DESACTIVACION - ESTILO BREVO) */}
  {activeSubTab === 'modules' && (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h3 className="text-base font-bold text-slate-950 tracking-tight">Activación y Desactivación de Módulos</h3>
        <p className="text-xs text-slate-500 mt-1">Personaliza tu espacio de trabajo activando o desactivando los módulos que no utilices. Los cambios se reflejarán inmediatamente en el menú de navegación izquierdo.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        
        {/* 1. VENTAS */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <ShoppingCart size={20} strokeWidth={2.2} />
              </span>
              <button 
                type="button" 
                onClick={() => handleToggleModule('ventas')}
                className="cursor-pointer transition-transform active:scale-95"
              >
                {activeModules.ventas ? (
                  <ToggleRight size={32} className="text-[#0b996e]" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-300" />
                )}
              </button>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Ventas y Facturación</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bandeja de facturas electrónicas, cotizaciones comerciales, notas de crédito y punto de venta mostrador (POS).
            </p>
          </div>
          <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-semibold">Estado</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              activeModules.ventas 
                ? 'bg-[#c0ffa5] text-[#004227]' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {activeModules.ventas ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        </div>

        {/* 2. COMPRAS */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShoppingBag size={20} strokeWidth={2.2} />
              </span>
              <button 
                type="button" 
                onClick={() => handleToggleModule('compras')}
                className="cursor-pointer transition-transform active:scale-95"
              >
                {activeModules.compras ? (
                  <ToggleRight size={32} className="text-[#0b996e]" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-300" />
                )}
              </button>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Compras (SRI / ATS)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Gestión de facturas recibidas del SRI, gastos con categorización de IA y retenciones en compras.
            </p>
          </div>
          <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-semibold">Estado</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              activeModules.compras 
                ? 'bg-[#c0ffa5] text-[#004227]' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {activeModules.compras ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        </div>

        {/* 3. FINANZAS */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={20} strokeWidth={2.2} />
              </span>
              <button 
                type="button" 
                onClick={() => handleToggleModule('finances')}
                className="cursor-pointer transition-transform active:scale-95"
              >
                {activeModules.finances ? (
                  <ToggleRight size={32} className="text-[#0b996e]" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-300" />
                )}
              </button>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Control Financiero & Bancos</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Gestión contable, cuentas por cobrar (CxC), cuentas por pagar (CxP), bancos, tarjetas y reportes financieros.
            </p>
          </div>
          <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-semibold">Estado</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              activeModules.finances 
                ? 'bg-[#c0ffa5] text-[#004227]' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {activeModules.finances ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        </div>

        {/* 4. INVENTARIO */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Package size={20} strokeWidth={2.2} />
              </span>
              <button 
                type="button" 
                onClick={() => handleToggleModule('inventario')}
                className="cursor-pointer transition-transform active:scale-95"
              >
                {activeModules.inventario ? (
                  <ToggleRight size={32} className="text-[#0b996e]" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-300" />
                )}
              </button>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Catálogo e Inventarios</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Control de existencias de productos, catálogo de servicios, mínimos críticos y movimientos Kardex multibodega.
            </p>
          </div>
          <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-semibold">Estado</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              activeModules.inventario 
                ? 'bg-[#c0ffa5] text-[#004227]' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {activeModules.inventario ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        </div>

        {/* 5. PERSONAS */}
        <div className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Users size={20} strokeWidth={2.2} />
              </span>
              <button 
                type="button" 
                onClick={() => handleToggleModule('personas')}
                className="cursor-pointer transition-transform active:scale-95"
              >
                {activeModules.personas ? (
                  <ToggleRight size={32} className="text-[#0b996e]" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-300" />
                )}
              </button>
            </div>
            <h4 className="text-sm font-bold text-slate-900">Gestión de Personas</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Directorio unificado de Clientes y Proveedores con RUC/CI del SRI, cartera y condiciones comerciales.
            </p>
          </div>
          <div className="flex justify-between items-center mt-5 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-semibold">Estado</span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              activeModules.personas 
                ? 'bg-[#c0ffa5] text-[#004227]' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {activeModules.personas ? 'Activado' : 'Desactivado'}
            </span>
          </div>
        </div>

      </div>
    </div>
  )}

  {/* PESTAÑA: GOOGLE GEMINI (INTELIGENCIA ARTIFICIAL) */}
 {activeSubTab ==='gemini' && (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-border-default pb-3">
 <h3 className="text-base font-bold text-slate-950 tracking-tight">Inteligencia Artificial y Asistente Gemini</h3>
 <p className="text-xs text-text-secondary mt-1">Servicios cognitivos de IA integrados para optimizar la toma de decisiones, extracción automática de documentos y planificación operativa.</p>
 </div>

 <div className="p-5 rounded-card border border-emerald-200 bg-emerald-50/50 space-y-3">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="p-2 rounded-card bg-emerald-600 text-white">
 <Sparkles size={18} />
 </div>
 <div>
 <h4 className="text-sm font-bold text-emerald-950">Asistente IA Activado para tu Empresa</h4>
 <p className="text-xs text-emerald-700">Gestionado automáticamente desde la administración central de la plataforma</p>
 </div>
 </div>
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white ">
 <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
 Activo y Operativo
 </span>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="p-4 rounded-card border border-border-default bg-white space-y-1.5">
 <h5 className="text-xs font-semibold uppercase text-text-heading flex items-center gap-2">
 <Sparkles size={14} className="text-primary" />
 OCR de Facturas y Compras
 </h5>
 <p className="text-xs text-text-secondary leading-relaxed">
 Reconocimiento inteligente de tickets, PDF y facturas escaneadas para cargar egresos y compras sin digitación manual.
 </p>
 </div>

 <div className="p-4 rounded-card border border-border-default bg-white space-y-1.5">
 <h5 className="text-xs font-semibold uppercase text-text-heading flex items-center gap-2">
 <Sparkles size={14} className="text-primary" />
 Asistente Inteligente de Negocios
 </h5>
 <p className="text-xs text-text-secondary leading-relaxed">
 Diagnóstico predictivo de ventas, rotación de stock y optimización operativa en tiempo real con un solo clic.
 </p>
 </div>

 <div className="p-4 rounded-card border border-border-default bg-white space-y-1.5">
 <h5 className="text-xs font-semibold uppercase text-text-heading flex items-center gap-2">
 <Sparkles size={14} className="text-primary" />
 Asesor Contable y Financiero
 </h5>
 <p className="text-xs text-text-secondary leading-relaxed">
 Diagnóstico del estado del negocio, alertas de stock mínimo y recomendaciones estratégicas de balances.
 </p>
 </div>

 <div className="p-4 rounded-card border border-border-default bg-white space-y-1.5">
 <h5 className="text-xs font-semibold uppercase text-text-heading flex items-center gap-2">
 <Sparkles size={14} className="text-primary" />
 Redacción y Edición de Documentos
 </h5>
 <p className="text-xs text-text-secondary leading-relaxed">
 Asistencia en tiempo real para resumir, mejorar ortografía y expandir minutas en el módulo de documentación.
 </p>
 </div>
 </div>
 </div>
 )}

 {/* PESTAÑA: USUARIOS Y ROLES */}
 {activeSubTab ==='users' && (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-white/5 pb-3">
 <h3 className="text-base font-bold text-slate-950 tracking-tight">Gestión de Usuarios y Roles</h3>
 <p className="text-xs text-text-secondary mt-1">Colaboradores registrados con acceso a este ERP. Puedes crear, asignar roles o revocar permisos.</p>
 </div>

 {/* LISTA DE USUARIOS */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {localUsers.map(user => (
 <div key={user.id} className={`p-4 rounded-card border flex items-center justify-between bg-surface-bg border-border-default`}>
 <div className="flex items-center gap-3">
 <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${user.color ||'from-gray-400 to-gray-600'} flex items-center justify-center text-xs font-bold text-white shrink-0 shadow`}>
 {user.initials}
 </div>
 <div>
 <p className="text-xs font-bold">{user.name}</p>
 <p className="text-xs text-text-secondary">{user.job} — <span className="font-semibold uppercase tracking-wider text-xs">{user.role}</span></p>
 {user.email && <p className="text-xs font-mono text-text-secondary truncate max-w-[160px]">{user.email}</p>}
 </div>
 </div>
 <button 
 onClick={() => handleDeleteUser(user.id)}
 className="p-2 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/10 transition-colors"
 >
 <Trash2 size={13} />
 </button>
 </div>
 ))}
 </div>

 {/* FORMULARIO AGREGAR USUARIO */}
 <form onSubmit={handleAddUser} className={`p-5 rounded-card border space-y-4 bg-surface-muted/50 border-gray-250`}>
 <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Registrar Nuevo Colaborador</h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
 <div>
 <label className="label-field label-field-dark">Nombre Completo</label>
 <input 
 type="text" 
 required 
 value={newUser.name} 
 onChange={e => setNewUser({...newUser, name: e.target.value})} 
 className={inputClass} 
 placeholder="Ej. Ana Torres" 
 />
 </div>
 <div>
 <label className="label-field label-field-dark">Correo Electrónico</label>
 <input 
 type="email" 
 value={newUser.email} 
 onChange={e => setNewUser({...newUser, email: e.target.value})} 
 className={inputClass} 
 placeholder="ana.torres@empresa.com" 
 />
 </div>
 <div>
 <label className="label-field label-field-dark">Cargo / Ocupación</label>
 <input 
 type="text" 
 value={newUser.job} 
 onChange={e => setNewUser({...newUser, job: e.target.value})} 
 className={inputClass} 
 placeholder="Ej. Gerente de Operaciones" 
 />
 </div>
 <div>
 <label className="label-field label-field-dark">Rol de Acceso</label>
 <select 
 value={newUser.role} 
 onChange={e => setNewUser({...newUser, role: e.target.value})} 
 className={inputClass}
 >
 <option value="Admin" className="text-black">Administrador</option>
 <option value="Miembro" className="text-black">Miembro</option>
 <option value="Observador" className="text-black">Observador</option>
 </select>
 </div>
 </div>

 <div className="flex justify-end pt-2">
 <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#1b1b1b] hover:bg-black text-white cursor-pointer transition-all shadow-none">
 <Plus size={14} /> Registrar Usuario
 </button>
 </div>
 </form>
 </div>
 )}

 {/* PESTAÑA: COPIA DE SEGURIDAD */}
 {activeSubTab ==='backup' && (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-white/5 pb-3">
 <h3 className="text-base font-bold text-slate-950 tracking-tight">Copia de Seguridad y Respaldos</h3>
 <p className="text-xs text-text-secondary mt-1">Respalda localmente toda la base de datos de tu espacio de trabajo para mayor seguridad. Descarga un archivo estructurado en JSON listo para ser restaurado.</p>
 </div>

 <div className={`p-5 rounded-card border flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface-bg border-border-default`}>
 <div className="space-y-1 text-xs">
 <p className="font-bold">Respaldar Datos del ERP</p>
 <p className="text-xs text-text-secondary leading-normal">Incluye Clientes, Proveedores, Transacciones, Inventario y Configuraciones.</p>
 </div>

 <button 
 onClick={handleDownloadBackup}
 className="flex justify-center items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#1b1b1b] hover:bg-black text-white uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-none"
 >
 <Download size={14} /> Exportar Backup (JSON)
 </button>
 </div>
 
 <div className={`p-4 rounded-card border text-xs flex gap-3 items-start bg-yellow-50 border-yellow-200 text-yellow-950 font-medium`}>
 <AlertTriangle size={16} className="shrink-0 mt-0.5" />
 <div>
 <p className="font-bold uppercase tracking-wider text-xs mb-1">Precaución contable:</p>
 <p>Las copias de seguridad contienen información fiscal sensible. Almacena tus respaldos en servidores seguros o unidades cifradas conforme al régimen de protección de datos.</p>
 </div>
 </div>
 </div>
 )}

 </div>

 {/* MODAL CONFIGURACIÓN FIRMA ELECTRÓNICA */}
  {isFirmaOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
  <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl animate-in zoom-in-95 duration-200">
  
  {/* Cabecera */}
  <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-4">
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
        <Award size={16} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900">Firma Electrónica</h3>
        <p className="text-xs text-slate-500">Cargar archivo de firma digital (.p12 / .pfx)</p>
      </div>
    </div>
    <button 
      type="button" 
      onClick={() => setIsFirmaOpen(false)}
      className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
    >
      <X size={16} />
    </button>
  </div>

  {/* Contenido */}
  <div className="space-y-4">
  
  {tempFirma.certificadoCargado ? (
    <div className="space-y-3.5">
      <div className={`p-4 rounded-xl border space-y-2.5 transition-all duration-200 ${
        certValidation.tipo === 'success' 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
          : certValidation.tipo === 'warning'
          ? 'bg-amber-50 border-amber-200 text-amber-900' 
          : 'bg-rose-50 border-rose-200 text-rose-900'
      }`}>
        <div className="flex justify-between items-start">
          <div className="truncate pr-2 text-xs">
            <p className="font-bold truncate text-slate-900">{tempFirma.certificadoNombre}</p>
            {certValidation.sujeto && <p className="mt-1 text-slate-700"><span className="text-slate-500">Sujeto:</span> {certValidation.sujeto}</p>}
            {certValidation.emisor && <p className="mt-0.5 text-slate-700"><span className="text-slate-500">Emisor:</span> {certValidation.emisor}</p>}
            {certValidation.vence && <p className="mt-0.5 text-slate-700 font-mono"><span className="text-slate-500 font-sans">Expira:</span> {certValidation.vence}</p>}
            {certValidation.ruc && <p className="mt-0.5 text-slate-700 font-mono"><span className="text-slate-500 font-sans">RUC Firma:</span> {certValidation.ruc}</p>}
          </div>
          <button 
            type="button" 
            onClick={removeCertificate} 
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline shrink-0 cursor-pointer"
          >
            Quitar
          </button>
        </div>

        <div className="flex items-start gap-1.5 border-t border-current/10 pt-2.5 text-xs">
          {certValidation.tipo === 'success' && <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-600" />}
          {certValidation.tipo === 'warning' && <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />}
          {certValidation.tipo === 'error' && <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-600" />}
          <p className="leading-relaxed font-medium">
            {certValidation.mensaje}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-slate-700">Contraseña de la Firma</label>
        <div className="flex gap-2">
          <input 
            type="password" 
            value={tempFirma.certificadoClave} 
            onChange={e => setTempFirma({...tempFirma, certificadoClave: e.target.value})} 
            className={inputClass} 
            placeholder="Ingrese la contraseña del certificado" 
          />
          <button 
            type="button" 
            onClick={() => verifySignatureDetails(tempFirma.certificadoBase64, tempFirma.certificadoClave, companyProfile.ruc || '')}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            Verificar
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="space-y-3">
      <label className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-600 cursor-pointer transition-all">
        <input type="file" accept=".p12,.pfx" className="hidden" onChange={handleCertificateUpload} />
        <Award size={24} className="text-slate-400" />
        <span className="text-xs font-semibold">Seleccionar Firma (.p12 / .pfx)</span>
      </label>
      <p className="text-xs text-slate-500 leading-relaxed text-center">
        Su archivo de firma electrónica se almacena de forma segura para firmar comprobantes autorizados por el SRI.
      </p>
    </div>
  )}

  </div>

  {/* Footer */}
  <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100 mt-5">
    <button 
      type="button" 
      onClick={() => setIsFirmaOpen(false)}
      className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
    >
      Cancelar
    </button>
    <button 
      type="button" 
      onClick={handleSaveFirma}
      className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#1b1b1b] hover:bg-slate-800 text-white transition-all cursor-pointer shadow-none"
    >
      Guardar Firma
    </button>
  </div>

  </div>
  </div>
  )}

  </div>
  );
}