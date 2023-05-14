const { migrateList } = require("./migrate/api-to-firestore");

const listsToCopy = [
  {
    type: "checkbook",
    name: "business-checking",
  },
  {
    type: "checkbook",
    name: "personal-checking",
  },
  {
    type: "checkbook",
    name: "square-checking",
  },
  {
    type: "read",
    name: "tri",
  },
  {
    type: "ledge",
    name: "tri",
  },
  {
    type: "meta",
    name: "users"
  }
];

async function getServerAppToken() {
  try {
    const { getToken } = await import('@tridnguyen/auth/server.js');
    return await getToken({
      clientId: process.env.SERVER_APP_AUTH0_CLIENT_ID,
      clientSecret: process.env.SERVER_APP_AUTH0_CLIENT_SECRET,
      audience: process.env.API_SERVER
    })
  } catch (e) {
    console.error(e);
  }
}

exports.apiToFirestore = async (req, res) => {
  try {
    const token = await getServerAppToken();
    if (!token) {
      throw new Error('Unable to generate token');
    }
    await Promise.all(listsToCopy.map(migrateList.bind(null, token)));
    res.status(200).json({
      status: "success",
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message);
    return;
  }
};

if (require.main === module) {
  try {
    exports[process.argv[2]]();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
