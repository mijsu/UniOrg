import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  DocumentData,
  Query,
  QuerySnapshot,
  DocumentReference
} from 'firebase/firestore';
import { db } from './firebase';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  MEMBERS: 'members',
  ACTIVITIES: 'activities',
  BUDGETS: 'budgets',
  FEEDBACK: 'feedback',
  JOIN_REQUESTS: 'join_requests',
  POSTS: 'posts',
  COMMENTS: 'comments',
  REACTIONS: 'reactions',
  SETTINGS: 'settings'
} as const;

// Helper function to convert Firestore Timestamp to ISO string
export const timestampToISO = (timestamp: Timestamp): string => {
  return timestamp.toDate().toISOString();
};

// Helper function to convert ISO string to Firestore Timestamp
export const isoToTimestamp = (isoString: string): Timestamp => {
  return Timestamp.fromDate(new Date(isoString));
};

// Generic CRUD operations
export const firestoreService = {
  // Create a new document
  async create<T extends DocumentData>(
    collectionName: string,
    data: T,
    customId?: string
  ): Promise<{ id: string; data: T }> {
    let docRef;
    const documentData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (customId) {
      docRef = doc(db, collectionName, customId);
      await setDoc(docRef, documentData);
    } else {
      docRef = await addDoc(collection(db, collectionName), documentData);
    }
    return { id: docRef.id, data };
  },

  // Get a document by ID
  async getById<T extends DocumentData>(
    collectionName: string,
    id: string
  ): Promise<T | null> {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as T;
      // Convert Timestamps to ISO strings
      const convertedData = convertTimestamps(data);
      return { id: docSnap.id, ...convertedData } as T;
    }
    return null;
  },

  // Get all documents from a collection
  async getAll<T extends DocumentData>(collectionName: string): Promise<T[]> {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as T;
      const convertedData = convertTimestamps(data);
      return { id: doc.id, ...convertedData } as T;
    });
  },

  // Query documents with filters
  async query<T extends DocumentData>(
    collectionName: string,
    constraints: any[]
  ): Promise<T[]> {
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as T;
      const convertedData = convertTimestamps(data);
      return { id: doc.id, ...convertedData } as T;
    });
  },

  // Update a document
  async update<T extends DocumentData>(
    collectionName: string,
    id: string,
    data: Partial<T>
  ): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  // Delete a document
  async delete(collectionName: string, id: string): Promise<void> {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  }
};

// Helper function to convert all Timestamps in a document to ISO strings
function convertTimestamps(data: any): any {
  if (!data) return data;

  const result: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Timestamp) {
      result[key] = timestampToISO(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        item instanceof Timestamp ? timestampToISO(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = convertTimestamps(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// Export Firestore utilities
export { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp };
