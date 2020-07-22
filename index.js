require("dotenv").config();

const server = require("@tridnguyen/fastify-server")({
  // logger: true,
  auth0Domain: process.env.AUTH0_DOMAIN,
  auth0ClientId: process.env.AUTH0_CLIENT_ID,
  allowedOrigins: ["https://lab.tridnguyen.com", "https://tridnguyen.com"],
});

server.setErrorHandler((err, request, reply) => {
  console.error(err);
  reply.send(err);
});

server.register(require("./lists"));

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
