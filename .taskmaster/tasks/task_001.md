# Task ID: 1

**Title:** Initialize Express + TypeScript Backend Structure

**Status:** done

**Dependencies:** None

**Priority:** high

**Description:** Create backend project with TypeScript, Express, and essential middleware (helmet, cors, dotenv). Set up folder structure and initial configuration files.

**Details:**

Create `/backend` directory in project root. Initialize with `npm init -y`. Install dependencies: express, typescript, @types/node, @types/express, helmet, cors, dotenv, ts-node, nodemon. Create `tsconfig.json` with target ES2017, strict mode, esModuleInterop. Create folder structure: `src/routes/`, `src/lib/`, `src/middleware/`, `prisma/`. Create `src/index.ts` with Express app, helmet middleware, CORS configured for FRONTEND_URL + localhost:3000, JSON body parser, health check endpoint at GET /health returning {status: 'ok'}, and server listening on PORT env variable (default 4000). Create `.env.example` with all required variables. Create `nodemon.json` for development. Add scripts to package.json: `dev` (nodemon), `build` (tsc), `start` (node dist/index.js).

**Test Strategy:**

Run `npm run dev`, verify server starts without errors. Test GET http://localhost:4000/health returns 200 with {status: 'ok'}. Verify CORS allows configured origins. Test helmet headers are present in response.

## Subtasks

### 1.1. Create backend directory structure and initialize npm project

**Status:** done  
**Dependencies:** None  

Create /backend directory in project root, initialize package.json with npm init, and set up the basic folder structure for Express + TypeScript backend.

**Details:**

Create /backend directory at /Users/guidoreyes/Desktop/proyecto/backend. Run npm init -y inside the backend directory to create package.json. Create the following subdirectories: src/routes/, src/lib/, src/middleware/, and prisma/. This establishes the foundational structure for the Express backend application with clear separation of concerns.

### 1.2. Install TypeScript, Express, and essential dependencies

**Status:** done  
**Dependencies:** 1.1  

Install all required npm packages including TypeScript, Express, type definitions, middleware packages, and development tools.

**Details:**

Navigate to /backend directory and install production dependencies: express, helmet, cors, dotenv. Install development dependencies: typescript, @types/node, @types/express, @types/cors, ts-node, nodemon. Use npm install --save for production and npm install --save-dev for development dependencies. This ensures all necessary packages are available for building a secure, typed Express server.

### 1.3. Configure TypeScript with tsconfig.json

**Status:** done  
**Dependencies:** 1.2  

Create tsconfig.json with ES2017 target, strict mode, and proper module resolution for Express + TypeScript compatibility.

**Details:**

Create tsconfig.json in /backend directory with the following configuration: target ES2017, strict mode enabled, esModuleInterop true, module commonjs, moduleResolution node, outDir ./dist, rootDir ./src, resolveJsonModule true, skipLibCheck true. This configuration ensures TypeScript compiles correctly for Node.js environment with strict type checking.

### 1.4. Create Express server with middleware and health check endpoint

**Status:** done  
**Dependencies:** 1.3  

Implement src/index.ts with Express app initialization, security middleware (helmet, CORS), JSON body parser, and a health check endpoint.

**Details:**

Create src/index.ts that imports express, helmet, cors, and dotenv. Initialize dotenv.config(). Create Express app instance. Apply helmet() middleware for security headers. Configure CORS with origin allowing both process.env.FRONTEND_URL and 'http://localhost:3000'. Add express.json() body parser. Implement GET /health endpoint returning { status: 'ok' }. Start server listening on process.env.PORT || 4000. Add console.log for server start confirmation.

### 1.5. Add npm scripts and create .env.example file

**Status:** done  
**Dependencies:** 1.4  

Configure package.json scripts for development, build, and production. Create .env.example with all required environment variables for backend configuration.

**Details:**

Update /backend/package.json scripts section with: 'dev': 'nodemon --watch src --exec ts-node src/index.ts', 'build': 'tsc', 'start': 'node dist/index.js'. Create nodemon.json with watch: ['src'], ext: 'ts,json', exec: 'ts-node src/index.ts'. Create .env.example file with: PORT=4000, FRONTEND_URL=http://localhost:3000, DATABASE_URL=, JWT_SECRET=. This provides complete development workflow and deployment-ready configuration template.
