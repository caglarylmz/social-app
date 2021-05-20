let db = {
  users: [
    {
      userId: "Q45QMiQkXlQMymxnj3z5RwBBnnZ2",
      email: "user@email.com",
      handle: "user",
      createdAt: "2021-05-03T22:18:26.251Z",
      imageUrl:
        "https://firebasestorage.googleapis.com/v0/b/social-app-418ac.appspot.com/o/9709238647.png?alt=media",
      bio: "Hello, my name is user",
      website: "https://user.com",
      location: "İzmir,TR",
    },
  ],
  screams: [
    {
      userHandle: "user",
      body: "this is the scream body",
      createdAt: "2021-05-02T11:33:15.158Z",
      likeCount: 5,
      commentCount: 2,
    },
  ],
  comments: [
    {
      userHandle: "user",
      screamId: "W8gYWQGLCQhj1xaNUKO4",
      body: "nice one mate!",
      createdAt: "2021-05-04T19:21:01.483Z",
    },
  ],
  notifications: [
    {
      recipient: "user",
      sender: "john",
      read: "true|false",
      type: "like|comment",
      screamId: "W8gYWQGLCQhj1xaNUKO4",
      createdAt: "2021-05-04T19:21:01.483Z",
    },
  ],
};

const userDetails = {
  // Redux data ( State Management )
  credentials: {
    userId: "Q45QMiQkXlQMymxnj3z5RwBBnnZ2",
    email: "user@email.com",
    handle: "user",
    createdAt: "2021-05-03T22:18:26.251Z",
    imageUrl:
      "https://firebasestorage.googleapis.com/v0/b/social-app-418ac.appspot.com/o/9709238647.png?alt=media",
    bio: "Hello, my name is user",
    website: "https://user.com",
    location: "İzmir,TR",
  },
  likes: [
    {
      userHandle: "user",
      screamId: "z434zMiQkXlQMymxnj3z5RwBBnnq4",
    },
    {
      userHandle: "user",
      screamId: "qwedfMiQkXlQMymxnj3z5RwBBn554",
    },
  ],
};
