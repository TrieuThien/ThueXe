/**
 * Address suggestion caching with LRU eviction policy
 * Reduces API calls by caching recent searches
 */

export interface CachedSuggestions {
    results: any[]; // AddressSuggestion[]
    timestamp: number; // When cached
}

export class AddressCache {
    private cache: Map<string, CachedSuggestions> = new Map();
    private maxSize: number;
    private ttlMs: number;
    private accessOrder: string[] = []; // For LRU tracking

    constructor(maxSize: number = 50, ttlMinutes: number = 5) {
        this.maxSize = maxSize;
        this.ttlMs = ttlMinutes * 60 * 1000;
    }

    /**
     * Generate cache key from query and bias coordinates
     */
    private generateKey(query: string, biasLat?: number, biasLon?: number): string {
        return `${query}_${biasLat ?? "x"}_${biasLon ?? "y"}`;
    }

    /**
     * Check if cached entry exists and is still valid
     */
    get(query: string, biasLat?: number, biasLon?: number): any[] | null {
        const key = this.generateKey(query, biasLat, biasLon);
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            this.accessOrder = this.accessOrder.filter((k) => k !== key);
            return null;
        }

        // Update LRU - move to end
        this.accessOrder = this.accessOrder.filter((k) => k !== key);
        this.accessOrder.push(key);

        return entry.results;
    }

    /**
     * Store results in cache
     */
    set(query: string, results: any[], biasLat?: number, biasLon?: number): void {
        const key = this.generateKey(query, biasLat, biasLon);

        // If cache is full, remove oldest (LRU)
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const oldestKey = this.accessOrder.shift();
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            results,
            timestamp: Date.now(),
        });

        // Add to access order
        this.accessOrder = this.accessOrder.filter((k) => k !== key);
        this.accessOrder.push(key);
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
        this.accessOrder = [];
    }

    /**
     * Get cache stats for debugging
     */
    getStats(): { size: number; maxSize: number; ttlMinutes: number } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttlMinutes: this.ttlMs / (60 * 1000),
        };
    }
}

/**
 * Request deduplication tracker
 * Avoids duplicate in-flight API requests for same query
 */
export class RequestDeduplicator<T> {
    private inFlightRequests: Map<string, Promise<T>> = new Map();

    /**
     * Execute request, reusing if same key already in-flight
     */
    async execute(key: string, requestFn: () => Promise<T>): Promise<T> {
        // Return existing promise if in-flight
        if (this.inFlightRequests.has(key)) {
            return this.inFlightRequests.get(key)!;
        }

        // Execute new request
        const promise = requestFn()
            .then((result) => {
                this.inFlightRequests.delete(key);
                return result;
            })
            .catch((error) => {
                this.inFlightRequests.delete(key);
                throw error;
            });

        this.inFlightRequests.set(key, promise);
        return promise;
    }

    /**
     * Clear deduplicator
     */
    clear(): void {
        this.inFlightRequests.clear();
    }

    /**
     * Get in-flight request count
     */
    getInFlightCount(): number {
        return this.inFlightRequests.size;
    }
}
