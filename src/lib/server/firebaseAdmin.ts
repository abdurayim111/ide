import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';

// Используем process.env вместо $env/static (надежнее для Vercel)
const USE_EMULATORS = process.env.PUBLIC_USE_FIREBASE_EMULATORS === 'true';

// Получаем переменные из process.env
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('Missing Firebase Admin SDK environment variables');
}

// Создаем service account объект
const serviceAccount: ServiceAccount = {
  projectId: FIREBASE_PROJECT_ID,
  clientEmail: FIREBASE_CLIENT_EMAIL,
  privateKey: FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Важно для правильного формата
};

// Инициализируем Firebase Admin
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: FIREBASE_DATABASE_URL,
});

// Если нужны эмуляторы (только для разработки)
if (USE_EMULATORS) {
  // Настройка эмуляторов для локальной разработки
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = 'localhost:9000';
}

export default firebaseApp;
export { getDatabase, getAuth };