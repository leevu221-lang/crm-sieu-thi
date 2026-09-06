import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  writeBatch,
  serverTimestamp,
  documentId
} from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * A lightweight adapter that mimics the Supabase fluent API
 * to minimize refactoring effort during migration.
 */
class FirebaseQueryBuilder {
  private tableName: string;
  private constraints: any[] = [];
  private idValue?: string;
  private orderColumn?: string;
  private orderDirection: 'asc' | 'desc' = 'asc';
  private limitCount?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*') {
    return this;
  }

  eq(column: string, value: any) {
    if (column === 'id') {
      this.idValue = value;
    } else {
      if ((this.tableName === 'ql_nguoi_dung' && column === 'username') || 
          (this.tableName === 'user_permissions' && column === 'user_id')) {
        const numVal = Number(value);
        if (typeof value === 'string' && !isNaN(numVal) && value.trim() !== '') {
           this.constraints.push(where(column, 'in', [value, numVal]));
           return this;
        } else if (typeof value === 'number') {
           this.constraints.push(where(column, 'in', [value, String(value)]));
           return this;
        }
      }
      this.constraints.push(where(column, '==', value));
    }
    return this;
  }

  ilike(column: string, value: string) {
    this.constraints.push(where(column, '==', value));
    return this;
  }

  in(column: string, values: any[]) {
    // Include both string and number versions for type-flexible matching
    const expanded: any[] = [];
    values.forEach(v => {
      expanded.push(v);
      if (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '') {
        expanded.push(Number(v));
      } else if (typeof v === 'number') {
        expanded.push(String(v));
      }
    });
    const unique = [...new Set(expanded)];
    if (column === 'id') {
      this.constraints.push(where(documentId(), 'in', unique.map(String).slice(0, 30)));
    } else {
      this.constraints.push(where(column, 'in', unique.slice(0, 30)));
    }
    return this;
  }

  // Basic .or support for the pattern: column.eq.val1,column.eq.val2...
  or(orString: string) {
    try {
      const parts = orString.split(',');
      const column = parts[0].split('.')[0];
      const values: any[] = [];
      parts.forEach(p => {
        const val = p.split('.eq.')[1];
        if (val === undefined) return;
        // Always include string version
        values.push(val);
        // Also include number version if it's a valid number (Firestore is type-strict)
        if (!isNaN(Number(val)) && val.trim() !== '') {
          values.push(Number(val));
        }
      });
      // Deduplicate
      const unique = [...new Set(values)];
      this.constraints.push(where(column, 'in', unique.slice(0, 30))); // Firestore 'in' max 30 values
    } catch (e) {
      console.warn('[FirebaseAdapter] Failed to parse .or():', orString);
    }
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.orderColumn = column;
    this.orderDirection = ascending ? 'asc' : 'desc';
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async single() {
    if (this.idValue) {
      try {
        const docRef = doc(db, this.tableName, String(this.idValue));
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
        }
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    }
    const q = this.buildQuery();
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
    }
    return { data: { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }, error: null };
  }

  async maybeSingle() {
    if (this.idValue) {
      try {
        const docRef = doc(db, this.tableName, String(this.idValue));
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          return { data: null, error: null };
        }
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    }
    const q = this.buildQuery();
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return { data: null, error: null };
    }
    return { data: { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }, error: null };
  }

  async insert(data: any | any[]) {
    try {
      const items = Array.isArray(data) ? data : [data];
      const results = [];
      
      for (const item of items) {
        let docId = item.id;
        if (this.tableName === 'ql_nguoi_dung' && item.username) {
          docId = String(item.username).trim();
        }
        
        if (this.tableName === 'store' && docId) {
          const strId = String(docId).trim();
          if (/(=>|!==|===|!=|==|[{}()<>[\];$\\/`"'])/.test(strId) || /[\r\n\t]/.test(strId) || strId.toUpperCase() === 'ALL' || strId.toUpperCase() === 'TỔNG') {
            console.error(`[FirebaseAdapter.insert] REJECTED INVALID STORE ID: "${strId}"`);
            continue;
          }
        }
        
        let docRef;
        if (docId) {
          docRef = doc(db, this.tableName, String(docId));
          await setDoc(docRef, {
            ...item,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          }, { merge: true });
        } else {
          docRef = await addDoc(collection(db, this.tableName), {
            ...item,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
        }
        results.push({ id: docRef.id, ...item });
      }
      
      return { data: Array.isArray(data) ? results : results[0], error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  async upsert(data: any | any[], { onConflict = 'id' } = {}) {
    try {
      const items = Array.isArray(data) ? data : [data];
      const results = [];

      for (const item of items) {
        let id = item.id;
        if (!id && onConflict) {
          const conflictFields = onConflict.split(',').map((f: string) => f.trim());
          // If multi-column conflict, we need to find the doc first
          if (conflictFields.length > 0) {
            // Try exact match first
            let q = query(collection(db, this.tableName));
            conflictFields.forEach(field => {
              if (item[field] !== undefined) q = query(q, where(field, '==', item[field]));
            });
            let snap = await getDocs(q);
            
            // If not found and a field has a numeric value, try alternate type
            // Firestore is type-strict: '1841' !== 1841
            if (snap.empty) {
              const hasNumericField = conflictFields.some(field => {
                const val = item[field];
                return val !== undefined && !isNaN(Number(val));
              });
              
              if (hasNumericField) {
                // Try with alternate numeric types
                q = query(collection(db, this.tableName));
                conflictFields.forEach(field => {
                  const val = item[field];
                  if (val === undefined) return;
                  if (!isNaN(Number(val)) && String(val).trim() !== '') {
                    // If original is string, try number; if number, try string
                    const altVal = typeof val === 'string' ? Number(val) : String(val);
                    q = query(q, where(field, '==', altVal));
                  } else {
                    q = query(q, where(field, '==', val));
                  }
                });
                snap = await getDocs(q);
              }
            }
            
            if (!snap.empty) id = snap.docs[0].id;
          }
        }
        
        if (this.tableName === 'store' && id) {
          const strId = String(id).trim();
          if (/(=>|!==|===|!=|==|[{}()<>[\];$\\/`"'])/.test(strId) || /[\r\n\t]/.test(strId) || strId.toUpperCase() === 'ALL' || strId.toUpperCase() === 'TỔNG') {
            console.error(`[FirebaseAdapter.upsert] REJECTED INVALID STORE ID: "${strId}"`);
            continue;
          }
        }

        const docRef = id ? doc(db, this.tableName, String(id)) : doc(collection(db, this.tableName));
        await setDoc(docRef, {
          ...item,
          updated_at: serverTimestamp()
        }, { merge: true });
        
        results.push({ id: docRef.id, ...item });
      }

      return { data: Array.isArray(data) ? results : results[0], error: null };
    } catch (error: any) {
      console.error('[FirebaseAdapter] upsert error:', error);
      return { data: null, error };
    }
  }

  update(data: any) {
    this.pendingUpdate = data;
    return this;
  }

  delete() {
    this.pendingDelete = true;
    return this;
  }

  private pendingUpdate: any = null;
  private pendingDelete: boolean = false;

  private async executeUpdate() {
    try {
      if (this.idValue) {
        const docRef = doc(db, this.tableName, String(this.idValue));
        await updateDoc(docRef, {
          ...this.pendingUpdate,
          updated_at: serverTimestamp()
        });
        return { data: [{ id: this.idValue, ...this.pendingUpdate }], error: null };
      }
      const q = this.buildQuery();
      const querySnapshot = await getDocs(q);
      
      const results = [];
      for (const d of querySnapshot.docs) {
        await updateDoc(doc(db, this.tableName, d.id), {
          ...this.pendingUpdate,
          updated_at: serverTimestamp()
        });
        results.push({ id: d.id, ...d.data(), ...this.pendingUpdate });
      }
      
      return { data: results, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  private async executeDelete() {
    try {
      if (this.idValue) {
        await deleteDoc(doc(db, this.tableName, String(this.idValue)));
        return { error: null };
      }
      const q = this.buildQuery();
      const querySnapshot = await getDocs(q);
      
      for (const d of querySnapshot.docs) {
        await deleteDoc(doc(db, this.tableName, d.id));
      }
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      let result: any;
      
      if (this.pendingUpdate) {
        result = await this.executeUpdate();
      } else if (this.pendingDelete) {
        result = await this.executeDelete();
      } else {
        if (this.idValue) {
          const docRef = doc(db, this.tableName, String(this.idValue));
          const docSnap = await getDoc(docRef);
          const data = docSnap.exists() ? [{ id: docSnap.id, ...docSnap.data() }] : [];
          result = { data, error: null };
        } else {
          const q = this.buildQuery();
          const querySnapshot = await getDocs(q);
          const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          result = { data, error: null };
        }
      }
      
      return onfulfilled ? onfulfilled(result) : result;
    } catch (error: any) {
      const result = { data: null, error };
      return onrejected ? onrejected(result) : result;
    }
  }

  catch(onrejected?: (reason: any) => any) {
    return this.then(undefined, onrejected);
  }

  finally(onfinally?: () => void) {
    return this.then(
      res => { if (onfinally) onfinally(); return res; },
      err => { if (onfinally) onfinally(); throw err; }
    );
  }

  private buildQuery() {
    let q = query(collection(db, this.tableName));
    if (this.constraints.length > 0) {
      q = query(q, ...this.constraints);
    }
    if (this.orderColumn) {
      q = query(q, orderBy(this.orderColumn, this.orderDirection));
    }
    if (this.limitCount) {
      q = query(q, limit(this.limitCount));
    }
    return q;
  }
}

export const firebaseAdapter = {
  from: (tableName: string) => new FirebaseQueryBuilder(tableName),
  
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: (callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } })
  },

  channel: (name: string) => {
    return {
      on: function(type: string, filter: any, callback: any) {
        const tableName = filter.table;
        const filterStr = filter.filter; // e.g. "warehouse_code=eq.123"
        let q = query(collection(db, tableName));
        
        if (filterStr) {
          try {
            const [col, valPart] = filterStr.split('=eq.');
            if (valPart !== undefined) {
              const cleanVal = valPart.trim();
              const values: any[] = [cleanVal];
              const num = Number(cleanVal);
              if (!isNaN(num) && cleanVal !== '') {
                values.push(num);
              }
              const uniqueValues = [...new Set(values)];
              if (uniqueValues.length > 1) {
                q = query(q, where(col, 'in', uniqueValues));
              } else {
                q = query(q, where(col, '==', uniqueValues[0]));
              }
            }
          } catch(e) {}
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
              callback({ 
                new: { id: change.doc.id, ...change.doc.data() },
                eventType: change.type === "added" ? "INSERT" : "UPDATE"
              });
            }
          });
        });
        this._unsubscribe = unsubscribe;
        return this;
      },
      subscribe: function(cb: any) { 
        if(cb) cb('SUBSCRIBED');
        return this; 
      },
      _unsubscribe: () => {}
    };
  },
  
  removeChannel: (channel: any) => {
    if (channel && channel._unsubscribe) {
      channel._unsubscribe();
    }
  }
};
