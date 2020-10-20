const { migrate } = require("./migrate/api-to-firestore");

exports.migrate = async (req, res) => {
  try {
    migrate();
    res.status(200).json({
      status: "success",
    });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message);
    return;
  }
};
