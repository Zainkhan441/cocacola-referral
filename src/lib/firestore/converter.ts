import {
  collection,
  type CollectionReference,
  type DocumentData,
  type Firestore,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  type WithFieldValue,
} from "firebase/firestore";

export function createConverter<
  T extends DocumentData,
>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: WithFieldValue<T>): DocumentData {
      return data as DocumentData;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions,
    ): T {
      return snapshot.data(options) as T;
    },
  };
}

export function typedCollection<T extends DocumentData>(
  db: Firestore,
  path: string,
): CollectionReference<T> {
  return collection(db, path).withConverter(createConverter<T>());
}
