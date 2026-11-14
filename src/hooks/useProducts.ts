import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { Product } from '../types/bakery';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Product[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: String(data.id || docSnap.id),
            name: String(data.name || ''),
            slug: String(data.slug || docSnap.id),
            description: String(data.description || ''),
            category: data.category,
            price500g: Number(data.price500g || 0),
            price1kg: Number(data.price1kg || 0),
            discountPercent: Number(data.discountPercent || 0),
            imageUrl: String(data.imageUrl || ''),
            isAvailable: Boolean(data.isAvailable),
            isEggless: data.isEggless !== false,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : String(data.createdAt || ''),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : String(data.updatedAt || ''),
          } as Product;
        });
        setProducts(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setLoading(false);
        setError('Unable to load live cake menu from Firestore.');
        handleFirestoreError(err, OperationType.LIST, 'products');
      }
    );

    return () => unsubscribe();
  }, []);

  return { products, loading, error };
}
