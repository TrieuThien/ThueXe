const tails = new Map();

export async function withUserMutex(userId, worker) {
    const key = String(userId);
    const previousTail = tails.get(key) || Promise.resolve();
    let releaseCurrentTail;

    const currentTail = new Promise((resolve) => {
        releaseCurrentTail = resolve;
    });

    tails.set(key, currentTail);

    try {
        await previousTail;
        return await worker();
    } finally {
        releaseCurrentTail();
        if (tails.get(key) === currentTail) {
            tails.delete(key);
        }
    }
}
