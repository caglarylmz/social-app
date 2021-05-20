Firestore işlemleri:

- Bir collention'a ait document'i getirme
  '''
  const document = db.doc(`/comments/${req.params.commentId}`);
  '''
  ya da
  '''
  const document = db.colleciton('comments').doc(`${req.params.commentId}`);
  '''
- Bir document'den field çekme
  '''
  let screamId;
  let userHandle;
  db.doc(`/comments/${req.params.commentId}`)
  .get()
  .then((doc) => {
  if (doc.exists) {
  screamId = doc.data().screamId;
  userHandle = doc.data().userHandle;
  }
  '''

  - Bir field'ı güncelleme
    '''
    db.doc(`/screams/${screamId}`)
    .get()
    .then((doc) => {
    doc.ref.update({ commentCount: doc.data().commentCount - 1 });
    });
    '''

- Bir document'i silme
  '''
  db.doc(`/comments/${req.params.commentId}`).delete()
  .then(() => {
  res.json({ message: "Comment deleted successfully" });
  })
  .catch((err) => {
  console.error(err);
  return res.status(500).json({ error: err.code });
  });
  '''

  - document'leri getirme
    '''
    const screamOfLikes = db
    .collection("likes")
    .where("screamId", "==", req.params.screamId);

    //getirilen docs ları silme
    screamOfLikes.get().then((data) => {
    if (!data.empty) {
    data.docs.forEach((doc) => {
    db.collection("likes").doc(`${doc.id}`).delete();
    });
    }
    });
    '''

- Trigger ekleme
  '''
  exports.createNotificationOnLike = functions.firestore
  .document("/likes/{id}")
  .onCreate((snapshot) => {
  db.doc(`/screams/${snapshot.data().screamId}`)
  .get()
  .then((doc) => {
  if (doc.exists) {
  return db.doc(`/notifications/${snapshot.id}`).set({
  createdAt: new Date().toISOString(),
  recipient: doc.data().userHandle,
  sender: snapshot.data().userHandle,
  type: "like",
  read: false,
  screamId: doc.id,
  });
  }
  })
  .then(() => {
  return;
  })
  .catch((err) => {
  console.error(err);
  return;
  });
  });
  '''

1. Firebase Setup

- firebase init
- select functions and select exiting app on firebase.
- cd functions
- npm install
- npm i --s express

2. User Registration

- Firebase dashboard/ authentication / email and password activate
- cd functions / npm i --s firebase
- copy firebase project settings-> firebase config for web

# Burada

```
firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
```

ile bir kuıllanıcı kaydı oluşturuyoruz. Bu sırada firestore'a users collection'u altında bu kullanıcı bilgilerini içeren bir kayıt oluştururuz. Biz handle'ı uniqe olarak kullanıyoruz. O halde users collection'u altında handle'ı key olarak kullanabiliriz.

3. Validation & Login Route
   Şimdiye kadar hali hazırda handle ve email validation zaten yapmış durumdayız. Ancak email veya handle boşsa ve şifre validation işlemlerini yapmadık. Bu kısımları yapalım.
4. Authentication middleware yazalım. Mesela post yollarken herhangi bir auth işlemine tabi tutmuyorduk. Şimdi bu kısımları halledelim.

# fbAuth.js

```
    const FBAuth = (req, res, next) => {
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
        console.log(decodedToken);
        req.user = decodedToken;
        return db
            .collection("users")
            .where("userId", "==", req.user.uid)
            .limit(1)
            .get();
        })
        .then((data) => {
        req.user.handle = data.docs[0].data().handle;
        return next();
        })
        .catch((err) => {
        console.error("Error while verify token", err);
        return res.status(403).json(err);
        });
    };
```

Burada req.user.handle iletiyoruz. Böylece fbAuth kullanılan bir fonksiyonda req.user.handle ile kullanıcıca erişilebilir. bizim için handle uniqe bir değer ve
db.collection("users").doc(`${req.user.handle}`).get();
ile kullanıcya erişebiliyoruz. Aslında handle yerine kullanıcı oluşturulurken kullanılan uid'de uniqe veri olarak kullanabilirdik.

5. Tüm code index içerisinde şimdi bu kısımları refactor yapalım
6. upload profile image

- npm i --s busboy
- dosya yüklerken user auth olmalı. Bu yüzden FbAuth olarak hazırladığımız middleware'i app.post("/user/images",FBAuth, uploadImage) olarak ekliyoruz. Bu hem güvenlik hemde user'a ait bilgileri getirmemizi sağlayacak.
- ilk olarak dosyayı hazırlıyoruz. Dosya ismi ve yolunu ayarlıyoruz

```
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
```

- ardından oluşturduğumuz bu dosyayı storage yüklemeliyiz. Bu esnada bu yüklediğimiz dosya yolunu da user'a bir field olarak atamalıyız. Son olarak user'a ait daha önce bir image kullanılmışsa bu image ı silmeliyiz.

```
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
```

- son olarak işlemi tamamlıyoruz

```
busboy.end(req.rawBody);
```

7. User Profile oluşturup bu detayları getirelim

8. comments oluşturma ve getirme: Bir scream'a sisteme üye olan tüm kullanıcılar comment oluşturabilir. Comment ler comments altında user.handle ve body field ları ile tutuyoruz. Her comment scream altında commentCount'u 1 artırır.

9. Like unlike işlemlerini yapıyoruz. Sisteme üye olan tüm kullanıcılar scream'ı like unlike yapabilir. like'lar likes altında ilgili user.handle ve screamId ile tutuyoruz. Bir kullanıcı bir scream'ı 1 defa like yapabilir. Her like Scream alanında like sayısını 1 artırır

10. Scream silme. Scream'ı yalnızca o scream'i oluşturan kullanıcı silebilir. Bir scream silindiğinde o scream'e ait likes ve comments ler silinmelidir.

11. Bir like veya unlike durumunda kullanıcıya notification göndermek istiyoruz. Bunun için bir like yapıldığında notifications altında otomatik olarak oluşacak bir tasarım gerçekleştiriyoruz. Bu like geri alındığında ise nu notification altında oluşturulan field silecek bir yapı oluşturuyoruz

12. Bir comment eklendiğinde kullanıcıya notification göndermek istiyoruz. Bir comment yapıldığında notfications altında otomataik oluşacak bir tasarım gerçekleştiriyoruz

- 11 ve 12'yi triggers ile gerçekleştiriyoruz .onCreate((snapshot) => {}) gibi trigers kullanıyoruz

13. Notification'ları ilgili user oturum açtığında ulaşılabilmesi için getAuthenticatedUser() fonksiyonunda return edilen user'a kaydediyoruz
14. Diğer kullanıcların istediği bir kullanıcının detaylaraını görebilmesi gerekir. Bunun için app.get("/user/:handle", getUserDetails); oluşturuyoruz
15. Kullanıcının notifications'ları okuduğunu onaylayan bir route oluşturmalıyız. app.post("/notifications", fbAuth, markNotificationsRead);
16. User image değiştinde tüm scream'lerdeki userImage'ı değiştirecek bir trigger yazmalıyız

#  Frontend - react

https://www.youtube.com/watch?v=m_u6P5k0vP0&t=519s
4:28:16 da
