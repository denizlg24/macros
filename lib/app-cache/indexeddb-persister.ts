"use client"

import type {
  PersistedClient,
  Persister,
} from "@tanstack/query-persist-client-core"

const dbName = "macros-app-query-cache"
const dbVersion = 1
const storeName = "clients"
const clientKey = "app"

interface StoredClient {
  key: string
  client: PersistedClient
}

function openCache() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "key" })
      }
    }

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
) {
  return new Promise<T | undefined>((resolve, reject) => {
    openCache()
      .then((database) => {
        const transaction = database.transaction(storeName, mode)
        const store = transaction.objectStore(storeName)
        const request = callback(store)
        let result: T | undefined

        if (request) {
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            result = request.result
          }
        }

        transaction.oncomplete = () => {
          database.close()
          resolve(result)
        }
        transaction.onerror = () => {
          database.close()
          reject(transaction.error)
        }
      })
      .catch(reject)
  })
}

function isStoredClient(value: unknown): value is StoredClient {
  return (
    typeof value === "object" &&
    value !== null &&
    "key" in value &&
    "client" in value
  )
}

export function createIndexedDbPersister(): Persister {
  return {
    persistClient: async (client) => {
      if (typeof indexedDB === "undefined") return

      await withStore("readwrite", (store) =>
        store.put({ key: clientKey, client })
      )
    },
    restoreClient: async () => {
      if (typeof indexedDB === "undefined") return undefined

      const stored = await withStore("readonly", (store) =>
        store.get(clientKey)
      )

      return isStoredClient(stored) ? stored.client : undefined
    },
    removeClient: async () => {
      if (typeof indexedDB === "undefined") return

      await withStore("readwrite", (store) => store.delete(clientKey))
    },
  }
}
