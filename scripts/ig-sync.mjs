// Punto de entrada para GitHub Actions: conecta con Firebase usando la cuenta de servicio
// guardada como secreto del repositorio (FIREBASE_SERVICE_ACCOUNT) y ejecuta la sincronización.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { sincronizar } from './ig-sync-core.mjs';

const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!sa) {
  console.log('Falta el secreto FIREBASE_SERVICE_ACCOUNT: no hay nada que sincronizar todavía.');
  process.exit(0);
}
let cred;
try { cred = JSON.parse(sa); } catch (e) {
  console.log('El secreto FIREBASE_SERVICE_ACCOUNT no es un JSON válido. Copia el archivo completo de la cuenta de servicio.');
  process.exit(1);
}
initializeApp({ credential: cert(cred) });
const resumen = await sincronizar({ db: getFirestore(), fetch: globalThis.fetch });
console.log('Resumen:', JSON.stringify(resumen));
if (resumen.errores && resumen.errores === resumen.marcas) process.exitCode = 1;
