/* eslint-disable */
const { admin,db } = require("./admin");

module.exports = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No Token Found");
    return res.status(403).json({ error: "Unauthorized" });
  }
  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      //fbAuth kullanıldığı zaman erişilebilinecek data'lar
      req.user.handle = data.docs[0].data().handle;
      req.user.imageUrl = data.docs[0].data().imageUrl;
      req.user.role = data.docs[0].data().role;
      return next();
    })
    .catch((err) => {
      console.error("Error while verify token", err);
      return res.status(403).json(err);
    });
};
