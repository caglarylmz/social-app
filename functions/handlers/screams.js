/* eslint-disable */

const { db } = require("../util/admin");
const { validateCreateScreamData } = require("../util/validators");

// Get All Screams - no need auth
exports.getAllScreams = (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      const screams = [];
      data.forEach((doc) => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount : doc.data().commentCount,
          likeCount:doc.data().likeCount,
          userImage:doc.data().userImage
        });
      });
      return res.json(screams);
    })
    .catch((err) => console.error(err));
};

//Create a scream - need Auth
exports.postOneScream = (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  };

  const { valid, errors } = validateCreateScreamData(newScream.body);
  if (!valid) return res.status(400).json(errors);

  db.collection("screams")
    .add(newScream)
    .then((doc) => {
      const resScream = newScream;
      resScream.screamId = doc.id;
      res.json(resScream);
    })
    .catch((err) => {
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
};

// Get a scream with comments- no auth
exports.getScream = (req, res) => {
  let screamData = {};

  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Scream not found" });
      }
      screamData = doc.data();
      screamData.screamId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("screamId", "==", req.params.screamId)
        .get();
    })
    .then((data) => {
      screamData.comments = [];
      data.forEach((doc) => {
        screamData.comments.push(doc.data());
      });
      return res.json(screamData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Comment on a Scream
exports.commentOnScream = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({ comment: "Comment not be empty" });
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
  };
  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists)
        return res.status(404).json({ error: "Scream not found!" });
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then((doc) => {
      newComment.commentId = doc.id;
      res.json(newComment);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
// Delete a Cooment on Scream
exports.deleteCommentOnScream = (req, res) => {
  const document = db.doc(`/comments/${req.params.commentId}`);
  let screamId;
  let userHandle;
  document
    .get()
    .then((doc) => {
      if (doc.exists) {
        screamId = doc.data().screamId;
        userHandle = doc.data().userHandle;
      }
      if (!doc.exists)
        return res.status(404).json({ error: "Comment not found" });
      if (
        doc.data().userHandle !== req.user.handle ||
        doc.data().userHandle !== userHandle
      )
        return res.status(403).json({ error: "Unauthorized!" });
      else {
        db.doc(`/screams/${screamId}`)
          .get()
          .then((doc) => {
            doc.ref.update({ commentCount: doc.data().commentCount - 1 });
          });

        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Comment deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Like a scream
exports.likeScream = (req, res) => {
  const likeDoc = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("screamId", "==", req.params.screamId)
    .limit(1);
  const screamDoc = db.doc(`/screams/${req.params.screamId}`);
  let screamData = {};
  screamDoc
    .get()
    .then((doc) => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDoc.get();
      } else {
        return res.status(400).json({ error: "Scream not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            screamId: req.params.screamId,
            userHandle: req.user.handle,
          })
          .then(() => {
            screamData.likeCount++;
            return screamDoc.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return res.json(screamData);
          });
      } else {
        return res.status(400).json({ error: "Scream already liked" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// UnLike a scream
exports.unlikeScream = (req, res) => {
  const likeDoc = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("screamId", "==", req.params.screamId)
    .limit(1);
  const screamDoc = db.doc(`/screams/${req.params.screamId}`);
  let screamData = {};
  screamDoc
    .get()
    .then((doc) => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDoc.get();
      } else {
        return res.status(400).json({ error: "Scream not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: "Scream not liked" });
      } else {
        return db
          .collection("likes")
          .doc(`${data.docs[0].id}`)
          .delete()
          .then(() => {
            screamData.likeCount--;
            return screamDoc.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return res.json(screamData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Delete a Scream
// Scream'e ait comment ve likes'ları burada siliyordum. Fakat trigger ile işlemleri hallettik
exports.deleteScream = (req, res) => {
  const document = db.doc(`/screams/${req.params.screamId}`);
 /* const screamOfLikes = db
    .collection("likes")
    .where("screamId", "==", req.params.screamId);
  const screamOfComments = db
    .collection("comments")
    .where("screamId", "==", req.params.screamId);*/
  document
    .get()
    .then((doc) => {
      if (!doc.exists)
        return res.status(404).json({ error: "Scream not found" });
      if (doc.data().userHandle !== req.user.handle)
        return res.status(403).json({ error: "Unauthorized!" });
      else {
        return document.delete();
      }
    })    
    .then(() => {
      /*
      //delete scream of likes
      screamOfLikes.get().then((data) => {
        if (!data.empty) {
          data.docs.forEach((doc) => {
            db.collection("likes").doc(`${doc.id}`).delete();
          });
        }
      });
      //delete scream of comments
      screamOfComments.get().then((data) => {
        if (!data.empty) {
          data.docs.forEach((doc) => {
            db.collection("comments").doc(`${doc.id}`).delete();
          });
        }
      });
      */
      res.json({ message: "Scream deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
