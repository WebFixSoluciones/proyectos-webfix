import React, { useState, useEffect } from'react';
import { 
 Settings, Link as LinkIcon, Sparkles, User, Users, Folder, Shield, 
 Save, Download, CheckCircle2, AlertTriangle, Key, Mail, Globe, 
 MapPin, Phone, Building, ShoppingCart, DollarSign, Package, Calendar, 
 Plus, Trash2, Eye, EyeOff, LayoutDashboard, ToggleLeft, ToggleRight,
 Palette, CreditCard, Award, UploadCloud, ExternalLink, X, Lock, AlertCircle, CheckCircle, RefreshCw, FileText
} from'lucide-react';
import { doc, setDoc, getDoc } from'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from'firebase/storage';
import forge from'node-forge';
import { consultarRucSri } from'../../services/sriService';
import FinanceSettings from'../finances/FinanceSettings';

export default function GeneralSettings({ 
 showToast, db, appId, storage,
 users = [], trash = [], handleDownloadBackup, 
 googleClientId, setGoogleClientId, 
 activeModules = {}, setActiveModules,
 primaryColor, setPrimaryColor
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
 smtpSecure: false
 });

 const [isExtractingSRI, setIsExtractingSRI] = useState(false);
 const [newWarehouseName, setNewWarehouseName] = useState('');
 const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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

 // State for Gemini Key
 const [geminiKey, setGeminiKey] = useState('');
 const [showKey, setShowKey] = useState(false);
 const [testingKey, setTestingKey] = useState(false);
 const [testResult, setTestResult] = useState(null);

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
 let cloudGeminiKey ='';
 if (snap.exists()) {
 const data = snap.data();
 if (data.users) {
 setLocalUsers(data.users);
 }
 if (data.geminiApiKey) {
 cloudGeminiKey = data.geminiApiKey;
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
 smtpSecure: finData.smtpSecure || false
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
 smtpSecure: cp.smtpSecure || false
 }));
 }
 
 // Load Gemini key from localStorage, fallback to cloud
 const savedGemini = localStorage.getItem('finances_gemini_api_key') ||'';
 const finalKey = cloudGeminiKey || savedGemini;
 setGeminiKey(finalKey);
 if (finalKey) {
 localStorage.setItem('finances_gemini_api_key', finalKey);
 }
 } catch (err) {
 console.error("Error al cargar configuración general", err);
 }
 }
 loadConfig();
 }, [appId, db]);

 // Sync users prop with local state
 useEffect(() => {
 setLocalUsers(users);
 }, [users]);

 // Sync tempFirma when modal opens
 useEffect(() => {
 if (isFirmaOpen) {
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

 // Signature verification logic (node-forge)
 const verifySignatureDetails = (base64, password, emisorRuc) => {
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
 smtpSecure: companyProfile.smtpSecure || false
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

 // Save Appearance Configuration
 const handleSaveAppearance = async (e) => {
 e.preventDefault();
 if (!primaryColor || !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
 showToast("Por favor ingresa un color hexadecimal válido (ej. #4F46E5)","error");
 return;
 }
 try {
 const docRef = doc(db,'artifacts', appId,'public','data','meta','info');
 await setDoc(docRef, { primaryColor }, { merge: true });
 showToast("Color primario guardado y aplicado correctamente","success");
 } catch (err) {
 console.error(err);
 showToast("Error al guardar la configuración de apariencia","error");
 }
 };

 // Save Gemini Key
 const handleSaveGemini = (e) => {
 e.preventDefault();
 const trimmedKey = geminiKey.trim();
 localStorage.setItem('finances_gemini_api_key', trimmedKey);
 // Also save to meta info for cloud backup
 const docRef = doc(db,'artifacts', appId,'public','data','meta','info');
 setDoc(docRef, { geminiApiKey: trimmedKey }, { merge: true })
 .then(() => {
 showToast("Clave de Gemini guardada correctamente","success");
 })
 .catch((err) => {
 console.error(err);
 showToast("Clave guardada en local (Error al respaldar en la nube)","warning");
 });
 };

 const handleTestGeminiKey = async () => {
 if (!geminiKey) {
 showToast("Por favor ingresa una clave de API primero","error");
 return;
 }
 setTestingKey(true);
 setTestResult(null);
 try {
 const url =`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`;
 const response = await fetch(url, {
 method:'POST',
 headers: {
'Content-Type':'application/json',
 },
 body: JSON.stringify({
 contents: [{
 parts: [{ text:'Hola' }]
 }]
 })
 });

 if (response.ok) {
 setTestResult({ success: true, message:'¡Conexión exitosa! La clave de Gemini es válida y se comunica con el servidor de IA.' });
 showToast("Conexión con Gemini exitosa","success");
 } else {
 const data = await response.json();
 const errMsg = data.error?.message ||'Error de API desconocido';
 setTestResult({ success: false, message:`Error de API: ${errMsg}` });
 showToast("Error al validar clave de Gemini","error");
 }
 } catch (err) {
 setTestResult({ success: false, message:`Error de red: ${err.message}` });
 showToast("Error de conexión con la API","error");
 } finally {
 setTestingKey(false);
 }
 };

 // Save Google client ID
 const handleSaveWorkspace = async (e) => {
 e.preventDefault();
 try {
 const docRef = doc(db,'artifacts', appId,'public','data','meta','info');
 await setDoc(docRef, { googleClientId }, { merge: true });
 setGoogleClientId(googleClientId);
 showToast("Google Workspace Client ID guardado","success");
 } catch (err) {
 console.error(err);
 showToast("Error al guardar Client ID","error");
 }
 };

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
 if (window.confirm("¿Seguro que deseas remover este usuario?")) {
 const updatedUsers = localUsers.filter(u => u.id !== userId);
 try {
 const docRef = doc(db,'artifacts', appId,'public','data','meta','info');
 await setDoc(docRef, { users: updatedUsers }, { merge: true });
 setLocalUsers(updatedUsers);
 showToast("Usuario removido del espacio","success");
 } catch (err) {
 showToast("Error al remover usuario","error");
 }
 }
 };

 const inputClass =`w-full text-xs px-3 py-2.5 rounded-xl outline-none transition-all border bg-white border-gray-300 text-gray-900 focus:border-primary focus:ring-1 focus:ring-primary/35 font-medium`;

 const tabs = [
 { id:'profile', label:'Perfil de Empresa', icon: Building },
 { id:'einvoicing', label:'Facturación Electrónica', icon: FileText },
 { id:'appearance', label:'Apariencia y Tema', icon: Palette },
 { id:'modules', label:'Módulos ERP', icon: ToggleRight },
 { id:'workspace', label:'Google Workspace', icon: LinkIcon },
 { id:'gemini', label:'Google Gemini', icon: Sparkles },
 { id:'users', label:'Usuarios y Roles', icon: Users },
 { id:'backup', label:'Copia de Seguridad', icon: Download }
 ];

 return (
 <div className="flex flex-col md:flex-row gap-6 h-full w-full animate-in fade-in duration-300">
 
 {/* MENU LATERAL DE PESTAÑAS */}
 <div className="md:w-64 shrink-0 flex flex-col gap-1">
 {tabs.map(tab => {
 const Icon = tab.icon;
 const isActive = activeSubTab === tab.id;
 return (
 <button
 key={tab.id}
 onClick={() => setActiveSubTab(tab.id)}
 className={`flex items-center gap-3 px-4 py-3 rounded-card text-xs font-semibold transition-all text-left ${
 isActive 
 ?'bg-primary text-white'
 :'text-black hover:text-black hover:bg-black/5'
 }`}
 >
 <Icon size={16} />
 <span>{tab.label}</span>
 </button>
 );
 })}
 </div>

 {/* CONTENIDO DE PESTAÑA */}
 <div className={`flex-1 p-4 sm:p-6 rounded-card border bg-white border-gray-200 text-gray-700`}>
 
 {/* PESTAÑA: PERFIL EMPRESA */}
 {activeSubTab ==='profile' && (
 <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-white/5 pb-3">
 <h3 className="text-sm font-black uppercase tracking-wider text-primary">Perfil de Empresa</h3>
 <p className="text-xs text-gray-500 mt-1">Identidad fiscal, firma electrónica y establecimientos de su negocio. El ambiente de emisión, secuenciales y formatos se configuran en la pestaña <span className="font-bold text-primary">Facturación Electrónica</span>.</p>
 </div>

 {/* ALERTA RUC INACTIVO */}
 {!companyProfile.rucActivo && (
 <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 dark:text-red-400 text-xs flex items-center gap-2 animate-pulse">
 <AlertTriangle size={16} className="shrink-0" />
 <span className="font-bold">Facturación Electrónica Deshabilitada: El RUC de la empresa está suspendido o inactivo. El sistema solo emitirá recibos contables.</span>
 </div>
 )}

 {/* ALERTA FIRMA INCOMPATIBLE */}
 {companyProfile.certificadoCargado && !isFirmaMatch() && (
 <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 dark:text-red-400 text-xs flex items-center gap-2">
 <AlertTriangle size={16} className="shrink-0" />
 <span className="font-bold">Error de Validación: La firma electrónica activa pertenece al RUC {companyProfile.certificadoRuc} ({getPersonaTipoStr(companyProfile.certificadoRuc)}), el cual no coincide con el RUC de la empresa ({companyProfile.ruc}). Por favor, ingrese una firma que coincida o elimine la firma actual.</span>
 </div>
 )}

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
 
 {/* COLUMNA 1 (IZQUIERDA) */}
 <div className="space-y-6">
 
 {/* CARD 1: DATOS FISCALES DE LA EMPRESA */}
 <div className={`p-5 rounded-card border space-y-4 bg-gray-50/50 border-gray-200`}>
 <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Building size={14} className="text-primary" /> Identificación Fiscal
 </h4>
 
 {/* RUC CON BUSCADOR SRI */}
 <div className="flex gap-2 items-end">
 <div className="flex-1">
 <label className="label-field label-field-dark flex items-center gap-1">
 <Lock size={10} className="text-gray-400" /> RUC Emisor (13 dígitos)
 </label>
 <input 
 type="text" 
 maxLength={13}
 value={companyProfile.ruc} 
 onChange={e => setCompanyProfile({...companyProfile, ruc: e.target.value})} 
 className={inputClass} 
 placeholder="1790000000001" 
 />
 </div>
 <button
 type="button"
 onClick={handleSRIExtraction}
 disabled={isExtractingSRI}
 className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 shrink-0 bg-primary hover:bg-primary text-white`}
 >
 {isExtractingSRI && <RefreshCw size={12} className="animate-spin" />}
 {isExtractingSRI ?'Consultando...' :'Configurar Empresa'}
 </button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="label-field label-field-dark flex items-center gap-1">
 <Lock size={10} className="text-gray-400" /> Razón Social (Bloqueado)
 </label>
 <input 
 type="text" 
 readOnly
 disabled
 value={companyProfile.razonSocial} 
 className={`${inputClass} opacity-60 bg-gray-500/5 cursor-not-allowed`} 
 placeholder="Razón Social cargada desde el SRI" 
 />
 </div>
 <div>
 <label className="label-field label-field-dark flex items-center gap-1">
 <Lock size={10} className="text-gray-400" /> Nombre Comercial (Bloqueado)
 </label>
 <input 
 type="text" 
 readOnly
 disabled
 value={companyProfile.nombreComercial} 
 className={`${inputClass} opacity-60 bg-gray-500/5 cursor-not-allowed`} 
 placeholder="Nombre Comercial cargado desde el SRI" 
 />
 </div>

 <div className="sm:col-span-2">
 <label className="label-field label-field-dark flex items-center gap-1">
 <Lock size={10} className="text-gray-400" /> Dirección Matriz (Bloqueado)
 </label>
 <input 
 type="text" 
 readOnly
 disabled
 value={companyProfile.direccionMatriz} 
 className={`${inputClass} opacity-60 bg-gray-500/5 cursor-not-allowed`} 
 placeholder="Dirección Matriz cargada desde el SRI" 
 />
 </div>

 {/* ESTADO DEL RUC */}
 {companyProfile.ruc && companyProfile.ruc.length === 13 && (
 <div className={`sm:col-span-2 p-3 rounded-xl flex items-center justify-between text-xs border ${
 companyProfile.rucActivo
 ?'bg-emerald-500/5 border-emerald-500/15 text-emerald-600 dark:text-emerald-400'
 :'bg-red-500/5 border-red-500/15 text-red-500 dark:text-red-400'
 }`}>
 <span className="font-bold flex items-center gap-1">
 <Lock size={11} /> Estado del Contribuyente:
 </span>
 <div className="flex items-center gap-2 font-black">
 <span className={`w-2 h-2 rounded-full ${companyProfile.rucActivo ?'bg-emerald-500' :'bg-red-500'}`}></span>
 {companyProfile.rucEstado} ({companyProfile.rucRegimen})
 </div>
 </div>
 )}
 </div>
 </div>

 {/* CARD 2: INFORMACIÓN DE CONTACTO */}
 <div className={`p-5 rounded-card border space-y-4 bg-gray-50/50 border-gray-200`}>
 <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Phone size={13} className="text-primary" /> Información de Contacto
 </h4>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div>
 <label className="label-field label-field-dark">Teléfono Corporativo</label>
 <input 
 type="text" 
 value={companyProfile.telefono} 
 onChange={e => setCompanyProfile({...companyProfile, telefono: e.target.value})} 
 className={inputClass} 
 placeholder="0999999999" 
 />
 </div>
 <div>
 <label className="label-field label-field-dark">Correo Electrónico de Contacto</label>
 <input 
 type="email" 
 value={companyProfile.email} 
 onChange={e => setCompanyProfile({...companyProfile, email: e.target.value})} 
 className={inputClass} 
 placeholder="contacto@empresa.com" 
 />
 </div>
 <div className="sm:col-span-2">
 <label className="label-field label-field-dark">Sitio Web Corporativo</label>
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

 {/* CARD 2.5: CONFIGURACIÓN DE CORREO SALIENTE (SMTP) */}
 <div className={`p-5 rounded-card border space-y-4 bg-gray-50/50 border-gray-200`}>
 <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Mail size={13} className="text-primary" /> Correo Saliente (SMTP)
 </h4>
 <p className="text-xs text-gray-500 leading-normal">
 Configura tu cuenta de correo para enviar automáticamente los comprobantes electrónicos (XML y PDF) autorizados a tus clientes.
 </p>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="sm:col-span-2">
 <label className="label-field label-field-dark">Servidor SMTP (Host)</label>
 <input 
 type="text" 
 value={companyProfile.smtpHost ||''} 
 onChange={e => setCompanyProfile({...companyProfile, smtpHost: e.target.value})} 
 className={inputClass} 
 placeholder="smtp.gmail.com o mail.tuempresa.com" 
 />
 </div>
 <div>
 <label className="label-field label-field-dark">Puerto SMTP</label>
 <input 
 type="text" 
 value={companyProfile.smtpPort ||''} 
 onChange={e => setCompanyProfile({...companyProfile, smtpPort: e.target.value})} 
 className={inputClass} 
 placeholder="465 (SSL) o 587 (TLS)" 
 />
 </div>
 <div className="flex items-center gap-2 pt-5">
 <input 
 type="checkbox" 
 id="smtpSecure"
 checked={!!companyProfile.smtpSecure} 
 onChange={e => setCompanyProfile({...companyProfile, smtpSecure: e.target.checked})} 
 className="rounded border-gray-300 text-primary focus:ring-primary h-3.5 w-3.5" 
 />
 <label htmlFor="smtpSecure" className="text-xs font-bold uppercase text-gray-500 cursor-pointer">Usar Conexión Segura (SSL/TLS)</label>
 </div>
 <div>
 <label className="label-field label-field-dark">Usuario / Correo SMTP</label>
 <input 
 type="email" 
 value={companyProfile.smtpUser ||''} 
 onChange={e => setCompanyProfile({...companyProfile, smtpUser: e.target.value})} 
 className={inputClass} 
 placeholder="facturacion@tuempresa.com" 
 />
 </div>
 <div>
 <label className="label-field label-field-dark">Contraseña SMTP</label>
 <input 
 type="password" 
 value={companyProfile.smtpPass ||''} 
 onChange={e => setCompanyProfile({...companyProfile, smtpPass: e.target.value})} 
 className={inputClass} 
 placeholder="••••••••••••" 
 />
 </div>
 </div>
 </div>

 {/* CARD 3: PARÁMETROS TRIBUTARIOS CONTABLES */}
 <div className={`p-5 rounded-card border space-y-4 bg-gray-50/50 border-gray-200`}>
 <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Shield size={13} className="text-primary" /> Parámetros Tributarios
 </h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="flex items-center gap-2 py-1">
 <input 
 type="checkbox" 
 id="obligadoCont" 
 checked={companyProfile.obligadoContabilidad} 
 onChange={e => setCompanyProfile({...companyProfile, obligadoContabilidad: e.target.checked})} 
 className="rounded text-primary focus:ring-primary h-4 w-4 bg-transparent border-gray-300 cursor-pointer"
 />
 <label htmlFor="obligadoCont" className="text-xs font-semibold text-gray-400 cursor-pointer">Obligado a llevar contabilidad</label>
 </div>

 <div>
 <label className="label-field label-field-dark">Tipo de Contribuyente</label>
 <select 
 value={companyProfile.contribuyenteTipo} 
 onChange={e => setCompanyProfile({...companyProfile, contribuyenteTipo: e.target.value, rucRegimen: e.target.value.replace('_','').toUpperCase()})} 
 className={inputClass}
 >
 <option value="general" className="text-black">Régimen General</option>
 <option value="rimpe_popular" className="text-black">RIMPE Popular</option>
 <option value="rimpe_emprendedor" className="text-black">RIMPE Emprendedor</option>
 <option value="microempresas" className="text-black">Microempresas</option>
 </select>
 </div>

 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <input 
 type="checkbox" 
 id="agenteRet" 
 checked={companyProfile.agenteRetencion} 
 onChange={e => setCompanyProfile({...companyProfile, agenteRetencion: e.target.checked})} 
 className="rounded text-primary focus:ring-primary h-4 w-4 bg-transparent border-gray-300 cursor-pointer"
 />
 <label htmlFor="agenteRet" className="text-xs font-semibold text-gray-400 cursor-pointer">Agente de Retención</label>
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
 <div className="flex items-center gap-2">
 <input 
 type="checkbox" 
 id="contEspecial" 
 checked={companyProfile.contribuyenteEspecial} 
 onChange={e => setCompanyProfile({...companyProfile, contribuyenteEspecial: e.target.checked})} 
 className="rounded text-primary focus:ring-primary h-4 w-4 bg-transparent border-gray-300 cursor-pointer"
 />
 <label htmlFor="contEspecial" className="text-xs font-semibold text-gray-400 cursor-pointer">Contribuyente Especial</label>
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

 {/* COLUMNA 2 (DERECHA) */}
 <div className="space-y-6">

 {/* FIRMA ELECTRÓNICA CARD */}
 <div className={`p-5 rounded-card border space-y-4 ${
 companyProfile.certificadoCargado
 ? !isFirmaMatch()
 ?'bg-red-500/5 border-red-500/20 text-red-900 dark:text-red-300'
 :'bg-emerald-50/50 border-emerald-200 text-emerald-900'
 :'bg-gray-50/50 border-gray-200'
 }`}>
 <div className="flex justify-between items-center">
 <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Award size={14} className="text-purple-500" /> Firma Electrónica (.p12 / .pfx)
 </h4>
 </div>

 {companyProfile.certificadoCargado ? (
 <div className="space-y-3">
 <div className="flex gap-3 items-start text-xs">
 {!isFirmaMatch() ? (
 <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500 animate-pulse" />
 ) : (
 <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-500" />
 )}
 <div className="flex-1 min-w-0">
 <p className="font-bold text-xs uppercase tracking-wider">
 {!isFirmaMatch() ?'Firma Incompatible con RUC' :'Firma Electrónica Activa'}
 </p>
 <p className="text-xs opacity-80 mt-1 truncate font-mono">Archivo: {companyProfile.certificadoNombre}</p>
 <p className="text-xs opacity-80 mt-0.5 font-semibold">Vence: {companyProfile.certificadoVence}</p>
 {companyProfile.certificadoRuc && (
 <p className="text-xs opacity-80 mt-0.5">RUC/CI Firma: {companyProfile.certificadoRuc}</p>
 )}
 {companyProfile.certificadoSujeto && (
 <p className="text-xs opacity-80 mt-0.5 truncate font-medium">Sujeto: {companyProfile.certificadoSujeto}</p>
 )}
 </div>
 </div>

 {/* Advertencia / Info detallada */}
 <p className={`text-xs p-2.5 rounded-xl border leading-relaxed ${
 !isFirmaMatch()
 ?'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400'
 :'bg-emerald-100/50 border-emerald-200 text-emerald-800'
 }`}>
 {!isFirmaMatch()
 ?`El RUC/CI de la firma (${companyProfile.certificadoRuc}) no coincide con el RUC de la empresa (${companyProfile.ruc}) por identificación (cédula/RUC) ni Razón Social.`
 :'Firma electrónica verificada y lista para facturar en el SRI.'}
 </p>

 <div className="flex justify-end pt-1">
 <button
 type="button"
 onClick={() => setIsFirmaOpen(true)}
 className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-purple-500/30 hover:bg-purple-500/10 text-purple-400 transition-colors"
 >
 Actualizar Firma
 </button>
 </div>
 </div>
 ) : (
 <div className="space-y-3 text-center py-2">
 <p className="text-xs text-gray-500 leading-normal">
 Configure su firma digital (.p12 / .pfx) para firmar comprobantes autorizados del SRI.
 </p>
 <button
 type="button"
 onClick={() => setIsFirmaOpen(true)}
 disabled={!companyProfile.ruc}
 className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
 companyProfile.ruc
 ?'bg-purple-600 hover:bg-purple-500 text-white'
 :'bg-gray-500/10 border border-white/5 text-gray-500 cursor-not-allowed'
 }`}
 >
 <Award size={13} /> Ingresar Firma
 </button>
 {!companyProfile.ruc && (
 <p className="text-xs text-gray-500 italic">Debe ingresar y configurar su RUC primero.</p>
 )}
 </div>
 )}
 </div>

 {/* LOGOTIPO OFICIAL */}
 <div className={`p-5 rounded-card border space-y-4 bg-gray-50/50 border-gray-200`}>
 <label className="block text-xs font-bold uppercase mb-1.5 text-gray-500 text-center">Logotipo Oficial de la Empresa</label>

 {companyProfile.logoUrl ? (
 <div className="flex flex-col items-center justify-center gap-3 p-4 rounded-card border border-dashed border-emerald-500/30 bg-emerald-500/5">
 <div className="w-32 h-32 flex items-center justify-center bg-white rounded-card p-2 border border-gray-100">
 <img src={companyProfile.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
 </div>
 <div className="text-center">
 <p className="text-xs font-bold text-emerald-450">Logotipo Guardado</p>
 <button
 type="button"
 onClick={handleRemoveLogo}
 className="text-xs text-red-500 hover:text-red-700 hover:underline font-bold mt-1.5 flex items-center justify-center gap-1 m-auto"
 >
 <Trash2 size={10} /> Eliminar Logotipo
 </button>
 </div>
 </div>
 ) : (
 <div>
 <label className={`w-full flex flex-col items-center justify-center gap-3 p-8 rounded-card border border-dashed cursor-pointer transition-all border-gray-300 hover:border-primary/40 hover:bg-gray-100/50 text-gray-650`}>
 <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
 <UploadCloud size={28} className={isUploadingLogo ?'animate-bounce text-primary' :'text-gray-450'} />
 <span className="text-xs font-semibold text-center leading-normal">
 {isUploadingLogo ?'Subiendo imagen...' :'Subir Logotipo\n(PNG, JPG, SVG)'}
 </span>
 </label>
 <p className="text-xs text-gray-500 mt-2.5 text-center leading-relaxed">
 Este logotipo se insertará en el encabezado de todas las Facturas, Notas de Crédito, Guías de Remisión y Cotizaciones.
 </p>
 </div>
 )}
 </div>

 {/* CARD 3: ESTABLECIMIENTOS DEL SRI (Bloqueado) */}
 <div className={`p-5 rounded-card border space-y-4 bg-gray-50/50 border-gray-200`}>
 <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Lock size={12} className="text-gray-400" /> Establecimientos del SRI (Bloqueado)
 </h4>

 <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
 {companyProfile.sucursales && companyProfile.sucursales.map(branch => (
 <div key={branch.codigo} className={`p-3 rounded-xl border space-y-2 bg-white border-gray-200 opacity-85`}>
 <div className="flex justify-between items-start">
 <div>
 <p className="text-xs font-black flex items-center gap-1 text-gray-700 dark:text-gray-200">
 <Building size={11} className="text-gray-500" /> {branch.codigo} - {branch.nombre}
 </p>
 <p className="text-xs text-gray-500 mt-0.5">{branch.direccion}</p>
 </div>
 <span className={`text-xs font-black uppercase px-1.5 py-0.5 rounded ${
 branch.activa 
 ?'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' 
 :'bg-red-500/10 text-red-450 border border-red-500/20'
 }`}>
 {branch.activa ?'Activo' :'Inactivo'}
 </span>
 </div>

 {/* Checkboxes de bodegas asociadas a esta sucursal */}
 <div className="pt-2 border-t border-gray-200 dark:border-white/5 space-y-1">
 <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Bodegas Asignadas:</p>
 <div className="flex flex-wrap gap-x-3 gap-y-1">
 {companyProfile.customBodegas || companyProfile.bodegas ? (companyProfile.bodegas.map(whName => {
 const isAssoc = branch.bodegas && branch.bodegas.includes(whName);
 return (
 <label key={whName} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-white dark:hover:text-white">
 <input 
 type="checkbox" 
 checked={isAssoc}
 onChange={() => handleToggleWarehouseForBranch(branch.codigo, whName)}
 className="rounded text-primary h-3.5 w-3.5 bg-transparent border-gray-300 cursor-pointer"
 />
 {whName}
 </label>
 );
 })) : null}
 </div>
 </div>
 </div>
 ))}
 {(!companyProfile.sucursales || companyProfile.sucursales.length === 0) && (
 <p className="text-xs text-gray-500 italic">No hay establecimientos cargados. Ingrese su RUC arriba y pulse configurar.</p>
 )}
 </div>
 </div>

 {/* CARD 4: BODEGAS DE INVENTARIO (Manual) */}
 <div className={`p-5 rounded-card border space-y-4 bg-gray-50/50 border-gray-200`}>
 <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
 <Package size={14} className="text-emerald-500" /> Bodegas de Inventario (Manual)
 </h4>

 <div className={`flex flex-wrap gap-2 min-h-[60px] p-3 rounded-card border border-dashed border-gray-300 bg-white align-middle`}>
 {companyProfile.bodegas.map(wh => (
 <div key={wh} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-gray-800 border border-gray-200`}>
 <span>{wh}</span>
 {wh !=='Bodega Central' && (
 <button 
 type="button" 
 onClick={() => handleRemoveWarehouse(wh)}
 className="text-red-500 hover:text-red-700 font-black ml-1 text-sm leading-none"
 >
 ×
 </button>
 )}
 </div>
 ))}
 </div>

 {/* Agregar Bodega */}
 <div className="flex gap-2">
 <input 
 type="text" 
 placeholder="Nombre de Bodega (ej. Almacén Central)" 
 value={newWarehouseName} 
 onChange={e => setNewWarehouseName(e.target.value)} 
 className={inputClass} 
 />
 <button 
 type="button" 
 onClick={handleAddWarehouse}
 className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shrink-0 transition-transform active:scale-95"
 >
 Agregar Bodega
 </button>
 </div>
 </div>

 </div>

 </div>

 {/* BOTONES DE ACCIÓN PRINCIPALES */}
 <div className="flex justify-end items-center pt-6 border-t border-white/5 mt-8">
 {(!companyProfile.certificadoCargado || isFirmaMatch()) ? (
 <button 
 type="submit" 
 className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white transition-transform hover:-translate-y-0.5 active:scale-95 animate-in fade-in duration-200"
 >
 <Save size={14} /> Guardar Empresa
 </button>
 ) : (
 <div className="text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/25 px-4 py-2.5 rounded-xl flex items-center gap-2">
 <AlertTriangle size={14} className="shrink-0" />
 <span>Firma no coincide con RUC/Razón Social. Corrija para habilitar Guardar Empresa.</span>
 </div>
 )}
 </div>
 </form>
 )}

 {/* PESTAÑA: FACTURACIÓN ELECTRÓNICA */}
 {activeSubTab ==='einvoicing' && (
 <div className="animate-in fade-in duration-200">
 <div className="border-b border-white/5 pb-3 mb-6">
 <h3 className="text-sm font-black uppercase tracking-wider text-primary">Facturación Electrónica (SRI)</h3>
 <p className="text-xs text-gray-500 mt-1">Configure el ambiente de emisión, los secuenciales de cada comprobante y los formatos de impresión. El certificado de firma electrónica se gestiona en la pestaña Perfil de Empresa.</p>
 </div>
 <FinanceSettings showToast={showToast} db={db} storage={storage} appId={appId} />
 </div>
 )}

 {/* PESTAÑA: APARIENCIA Y TEMA */}
 {activeSubTab ==='appearance' && (
 <form onSubmit={handleSaveAppearance} className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-white/5 pb-3">
 <h3 className="text-sm font-black uppercase tracking-wider text-primary">Apariencia y Personalización de Marca</h3>
 <p className="text-xs text-gray-500 mt-1">Configura el color de acento de tu ERP para alinearlo con la identidad visual de tu empresa. El color elegido se aplicará a botones, enlaces activos e indicadores del sistema.</p>
 </div>

 <div className="space-y-4">
 <div>
 <label className="label-field label-field-dark">Color Primario del Sistema (Hexadecimal)</label>
 <div className="flex items-center gap-3">
 <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-300 dark:border-white/10 shrink-0">
 <input 
 type="color" 
 value={primaryColor ||'#4F46E5'} 
 onChange={e => setPrimaryColor(e.target.value)} 
 className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer"
 />
 </div>
 <div className="flex-1">
 <input 
 type="text" 
 value={primaryColor ||'#4F46E5'} 
 onChange={e => {
 let val = e.target.value;
 if (val && !val.startsWith('#')) val ='#' + val;
 setPrimaryColor(val);
 }} 
 maxLength={7}
 className={inputClass} 
 placeholder="#4F46E5" 
 />
 </div>
 </div>
 </div>

 {/* Sugerencias Rápidas */}
 <div>
 <label className="label-field label-field-dark">Colores Recomendados</label>
 <div className="flex flex-wrap gap-2">
 {[
 { name:'Azul WebFix', hex:'#4F46E5' },
 { name:'Esmeralda', hex:'#10b981' },
 { name:'Índigo', hex:'#6366f1' },
 { name:'Violeta', hex:'#8b5cf6' },
 { name:'Naranja', hex:'#f97316' },
 { name:'Rojo', hex:'#ef4444' },
 { name:'Gris Oscuro', hex:'#374151' }
 ].map(preset => (
 <button
 key={preset.hex}
 type="button"
 onClick={() => setPrimaryColor(preset.hex)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105"
 style={{
 borderColor: primaryColor === preset.hex ? primaryColor :'rgba(0,0,0,0.08)',
 backgroundColor: primaryColor === preset.hex ?'color-mix(in srgb,' + preset.hex +' 10%, transparent)' :'transparent',
 color: primaryColor === preset.hex ?'#000000' :'inherit'
 }}
 >
 <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.hex }}></span>
 <span>{preset.name}</span>
 </button>
 ))}
 </div>
 </div>
 </div>

 <div className="flex justify-end pt-4 border-t border-white/5">
 <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white transition-transform hover:-translate-y-0.5">
 <Save size={14} /> Guardar Apariencia
 </button>
 </div>
 </form>
 )}

 {/* PESTAÑA: MODULOS ERP (ACTIVACION / DESACTIVACION) */}
 {activeSubTab ==='modules' && (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-white/5 pb-3">
 <h3 className="text-sm font-black uppercase tracking-wider text-primary">Activación y Desactivación de Módulos</h3>
 <p className="text-xs text-gray-500 mt-1">Personaliza tu espacio de trabajo desactivando los módulos que no utilices. Los cambios se reflejarán inmediatamente en el menú de navegación izquierdo.</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {/* CARD: PROYECTOS */}
 <div className={`p-4 rounded-card border flex flex-col justify-between bg-gray-50 border-gray-200`}>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="p-2 rounded-xl bg-primary/10 text-primary"><LayoutDashboard size={18} /></span>
 <span className="text-xs px-2 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase">Núcleo</span>
 </div>
 <h4 className="text-xs font-bold font-sans">Proyectos y Tableros</h4>
 <p className="text-xs text-gray-500 leading-normal">Mi Espacio, control de tareas Kanban, priorización de sprints y bitácoras.</p>
 </div>
 <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
 <span className="text-xs text-gray-400 font-bold">Estado</span>
 <button type="button" onClick={() => handleToggleModule('dashboard')} className="text-emerald-500"><ToggleRight size={30} /></button>
 </div>
 </div>

 {/* CARD: VENTAS */}
 <div className={`p-4 rounded-card border flex flex-col justify-between bg-gray-50 border-gray-200`}>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><ShoppingCart size={18} /></span>
 <button type="button" onClick={() => handleToggleModule('ventas')}>
 {activeModules.ventas ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
 </button>
 </div>
 <h4 className="text-xs font-bold font-sans">Ventas y Facturación</h4>
 <p className="text-xs text-gray-500 leading-normal">Bandeja de facturas, Cotizaciones comerciales y Punto de venta (POS) en pantalla completa.</p>
 </div>
 <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
 <span className="text-xs text-gray-400 font-bold">Estado</span>
 <span className={`text-xs font-black uppercase ${activeModules.ventas ?'text-emerald-400' :'text-gray-500'}`}>
 {activeModules.ventas ?'Activado' :'Desactivado'}
 </span>
 </div>
 </div>

 {/* CARD: CONTABILIDAD */}
 <div className={`p-4 rounded-card border flex flex-col justify-between bg-gray-50 border-gray-200`}>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><DollarSign size={18} /></span>
 <button type="button" onClick={() => handleToggleModule('finances')}>
 {activeModules.finances ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
 </button>
 </div>
 <h4 className="text-xs font-bold font-sans">Contabilidad y Retenciones</h4>
 <p className="text-xs text-gray-500 leading-normal">Gestión contable, retenciones del SRI, Cuentas por Cobrar (CxC), Cuentas por Pagar (CxP) y reportes.</p>
 </div>
 <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
 <span className="text-xs text-gray-400 font-bold">Estado</span>
 <span className={`text-xs font-black uppercase ${activeModules.finances ?'text-emerald-400' :'text-gray-500'}`}>
 {activeModules.finances ?'Activado' :'Desactivado'}
 </span>
 </div>
 </div>

 {/* CARD: INVENTARIO */}
 <div className={`p-4 rounded-card border flex flex-col justify-between bg-gray-50 border-gray-200`}>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="p-2 rounded-xl bg-sky-500/10 text-sky-500"><Package size={18} /></span>
 <button type="button" onClick={() => handleToggleModule('inventario')}>
 {activeModules.inventario ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
 </button>
 </div>
 <h4 className="text-xs font-bold font-sans">Catálogo e Inventario</h4>
 <p className="text-xs text-gray-500 leading-normal">Control de stock de productos, mínimos críticos y configuración fiscal individual de IVA.</p>
 </div>
 <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
 <span className="text-xs text-gray-400 font-bold">Estado</span>
 <span className={`text-xs font-black uppercase ${activeModules.inventario ?'text-emerald-400' :'text-gray-500'}`}>
 {activeModules.inventario ?'Activado' :'Desactivado'}
 </span>
 </div>
 </div>

 {/* CARD: PERSONAS */}
 <div className={`p-4 rounded-card border flex flex-col justify-between bg-gray-50 border-gray-200`}>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="p-2 rounded-xl bg-teal-500/10 text-teal-500"><Users size={18} /></span>
 <button type="button" onClick={() => handleToggleModule('personas')}>
 {activeModules.personas ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
 </button>
 </div>
 <h4 className="text-xs font-bold font-sans">Gestión de Personas</h4>
 <p className="text-xs text-gray-500 leading-normal">Directorio unificado de Clientes y Proveedores con RUC/Identificación del SRI.</p>
 </div>
 <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
 <span className="text-xs text-gray-400 font-bold">Estado</span>
 <span className={`text-xs font-black uppercase ${activeModules.personas ?'text-emerald-400' :'text-gray-500'}`}>
 {activeModules.personas ?'Activado' :'Desactivado'}
 </span>
 </div>
 </div>

 {/* CARD: CALENDARIO */}
 <div className={`p-4 rounded-card border flex flex-col justify-between bg-gray-50 border-gray-200`}>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500"><Calendar size={18} /></span>
 <button type="button" onClick={() => handleToggleModule('calendar')}>
 {activeModules.calendar ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
 </button>
 </div>
 <h4 className="text-xs font-bold font-sans">Calendario de Eventos</h4>
 <p className="text-xs text-gray-500 leading-normal">Planificación interna, sincronización con Google Calendar y enlaces de Google Meet.</p>
 </div>
 <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
 <span className="text-xs text-gray-400 font-bold">Estado</span>
 <span className={`text-xs font-black uppercase ${activeModules.calendar ?'text-emerald-400' :'text-gray-500'}`}>
 {activeModules.calendar ?'Activado' :'Desactivado'}
 </span>
 </div>
 </div>

 {/* CARD: EQUIPO */}
 <div className={`p-4 rounded-card border flex flex-col justify-between bg-gray-50 border-gray-200`}>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500"><Users size={18} /></span>
 <button type="button" onClick={() => handleToggleModule('team')}>
 {activeModules.team ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
 </button>
 </div>
 <h4 className="text-xs font-bold font-sans">Equipo de Trabajo</h4>
 <p className="text-xs text-gray-500 leading-normal">Gestión interna de colaboradores de este espacio, roles y asignación de tareas.</p>
 </div>
 <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
 <span className="text-xs text-gray-400 font-bold">Estado</span>
 <span className={`text-xs font-black uppercase ${activeModules.team ?'text-emerald-400' :'text-gray-500'}`}>
 {activeModules.team ?'Activado' :'Desactivado'}
 </span>
 </div>
 </div>

 {/* CARD: COMPRAS */}
 <div className={`p-4 rounded-card border flex flex-col justify-between bg-gray-50 border-gray-200`}>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><ShoppingCart size={18} /></span>
 <button type="button" onClick={() => handleToggleModule('compras')}>
 {activeModules.compras ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
 </button>
 </div>
 <h4 className="text-xs font-bold font-sans">Módulo de Compras (SRI / ATS)</h4>
 <p className="text-xs text-gray-500 leading-normal">Gestión de facturas recibidas del SRI, gastos con categorización de IA y retenciones de compras.</p>
 </div>
 <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
 <span className="text-xs text-gray-400 font-bold">Estado</span>
 <span className={`text-xs font-black uppercase ${activeModules.compras ?'text-emerald-400' :'text-gray-500'}`}>
 {activeModules.compras ?'Activado' :'Desactivado'}
 </span>
 </div>
 </div>

 {/* CARD: GASTOS Y CRÉDITOS */}
 <div className={`p-4 rounded-card border flex flex-col justify-between bg-gray-50 border-gray-200`}>
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="p-2 rounded-xl bg-pink-500/10 text-pink-500"><CreditCard size={18} /></span>
 <button type="button" onClick={() => handleToggleModule('gastos_creditos')}>
 {activeModules.gastos_creditos ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-gray-500" />}
 </button>
 </div>
 <h4 className="text-xs font-bold font-sans">Gastos y Pasivos Financieros</h4>
 <p className="text-xs text-gray-500 leading-normal">Control financiero de préstamos bancarios, créditos comerciales de locales y tarjetas de crédito.</p>
 </div>
 <div className="flex justify-between items-center mt-6 border-t border-white/5 pt-3">
 <span className="text-xs text-gray-400 font-bold">Estado</span>
 <span className={`text-xs font-black uppercase ${activeModules.gastos_creditos ?'text-emerald-400' :'text-gray-500'}`}>
 {activeModules.gastos_creditos ?'Activado' :'Desactivado'}
 </span>
 </div>
 </div>
 </div>
 </div>
 )}

 {/* PESTAÑA: GOOGLE WORKSPACE */}
 {activeSubTab ==='workspace' && (
 <form onSubmit={handleSaveWorkspace} className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-white/5 pb-3">
 <h3 className="text-sm font-black uppercase tracking-wider text-primary">Integración con Google Workspace</h3>
 <p className="text-xs text-gray-500 mt-1">Conecta tu calendario de Google Calendar oficial para agendar citas directamente desde las tareas del ERP y autogenerar enlaces de Google Meet.</p>
 </div>

 <div>
 <label className="label-field label-field-dark">Google Client ID (OAuth 2.0)</label>
 <input 
 type="text" 
 value={googleClientId} 
 onChange={(e) => setGoogleClientId(e.target.value)} 
 className={inputClass} 
 placeholder="ej. 123456789-abcdefg.apps.googleusercontent.com" 
 />
 </div>
 
 <div className={`p-4 rounded-card border text-xs leading-normal space-y-2 bg-primary-light border-primary/20 text-primary`}>
 <p className="font-bold uppercase tracking-wider text-xs">Instrucciones de Vinculación:</p>
 <ol className="list-decimal pl-4 space-y-1.5">
 <li>Ingresa a la consola de <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline font-bold">Google Cloud</a>.</li>
 <li>Crea un proyecto y habilita la API de <strong>Google Calendar</strong>.</li>
 <li>En la pestaña"Pantalla de consentimiento OAuth", configura los alcances de lectura y escritura de eventos.</li>
 <li>Crea las credenciales de tipo <strong>ID de cliente OAuth</strong> para una Aplicación Web.</li>
 <li>Copia el ID resultante y pégalo arriba. Guarda los cambios.</li>
 </ol>
 </div>

 <div className="flex justify-end pt-4 border-t border-white/5">
 <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white transition-transform hover:-translate-y-0.5">
 <Save size={14} /> Guardar Conexión Google
 </button>
 </div>
 </form>
 )}

 {/* PESTAÑA: GOOGLE GEMINI (INTELIGENCIA ARTIFICIAL) */}
 {activeSubTab ==='gemini' && (
 <form onSubmit={handleSaveGemini} className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-white/5 pb-3">
 <h3 className="text-sm font-black uppercase tracking-wider text-primary">Google Gemini AI Advisor</h3>
 <p className="text-xs text-gray-500 mt-1">Vincula tu clave de API de Gemini 1.5 Flash para habilitar el diagnóstico estratégico de la empresa. La IA analizará tus tareas, stock crítico de inventario y balances para sugerirte mejoras operativas.</p>
 </div>

 <div className="space-y-4">
 <div>
 <label className="label-field label-field-dark">Clave de API de Gemini (Google AI Studio)</label>
 <div className="flex gap-2">
 <div className="relative flex-1">
 <input 
 type={showKey ?"text" :"password"} 
 value={geminiKey} 
 onChange={(e) => setFormKey(e.target.value)} 
 className={`${inputClass} pr-10`} 
 placeholder="AIzaSy..." 
 />
 <button
 type="button"
 onClick={() => setShowKey(!showKey)}
 className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-650 dark:hover:text-white"
 >
 {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
 </button>
 </div>
 <button
 type="button"
 onClick={handleTestGeminiKey}
 disabled={testingKey}
 className={`px-4 rounded-xl text-xs font-bold transition-all border shrink-0 ${
 testingKey 
 ?'bg-gray-500/10 text-gray-400 border-gray-500/20 cursor-not-allowed'
 :'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-800'
 }`}
 >
 {testingKey ?'Probando...' :'Probar Clave'}
 </button>
 </div>
 </div>

 {testResult && (
 <div className={`p-3 rounded-xl border text-xs leading-relaxed font-semibold transition-all duration-300 ${
 testResult.success 
 ?'bg-emerald-50 border-emerald-250 text-emerald-850'
 :'bg-red-50 border-red-200 text-red-850'
 }`}>
 <p className="flex items-center gap-1.5 font-bold">
 {testResult.success ? <CheckCircle2 size={13} className="text-emerald-505 shrink-0" /> : <AlertTriangle size={13} className="text-red-550 shrink-0" />}
 <span>{testResult.message}</span>
 </p>
 </div>
 )}
 </div>

 <div className={`p-4 rounded-card border text-xs leading-normal space-y-1.5 bg-purple-50 border-purple-200 text-purple-900`}>
 <p className="font-bold text-xs uppercase tracking-wider">¿Cómo obtener una clave de API gratuita?</p>
 <p>Puedes generar tu clave de API de Gemini ingresando a <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="underline font-bold">Google AI Studio</a> con tu cuenta de correo corporativo o personal de Google. Generar la clave toma 1 minuto y te dará acceso inmediato al asesor de Inteligencia Artificial.</p>
 </div>

 <div className="flex justify-end pt-4 border-t border-white/5">
 <button type="submit" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-primary hover:bg-primary-hover text-white transition-transform hover:-translate-y-0.5">
 <Save size={14} /> Guardar Clave Gemini
 </button>
 </div>
 </form>
 )}

 {/* PESTAÑA: USUARIOS Y ROLES */}
 {activeSubTab ==='users' && (
 <div className="space-y-6 animate-in fade-in duration-200">
 <div className="border-b border-white/5 pb-3">
 <h3 className="text-sm font-black uppercase tracking-wider text-primary">Gestión de Usuarios de este Espacio</h3>
 <p className="text-xs text-gray-500 mt-1">Colaboradores registrados con acceso a este ERP. Puedes crear, asignar roles o revocar permisos.</p>
 </div>

 {/* LISTA DE USUARIOS */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 {localUsers.map(user => (
 <div key={user.id} className={`p-4 rounded-card border flex items-center justify-between bg-gray-50 border-gray-200`}>
 <div className="flex items-center gap-3">
 <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${user.color ||'from-gray-400 to-gray-600'} flex items-center justify-center text-xs font-bold text-white shrink-0 shadow`}>
 {user.initials}
 </div>
 <div>
 <p className="text-xs font-bold">{user.name}</p>
 <p className="text-xs text-gray-500">{user.job} — <span className="font-semibold uppercase tracking-wider text-xs">{user.role}</span></p>
 {user.email && <p className="text-xs font-mono text-gray-400 truncate max-w-[160px]">{user.email}</p>}
 </div>
 </div>
 <button 
 onClick={() => handleDeleteUser(user.id)}
 className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/10 transition-colors"
 >
 <Trash2 size={13} />
 </button>
 </div>
 ))}
 </div>

 {/* FORMULARIO AGREGAR USUARIO */}
 <form onSubmit={handleAddUser} className={`p-5 rounded-card border space-y-4 bg-gray-100/50 border-gray-250`}>
 <h4 className="text-xs font-black uppercase tracking-wider text-gray-500">Registrar Nuevo Colaborador</h4>
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
 <button type="submit" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white">
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
 <h3 className="text-sm font-black uppercase tracking-wider text-primary">Copia de Seguridad y Respaldos</h3>
 <p className="text-xs text-gray-500 mt-1">Respalda localmente toda la base de datos de tu espacio de trabajo para mayor seguridad. Descarga un archivo estructurado en JSON listo para ser restaurado.</p>
 </div>

 <div className={`p-5 rounded-card border flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50 border-gray-200`}>
 <div className="space-y-1 text-xs">
 <p className="font-bold">Respaldar Datos del ERP</p>
 <p className="text-xs text-gray-500 leading-normal">Incluye Proyectos, Tareas, Clientes, Proveedores, Transacciones y Configuraciones.</p>
 </div>

 <button 
 onClick={handleDownloadBackup}
 className={`flex justify-center items-center gap-2 px-5 py-3 rounded-card text-xs font-black transition-all hover:-translate-y-0.5 uppercase tracking-wider shrink-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-250 border border-emerald-300`}
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
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 overflow-y-auto animate-in fade-in duration-300">
 <div className="relative w-full max-w-md rounded-card border border-white/10 bg-text-primary p-6 text-gray-300 animate-in zoom-in-95 duration-200">
 
 {/* Cabecera */}
 <div className="flex justify-between items-start pb-4 border-b border-white/5 mb-4">
 <div className="flex items-center gap-2">
 <Award size={18} className="text-purple-400" />
 <div>
 <h3 className="text-sm font-black uppercase tracking-wider text-purple-400">Firma Electrónica</h3>
 <p className="text-xs text-gray-500">Cargar archivo de firma digital (.p12 / .pfx)</p>
 </div>
 </div>
 <button 
 type="button" 
 onClick={() => setIsFirmaOpen(false)}
 className="text-gray-400 hover:text-white transition-colors"
 >
 <X size={16} />
 </button>
 </div>

 {/* Contenido */}
 <div className="space-y-4">
 
 {tempFirma.certificadoCargado ? (
 <div className="space-y-3.5">
 <div className={`p-4 rounded-xl border space-y-2.5 transition-all duration-300 ${
 certValidation.tipo ==='success' 
 ?'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
 : certValidation.tipo ==='warning'
 ?'bg-amber-500/10 border-amber-500/20 text-amber-450' 
 :'bg-red-500/10 border-red-500/20 text-red-400'
 }`}>
 <div className="flex justify-between items-start">
 <div className="truncate pr-2">
 <p className="text-xs font-black truncate">{tempFirma.certificadoNombre}</p>
 {certValidation.sujeto && <p className="text-xs font-bold mt-1.5 text-gray-400">Sujeto: <span className="font-extrabold text-gray-200">{certValidation.sujeto}</span></p>}
 {certValidation.emisor && <p className="text-xs opacity-80 mt-0.5">Emisor: {certValidation.emisor}</p>}
 {certValidation.vence && <p className="text-xs opacity-80 mt-0.5 font-mono">Expira: {certValidation.vence}</p>}
 {certValidation.ruc && <p className="text-xs opacity-85 mt-0.5 font-bold">RUC Firma: {certValidation.ruc}</p>}
 </div>
 <button 
 type="button" 
 onClick={removeCertificate} 
 className="text-xs font-bold text-red-500 hover:text-red-400 hover:underline shrink-0"
 >
 Quitar
 </button>
 </div>

 <div className="flex items-start gap-1.5 border-t border-current/10 pt-2.5">
 {certValidation.tipo ==='success' && <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />}
 {certValidation.tipo ==='warning' && <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" />}
 {certValidation.tipo ==='error' && <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-500" />}
 <p className="text-xs leading-relaxed font-semibold">
 {certValidation.mensaje}
 </p>
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="block text-xs font-bold uppercase text-gray-500">Contraseña de la Firma</label>
 <div className="flex gap-2">
 <input 
 type="password" 
 value={tempFirma.certificadoClave} 
 onChange={e => setTempFirma({...tempFirma, certificadoClave: e.target.value})} 
 className={inputClass} 
 placeholder="Ingrese la contraseña" 
 />
 <button 
 type="button" 
 onClick={() => verifySignatureDetails(tempFirma.certificadoBase64, tempFirma.certificadoClave, companyProfile.ruc ||'')}
 className="px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary active:scale-95"
 >
 Verificar
 </button>
 </div>
 </div>
 </div>
 ) : (
 <div className="space-y-3">
 <label className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-card border border-dashed border-white/20 hover:bg-white/5 hover:border-purple-500/40 text-gray-400 cursor-pointer transition-all">
 <input type="file" accept=".p12,.pfx" className="hidden" onChange={handleCertificateUpload} />
 <Award size={24} className="text-gray-500" />
 <span className="text-xs font-semibold">Seleccionar Firma (.p12 / .pfx)</span>
 </label>
 <p className="text-xs text-gray-500 leading-relaxed text-center">
 Su archivo de firma electrónica se almacena de forma segura en la base de datos para realizar la firma en el servidor al emitir comprobantes autorizados por el SRI.
 </p>
 </div>
 )}

 </div>

 {/* Footer */}
 <div className="flex justify-end gap-2.5 pt-4 border-t border-white/5 mt-5">
 <button 
 type="button" 
 onClick={() => setIsFirmaOpen(false)}
 className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
 >
 Cancelar
 </button>
 <button 
 type="button" 
 onClick={handleSaveFirma}
 className="px-4.5 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow transition-transform active:scale-95"
 >
 Guardar Firma
 </button>
 </div>

 </div>
 </div>
 )}

 </div>
 );

 // Helper hook state for key text input
 function setFormKey(val) {
 setGeminiKey(val);
 }
}
