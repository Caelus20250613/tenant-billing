import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getFirestore,
  writeBatch
} from 'firebase/firestore';
import { app } from './firebase';
import { Tenant, MonthlyBillingRecord } from '../types';

export const db = getFirestore(app);

// Collection names
const TENANTS_COLLECTION = 'tenants';
const BILLING_RECORDS_COLLECTION = 'billingRecords';

// Collection references
export const tenantsRef = collection(db, TENANTS_COLLECTION);
export const billingRecordsRef = collection(db, BILLING_RECORDS_COLLECTION);

/**
 * Tenant Operations
 */

export const getTenants = async (): Promise<Tenant[]> => {
  const q = query(tenantsRef, orderBy('sortOrder', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
};

export const getTenant = async (id: string): Promise<Tenant | null> => {
  const docRef = doc(db, TENANTS_COLLECTION, id);
  const snap = await getDoc(docRef);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Tenant) : null;
};

export const createTenant = async (data: Omit<Tenant, 'id'>): Promise<string> => {
  // Use addDoc and then set the id, or just let Firestore handle the id
  const docRef = await addDoc(tenantsRef, data);
  // Optional: update document to include its own id if needed, but usually we just merge doc.id when fetching
  return docRef.id;
};

export const updateTenant = async (id: string, data: Partial<Tenant>): Promise<void> => {
  const docRef = doc(db, TENANTS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const deleteTenant = async (id: string): Promise<void> => {
  const docRef = doc(db, TENANTS_COLLECTION, id);
  await deleteDoc(docRef);
};

/**
 * Billing Record Operations
 */

export const getBillingRecords = async (billingMonth?: string): Promise<MonthlyBillingRecord[]> => {
  let q = query(billingRecordsRef);
  if (billingMonth) {
    q = query(billingRecordsRef, where('billingMonth', '==', billingMonth));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyBillingRecord));
};

export const getBillingRecord = async (id: string): Promise<MonthlyBillingRecord | null> => {
  const docRef = doc(db, BILLING_RECORDS_COLLECTION, id);
  const snap = await getDoc(docRef);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as MonthlyBillingRecord) : null;
};

export const createBillingRecord = async (data: Omit<MonthlyBillingRecord, 'id'>): Promise<string> => {
  const docRef = await addDoc(billingRecordsRef, data);
  return docRef.id;
};

export const updateBillingRecord = async (id: string, data: Partial<MonthlyBillingRecord>): Promise<void> => {
  const docRef = doc(db, BILLING_RECORDS_COLLECTION, id);
  await updateDoc(docRef, data);
};

export const deleteBillingRecord = async (id: string): Promise<void> => {
  const docRef = doc(db, BILLING_RECORDS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const saveBillingRecordsBatch = async (records: MonthlyBillingRecord[]): Promise<void> => {
  const batch = writeBatch(db);
  for (const record of records) {
    const { id, ...data } = record;
    if (id && !id.startsWith('new-')) { // assuming 'new-' prefix means it's not yet in firestore
      const docRef = doc(db, BILLING_RECORDS_COLLECTION, id);
      batch.update(docRef, data); // or setDoc with merge: true
    } else {
      const docRef = doc(billingRecordsRef);
      batch.set(docRef, data);
    }
  }
  await batch.commit();
};

export const seedTenants = async (records: Omit<Tenant, 'id'>[]): Promise<void> => {
  const batch = writeBatch(db);
  for (const record of records) {
    const docRef = doc(tenantsRef);
    batch.set(docRef, record);
  }
  await batch.commit();
};

export const updateBillingRecordsStatus = async (
  recordIds: string[],
  status: 'PENDING' | 'APPROVED' | 'ISSUED'
): Promise<void> => {
  const ids = recordIds.filter(id => id && !id.startsWith('new-'));
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  for (const id of ids) {
    const docRef = doc(db, BILLING_RECORDS_COLLECTION, id);
    batch.update(docRef, { status });
  }
  await batch.commit();
};
