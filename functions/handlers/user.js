/* eslint-disable */

const { admin, db } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
firebase.initializeApp(config);

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../util/validators");

//Sign users
exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };
  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return res.status(400).json(errors);

  const noImg = "noImg.png";

  let token, userId;

  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password)
          .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
          })
          .then((idToken) => {
            token = idToken;
            const userCredentials = {
              handle: newUser.handle,
              email: newUser.email,
              createdAt: new Date().toISOString(),
              imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
              userId: userId,
              role: "user",
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
          })
          .then(() => {
            return res.status(201).json({ token });
          })
          .catch((err) => {
            console.error(err);
            if (err.code === "auth/email-already-in-use") {
              return res.status(400).json({ email: "Email is already in use" });
            } else {
              return res
                .status(500)
                .json({ general: "Something went wrong, Please try again" });
            }
          });
      }
    });
};

//login user
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const { valid, errors } = validateLoginData(user);
  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json(token);
    })
    .catch((err) => {
      console.error(err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      )
        return res
          .status(403)
          .json({ general: "Wrong credentials, please try again" });
      if (err.code === "auth/invalid-email")
        return res
          .status(403)
          .json({ general: "Invalid email! Please fill valid email." });

      return res.status(500).json({ error: err.code });
    });
};

//Add User Details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "User details added successfully" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//Get Authenticated User Details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      return db
        .collection("notifications")
        .where("recipient", "==", req.user.handle)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data.sender,
          createdAt: doc.data().createdAt,
          screamId: doc.data().screamId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//Get any users details
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();

        return db
          .collection("screams")
          .where("userHandle", "==", req.params.handle)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    })
    .then((data) => {
      userData.screams = [];
      data.forEach((doc) => {
        userData.screams.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          screamId: doc.screamId,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err });
    });
};

//Upload a user profile image
exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    //Dosyanın jpg yada png olduğundan emin olmalıyız
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    //my.name.png: eğer dosya isiminde .'lar varsa split ile .'dan ayrıdığımız dizinin son elemanını seçmeliyiz.
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    //654654654654.png gibi bir random sayılardan oluşan bir isim olşturuyoruz
    imageFileName = `${Math.round(
      Math.random() * 10000000000
    )}.${imageExtension}`;
    const filePath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filePath, mimetype };
    file.pipe(fs.createWriteStream(filePath));
  });
  busboy.on("finish", () => {
    // img'ı upload yapıyoruz
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filePath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        // user'a ait doc'u çekiyoruz
        return db.collection("users").doc(`${req.user.handle}`).get();
      })
      .then((doc) => {
        // Eğer daha önce bir image upload edildiyse o imagı silmemiz gerekir.
        // doc'da imageUrl'den dosya adını alıyoruz ve içinden dosya adını elde ediyoruz
        let imgPath = doc.data()["imageUrl"];

        let imageName = imgPath
          .split("/")
          [imgPath.split("/").length - 1].split("?")[0];
        //console.warn("deleted image : " + imageName);

        //eğer image noImg.png değilse image'ı siliyoruz
        if (imageName !== "noImg.png")
          admin.storage().bucket().file(imageName).delete();
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        //return db.doc(`users/${req.user.handle}`).update({ imageUrl });
        //console.warn("uploaded image : " + imageUrl);
        //ilgili user'da imageUrl'i kaydediyoruz
        return db
          .collection("users")
          .doc(`${req.user.handle}`)
          .update({ imageUrl });
      })
      .then(() => {
        return res.json({
          message: `Image uploaded successfully`,
        });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err });
      });
  });
  busboy.end(req.rawBody);
};

//Read notification
exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notificaiton = db.doc(`/notifications/${notificationId}`);
    //TODO: notification read yalnızca user; notification.recepient ise yapılabilmeli
    batch.update(notificaiton, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: "Notifications marked read" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err });
    });
};
