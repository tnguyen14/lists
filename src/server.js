require("dotenv").config();

// might want to consider putting this in the db
// while this currently maps cleanly to the firestore path,
// I don't think it quite make sense to store this in the list doc.
// might want to create a separate metadata db/ store
const publicAccess = {
  GET: ["/read/.*/items"],
};

const server = require("@tridnguyen/fastify-server")({
  logger: process.env.NODE_ENV != 'production' && {
    transport: {
      target: 'pino-pretty'
    }
  },
  auth0Domain: process.env.AUTH0_DOMAIN,
  auth0ClientId: process.env.AUTH0_CLIENT_ID,
  audience: process.env.API_SERVER,
  allowedOrigins: [
    "https://tridnguyen.com",
    "https://ledge-lake.vercel.app",
    "https://cbtallc.com",
    "http://localhost:4003", // ledge
    "http://localhost:4004", // checkbook
    "http://localhost:5173", // lists
  ],
  shouldPerformJwtCheck: (request) => {
    if (publicAccess[request.method]) {
      for (const path of publicAccess[request.method]) {
        if (request.url.match(path)) {
          return false;
        }
      }
    }
    return true;
  },
});

server.setErrorHandler((err, request, reply) => {
  console.error(err);
  reply.send(err);
});

server.register(require("./routes"));

async function start() {
  const port = process.env.PORT || 3000;
  try {
    await server.listen(port, "0.0.0.0");
    console.log(`Server started on port ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
