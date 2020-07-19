require("dotenv").config();

const server = require("@tridnguyen/fastify-server")({
  auth0Domain: process.env.AUTH0_DOMAIN,
  auth0ClientId: process.env.AUTH0_CLIENT_ID,
  allowedOrigins: ["https://lab.tridnguyen.com", "https://tridnguyen.com"],
});

server.setErrorHandler((err, request, reply) => {
  console.error(err);
  reply.send(err);
});

async function start() {
  try {
    await server.listen(process.env.PORT || 3000, "0.0.0.0");
    console.log("Server started");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
