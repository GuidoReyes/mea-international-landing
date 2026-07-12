# Task ID: 4

**Title:** Add Redis to Railway and Create Client Configuration

**Status:** done

**Dependencies:** 2 ✓

**Priority:** high

**Description:** Provision Redis addon in Railway, create Redis client wrapper with connection handling and error recovery.

**Details:**

Add Redis addon via Railway dashboard - this auto-generates REDIS_URL. Install redis client: `npm install redis`. Create `src/lib/redis.ts`: import createClient from 'redis', create client with url from process.env.REDIS_URL, implement connection with error handling and reconnection strategy, add graceful shutdown on SIGTERM/SIGINT, export connected client. Add helper functions: setWithTTL(key, value, seconds), getJSON(key), setJSON(key, value, ttl). Configure Redis to handle chat history with 24h TTL (86400 seconds) and course cache.

**Test Strategy:**

Run backend locally with REDIS_URL from Railway. Verify Redis connects without errors. Test redis.set() and redis.get() with simple values. Test setJSON/getJSON helpers with complex objects. Test TTL expiration. Check Railway Redis dashboard shows connection.

## Subtasks

### 4.1. Provision Redis addon in Railway dashboard

**Status:** pending  
**Dependencies:** None  

Add Redis database service to the existing Railway project through the Railway dashboard and verify the REDIS_URL environment variable is auto-generated.

**Details:**

In the Railway project dashboard (created in Task 2), click 'New' and select 'Database', then choose 'Redis'. Railway will automatically provision a Redis instance and generate the REDIS_URL environment variable in the format redis://default:password@host:port. Navigate to the backend service settings and verify REDIS_URL appears in the environment variables section, accessible to the backend service. The Redis instance should be running in the same Railway project as the MySQL database. Document the Redis connection details (host, port) for reference. No code changes needed in this subtask - purely infrastructure provisioning.

### 4.2. Install redis npm package in backend project

**Status:** pending  
**Dependencies:** 4.1  

Add the official redis client library to the backend project's dependencies using npm install.

**Details:**

Navigate to /backend directory. Run `npm install redis` to install the official Redis client for Node.js (version 4.x or higher). This package provides TypeScript support out of the box and includes connection pooling, automatic reconnection, and error handling. Verify the package appears in backend/package.json under dependencies. The redis package will be used to create a client connection to the Railway Redis instance using the REDIS_URL environment variable. Also install @types/redis if needed: `npm install --save-dev @types/redis` (though redis v4+ includes types).

### 4.3. Create Redis client wrapper with connection handling

**Status:** pending  
**Dependencies:** 4.2  

Implement src/lib/redis.ts with Redis client initialization, error handling, reconnection strategy, and graceful shutdown.

**Details:**

Create backend/src/lib/redis.ts file. Import { createClient } from 'redis'. Create Redis client using createClient({ url: process.env.REDIS_URL }). Implement connection logic with client.connect() wrapped in try-catch for error handling. Add event listeners: client.on('error', (err) => console.error('Redis Client Error', err)), client.on('connect', () => console.log('Redis Client Connected')), client.on('reconnecting', () => console.log('Redis Client Reconnecting')). Implement graceful shutdown handlers for SIGTERM and SIGINT that call client.quit() to close connections cleanly. Add connection retry strategy with socket options: { reconnectStrategy: (retries) => Math.min(retries * 50, 500) }. Export the connected client as default export. Add type safety with RedisClientType from 'redis' package.

### 4.4. Add Redis helper functions for JSON caching and TTL management

**Status:** pending  
**Dependencies:** 4.3  

Implement utility functions in redis.ts for setting/getting JSON data with TTL, specifically configured for chat history (24h) and course caching.

**Details:**

In backend/src/lib/redis.ts, add helper functions: 1) `setWithTTL(key: string, value: string, seconds: number)` - uses client.setEx(key, seconds, value) for basic string caching with expiration. 2) `getJSON<T>(key: string): Promise<T | null>` - fetches value with client.get(key), parses JSON with JSON.parse(), returns null if not found or parse fails. 3) `setJSON(key: string, value: any, ttl?: number)` - serializes value with JSON.stringify(), sets with client.setEx() if ttl provided (default 86400 seconds = 24 hours), otherwise uses client.set(). 4) Add constant CHAT_HISTORY_TTL = 86400 (24 hours in seconds) for chat history expiration. 5) Add constant COURSE_CACHE_TTL = 3600 (1 hour in seconds) for course data caching. Export all helper functions and constants. Add proper TypeScript types for generic JSON handling.
