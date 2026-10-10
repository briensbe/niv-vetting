export interface StoredVettingSource {
  readonly id: string;
  readonly fileName: string;
  readonly adherent: string;
  readonly offer: string;
  readonly origin: 'bundled' | 'imported';
  readonly xmlText: string;
  readonly propertiesText: string;
  readonly propertiesFileName: string | null;
}

interface StoredMetadata<T = unknown> {
  readonly key: string;
  readonly value: T;
}

const databaseName = 'niv-vetting-local';
const databaseVersion = 1;
const sourcesStore = 'sources';
const metadataStore = 'metadata';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Impossible de lire les données locales du catalogue.'));
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ?? new Error('Impossible d’enregistrer les données locales du catalogue.'),
      );
    transaction.onabort = () =>
      reject(
        transaction.error ?? new Error('Enregistrement local du catalogue interrompu.'),
      );
  });
}

export class VettingCatalogStorage {
  private databasePromise: Promise<IDBDatabase> | undefined;

  async getSources(): Promise<StoredVettingSource[]> {
    const database = await this.getDatabase();
    const transaction = database.transaction(sourcesStore, 'readonly');
    const sources = await requestResult(
      transaction.objectStore(sourcesStore).getAll() as IDBRequest<StoredVettingSource[]>,
    );
    await transactionResult(transaction);
    return sources;
  }

  async putSource(source: StoredVettingSource): Promise<void> {
    const database = await this.getDatabase();
    const transaction = database.transaction(sourcesStore, 'readwrite');
    transaction.objectStore(sourcesStore).put(source);
    await transactionResult(transaction);
  }

  async deleteSource(id: string): Promise<void> {
    const database = await this.getDatabase();
    const transaction = database.transaction(sourcesStore, 'readwrite');
    transaction.objectStore(sourcesStore).delete(id);
    await transactionResult(transaction);
  }

  async getMetadata<T>(key: string): Promise<T | undefined> {
    const database = await this.getDatabase();
    const transaction = database.transaction(metadataStore, 'readonly');
    const result = await requestResult(
      transaction.objectStore(metadataStore).get(key) as IDBRequest<StoredMetadata<T> | undefined>,
    );
    await transactionResult(transaction);
    return result?.value;
  }

  async putMetadata<T>(key: string, value: T): Promise<void> {
    const database = await this.getDatabase();
    const transaction = database.transaction(metadataStore, 'readwrite');
    transaction.objectStore(metadataStore).put({ key, value } satisfies StoredMetadata<T>);
    await transactionResult(transaction);
  }

  private getDatabase(): Promise<IDBDatabase> {
    this.databasePromise ??= this.openDatabase();
    return this.databasePromise;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(
        new Error('Le stockage local IndexedDB n’est pas disponible dans ce navigateur.'),
      );
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, databaseVersion);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(sourcesStore)) {
          database.createObjectStore(sourcesStore, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(metadataStore)) {
          database.createObjectStore(metadataStore, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(
          request.error ?? new Error('Impossible d’ouvrir le stockage local du catalogue.'),
        );
      request.onblocked = () =>
        reject(new Error('Le stockage local est bloqué par un autre onglet de l’application.'));
    });
  }
}
