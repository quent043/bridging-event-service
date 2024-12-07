
# Bridging Event Service

The **Bridging Event Service** is a backend system designed for real-time monitoring of bridged tokens. It collects, processes, and serves live updates on token bridging events using WebSocket and RESTful APIs. It also stores historical data for analytics and reporting.

---

## 💻 Tech Stack

The service leverages the following technologies:

- **[NestJS](https://nestjs.com/):** Framework for building efficient, scalable server-side applications.
- **[Prisma](https://www.prisma.io/):** ORM for interacting with a PostgreSQL database.
- **[Redis](https://redis.io/):** High-performance in-memory datastore for caching and live updates.
- **[PostgreSQL](https://www.postgresql.org/):** Relational database for persistent storage.
- **[Socket.IO](https://socket.io/):** Enables real-time, bi-directional communication.
- **[Docker](https://www.docker.com/):** Simplifies containerization and deployment.

---

## 🚀 Setup and Launch

### **Note**

**Docker is used for convenience purposes**—preconfigured passwords, users, and databases are already set in the included `docker-compose.yml`.  
If you choose **not** to use Docker, you'll need to install and run PostgreSQL and Redis manually, replacing the environment variables with your own credentials.

---

### 🔧 Prerequisites

- **Node.js** (>= 16.x)
- **Docker** (optional but recommended for containerized setup)

---

### 🐋 Option 1: **With Docker (Recommended)**

#### Environment Variables

Update the `.env` file with the required environment variable:

```plaintext
ETH_RPC_URL=<your_ethereum_rpc_url>
```

Replace `<your_ethereum_rpc_url>` with a valid Ethereum RPC URL (e.g., from Infura or Alchemy).

1. Clone the repository:
   ```bash
   git clone https://github.com/quent043/bridging-event-service.git
   cd bridging-event-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the service:
   ```bash
   npm run start:with-docker
   ```

The backend server will be running at `http://localhost:3000`.

---

### 🐧 Option 2: **Without Docker**

#### Environment Variables

Update the `.env` file with the required environment variables:

```plaintext
ETH_RPC_URL=<your_ethereum_rpc_url>
DATABASE_URL=<your_postgresql_url>
REDIS_URL=<your_redis_url>
```

- Replace `<your_ethereum_rpc_url>` with a valid Ethereum RPC URL (e.g., from Infura or Alchemy).
- Replace `<your_postgresql_url>` with your PostgreSQL database connection string (e.g., postgres://<user>:<password>@<host>:<port>/<database>).
- Replace `<your_redis_url>` with your Redis connection string (e.g., <username>:<password>@<host>:<port>).


1. Clone the repository:
   ```bash
   git clone https://github.com/quent043/bridging-event-service.git
   cd bridging-event-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install and configure PostgreSQL and Redis manually.

4. Update the `.env` file with the required environment variables (as detailed above).

5. Run database migrations:
   ```bash
   npm run db:setup
   ```

6. Start the backend server:
   ```bash
   npm run start:dev
   ```

The backend server will be running at `http://localhost:3000`.

---

## 📈 API Endpoints

### REST Endpoints

1. **GET `/metrics/total_volume`**
    - **Description:** Retrieves the total volume of all bridged tokens.
    - **Example Response:**
      ```json
      {
        "message": "Total volume retrieved successfully",
        "data": {
          "0xTokenAddress1": 123456789.01,
          "0xTokenAddress2": 987654321.99
        }
      }
      ```

2. **GET `/metrics/total_volume_by_chain`**
    - **Description:** Retrieves the total volume of tokens bridged per chain.
    - **Example Response:**
      ```json
      {
        "message": "Total volume by chain retrieved successfully",
        "data": {
          "1": 123456789.01,
          "137": 987654321.99
        }
      }
      ```

3. **GET `/metrics/bridge_usage`**
    - **Description:** Retrieves the usage count for each bridge.
    - **Example Response:**
      ```json
      {
        "message": "Bridge usage counts retrieved successfully",
        "data": {
          "BridgeName1": 150,
          "BridgeName2": 75
        }
      }
      ```

---

### 🔌 WebSocket

The WebSocket streams live updates for token and chain volumes, as well as bridge usage counts.

- **Connection URL:** `ws://localhost:3000`
- **Events:**
    - `token_volume_update`: Provides updates for token volumes.
    - `chain_volume_update`: Provides updates for chain volumes.
    - `bridge_usage_update`: Provides updates for bridge usage counts.

**Example WebSocket Integration:**

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

// Listen for token volume updates
socket.on("token_volume_update", ({ token, totalVolume }) => {
  console.log(`Token: ${token}, Volume: ${totalVolume}`);
});

// Listen for chain volume updates
socket.on("chain_volume_update", ({ chainId, totalVolume }) => {
  console.log(`Chain: ${chainId}, Volume: ${totalVolume}`);
});

// Listen for bridge usage updates
socket.on("bridge_usage_update", ({ bridgeName, usageCount }) => {
  console.log(`Bridge: ${bridgeName}, Usage Count: ${usageCount}`);
});
```

---

## 🖥️ Demo Frontend Integration

A live frontend dashboard for the Bridging Event Service is available here:

**[Frontend Repository](https://github.com/quent043/bridging-event-service-frontend)**

### Frontend Setup

1. Clone the frontend repository:
   ```bash
   git clone https://github.com/quent043/bridging-event-service-frontend.git
   cd bridging-event-service-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The dashboard will be available at `http://localhost:3001`.
