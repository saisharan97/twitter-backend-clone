const express = require("express");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const { open } = sqlite;
const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;

const initializeDBandServer = async () => {
  try {
    app.listen(3000, () => {
      console.log("Server Running on Port 3000");
    });
    db = await open({ filename: dbPath, driver: sqlite3.Database });
  } catch (error) {
    console.log(`DB Encountered Error :${e.message}`);
    process.exit(1);
  }
};

initializeDBandServer();

const conversionOfDBObjectToResponseObjectForAPI3 = (dbObject) => {
  return {
    username: dbObject.username,
    tweet: dbObject.tweet,
    dateTime: dbObject.date_time,
  };
};

const conversionOfDBObjectToResponseObjectForAPI4 = (dbObject) => {
  return {
    name: dbObject.name,
  };
};

const conversionOfDBObjectToResponseObjectForAPI6 = (dbObject) => {
  return {
    tweet: dbObject.tweet,
    likes: dbObject.likes,
    replies: dbObject.replies,
    dateTime: dbObject.date_time,
  };
};

const conversionOfDBObjectToResponseObjectForAPI8 = (dbObject) => {
  return {
    name: dbObject.name,
    reply: dbObject.reply,
  };
};

const conversionOfDBObjectToResponseObjectForAPI9 = (dbObject) => {
  return {
    tweet: dbObject.tweet,
    likes: dbObject.likes,
    replies: dbObject.replies,
    dateTime: dbObject.date_time,
  };
};

// API-1 To Register the User

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  //Check if User Exists
  const checkForUserQuery = `
                            select
                                *
                            from
                                user
                            where 
                                username like '%${username}%'
                            ;`;
  const usersInDatabase = await db.all(checkForUserQuery);
  //   console.log(usersInDatabase);
  if (usersInDatabase.length === 0) {
    // console.log(length(password));
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      //   console.log(hashedPassword);
      const registeringUserQuery = `
                            insert into user
                                (username, password, name, gender)
                            values
                                ('${username}', '${hashedPassword}','${name}','${gender}')
                            ;`;
      await db.run(registeringUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    // console.log("User Exists");
    response.status(400);
    response.send("User already exists");
  }
});

// API-2 To Login the User

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  //   console.log(request.body.username);
  //Check if User Exists
  const checkForUserQuery = `
                            select
                                *
                            from
                                user
                            where 
                                username like '${username}'
                            ;`;
  const usersInDatabase = await db.get(checkForUserQuery);
  //   console.log(usersInDatabase);
  if (usersInDatabase !== undefined) {
    const checkForPasswordMatch = await bcrypt.compare(
      password,
      usersInDatabase.password
    );
    // const checkForPasswordMatch = userDataFromDatabase[0].password === password;
    // console.log(checkForPasswordMatch);
    if (checkForPasswordMatch) {
      const jwtToken = jwt.sign({ username: username }, "THE SECRET KEY");
      //   console.log(jwtToken);
      response.status(200);
      response.send({ jwtToken: jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    // console.log("User Exists");
    response.status(400);
    response.send("Invalid user");
  }
});

//Authentication with JWT Token
const authenticateUser = (request, response, next) => {
  //   console.log(request.headers);
  if (request.headers["authorization"] === undefined) {
    // console.log("No Token");
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    const jwtToken = request.headers["authorization"].split(" ")[1];
    // console.log(jwtToken);
    if (jwtToken === undefined) {
      // console.log("No Token");
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "THE SECRET KEY", async (error, payload) => {
        if (error) {
          // console.log("error");
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          // console.log("SSS");
          request.username = payload.username;
          next();
        }
      });
    }
  }
};

//Returns the followings list
const followingsOfUser = async (request, response, next) => {
  const username = request.username;
  //   console.log(username);
  const getFollowingQuery = `
                                select
                                    *
                                from
                                (select 
                                    *
                                from 
                                    user inner join follower on user.user_id = follower.follower_user_id
                                where
                                    username like '%${username}%') as T inner join user on T.following_user_id = user.user_id
                            ;`;
  const followingsArray = await db.all(getFollowingQuery);
  request.followingsArray = followingsArray;
  next();
};

// API-3 Returns the latest tweets of people whom the user follows. Return 4 tweets at a time

app.get(
  "/user/tweets/feed/",
  authenticateUser,
  followingsOfUser,
  async (request, response) => {
    //   console.log(request.username);
    const username = request.username;
    //   console.log(username);
    const followingsArray = request.followingsArray;
    // console.log(followingsArray);
    let listOfFollowingsUserIds = [];
    followingsArray.map((eachItem) => {
      //   console.log(eachItem);
      listOfFollowingsUserIds.push(eachItem.user_id);
    });
    // console.log(listOfFollowingsUserIds);
    const getLatestTweetsQuery = `
                            select 
                                * 
                            from 
                                tweet natural join user
                            where
                                user_id in (${listOfFollowingsUserIds})
                            ORDER BY
                                date_time DESC 
                            limit 4
                            ;`;

    const latestTweetsArray = await db.all(getLatestTweetsQuery);
    console.log(latestTweetsArray);
    const responseLatestTweetsArray = latestTweetsArray.map((eachTweet) =>
      conversionOfDBObjectToResponseObjectForAPI3(eachTweet)
    );
    response.send(responseLatestTweetsArray);
  }
);

// API-4 Returns the list of all names of people whom the user follows

app.get(
  "/user/following/",
  authenticateUser,
  followingsOfUser,
  async (request, response) => {
    //   console.log(request.username);
    const followingsArray = request.followingsArray;
    // console.log(followingsArray);
    const responseFollowingsArray = followingsArray.map((eachFollowing) =>
      conversionOfDBObjectToResponseObjectForAPI4(eachFollowing)
    );
    response.send(responseFollowingsArray);
  }
);

// API-5 Returns the list of all names of people who follows the user

app.get("/user/followers/", authenticateUser, async (request, response) => {
  //   console.log(request.username);
  const username = request.username;
  //   console.log(username);

  const getFollowersQuery = `
                                  select
                                      DISTINCT user.name
                                  from
                                  (select
                                      *
                                  from
                                      user inner join follower on user.user_id = follower.following_user_id
                                  where
                                      username like '%${username}%') as T inner join user on T.follower_user_id = user.user_id
                              ;`;

  const followersArray = await db.all(getFollowersQuery);
  //   console.log(followersArray);

  const responseFollowersArray = followersArray.map((eachFollowing) =>
    conversionOfDBObjectToResponseObjectForAPI4(eachFollowing)
  );
  response.send(followersArray);
});

// API-6 Returns the a specific tweet

app.get(
  "/tweets/:tweetId/",
  authenticateUser,
  followingsOfUser,
  async (request, response) => {
    //   console.log(request.username);
    const username = request.username;
    const { tweetId } = request.params;
    //   console.log(username);

    //check if user follows the tweeted user
    const followingsArray = request.followingsArray;
    // console.log(followingsArray);
    const tweetedUserQuery = `SELECT
                                    *
                                FROM
                                    tweet
                                where 
                                    tweet_id = ${tweetId}
                                ;`;
    const tweetUserDetailsArray = await db.get(tweetedUserQuery);
    // console.log(tweetUserDetailsArray.user_id);

    let userFollowsTweeter = false;
    followingsArray.map((eachItem) => {
      //   console.log(eachItem);
      if (eachItem.user_id === tweetUserDetailsArray.user_id) {
        userFollowsTweeter = true;
      }
    });
    // console.log(userFollowsTweeter);

    if (!userFollowsTweeter) {
      response.status(401);
      response.send("Invalid Request");
    }

    const tweetDetailsQuery = `SELECT
                                    tweet, COUNT(DISTINCT like_id) as likes,COUNT(DISTINCT reply_id) as replies, date_time as dateTime 
                                FROM (SELECT
                                    *
                                FROM
                                    tweet inner join like on tweet.tweet_id = like.tweet_id
                                where 
                                    tweet.tweet_id = ${tweetId}) as T inner join reply on T.tweet_id=reply.tweet_id
                                ;`;
    const tweetDetailsQueryArray = await db.all(tweetDetailsQuery);
    //   console.log(tweetDetailsQueryArray.length);
    if (tweetDetailsQueryArray.length === 0) {
      response.status(401);
      response.send("Invalid Request");
    }
    // console.log(tweetDetailsQueryArray);
    // const responseTweetDetailsQueryArray = tweetDetailsQueryArray.map(
    //   (eachResponse) =>
    //     conversionOfDBObjectToResponseObjectForAPI6(eachResponse)
    // );
    response.send(tweetDetailsQueryArray[0]);
  }
);

// API-7 Returns the list of usernames who liked the tweet

app.get(
  "/tweets/:tweetId/likes/",
  authenticateUser,
  followingsOfUser,
  async (request, response) => {
    //   console.log(request.username);
    const username = request.username;
    const { tweetId } = request.params;
    //   console.log(username);
    //check if user follows the tweeted user
    const followingsArray = request.followingsArray;
    // console.log(followingsArray);
    const tweetedUserQuery = `SELECT
                                    *
                                FROM
                                    tweet
                                where 
                                    tweet_id = ${tweetId}
                                ;`;
    const tweetUserDetailsArray = await db.get(tweetedUserQuery);
    // console.log(tweetUserDetailsArray.user_id);

    let userFollowsTweeter = false;
    followingsArray.map((eachItem) => {
      //   console.log(eachItem);
      if (eachItem.user_id === tweetUserDetailsArray.user_id) {
        userFollowsTweeter = true;
      }
    });
    // console.log(userFollowsTweeter);

    if (!userFollowsTweeter) {
      response.status(401);
      response.send("Invalid Request");
    }

    const tweetDetailsQuery = `SELECT
                                     username
                                FROM (SELECT
                                    *
                                FROM
                                     like inner join tweet on tweet.tweet_id = like.tweet_id
                                where 
                                    tweet.tweet_id = ${tweetId}) as T inner join user on T.user_id=user.user_id
                                order by 
                                    username
                                ;`;
    const tweetDetailsQueryArray = await db.all(tweetDetailsQuery);
    // console.log(tweetDetailsQueryArray);
    if (tweetDetailsQueryArray.length === 0) {
      response.status(401);
      response.send("Invalid Request");
    }
    // console.log(tweetDetailsQueryArray);
    let responseTweetDetailsQueryArray = [];
    const conversionToList = tweetDetailsQueryArray.map((eachResponse) => {
      conversionOfDBObjectToResponseObjectForAPI6(eachResponse);
      responseTweetDetailsQueryArray.push(eachResponse.username);
    });
    // console.log(responseTweetDetailsQueryArray);
    response.send({ likes: [...responseTweetDetailsQueryArray] });
  }
);

// API-8 Returns the list of replies

app.get(
  "/tweets/:tweetId/replies/",
  authenticateUser,
  followingsOfUser,
  async (request, response) => {
    //   console.log(request.username);
    const username = request.username;
    const { tweetId } = request.params;
    //   console.log(username);
    //check if user follows the tweeted user - First Approach
    const followingsArray = request.followingsArray;
    // console.log(followingsArray);
    const tweetedUserQuery = `SELECT
                                    *
                                FROM
                                    tweet
                                where 
                                    tweet_id = ${tweetId}
                                ;`;
    const tweetUserDetailsArray = await db.get(tweetedUserQuery);
    //   console.log(tweetUserDetailsArray);
    let iterationCounter = 0;
    const userFollowsTweeter = followingsArray.map((eachItem) => {
      //   console.log(eachItem);
      if (eachItem.user_id === tweetUserDetailsArray.user_id) {
        return true;
      }
      iterationCounter = iterationCounter + 1;
    });
    if (iterationCounter === followingsArray.length) {
      response.status(401);
      response.send("Invalid Request");
    }
    if (followingsArray === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      //check if user follows the tweeted user
      const tweetDetailsQuery = `
                                SELECT
                                    *
                                FROM
                                    (SELECT
                                        DISTINCT reply_id, reply, like.user_id
                                    FROM
                                        (SELECT
                                        *
                                        FROM
                                            (SELECT 
                                                *
                                            FROM
                                                ((  SELECT
                                                        DISTINCT user.user_id
                                                    FROM
                                                        (SELECT 
                                                            *
                                                        FROM 
                                                            user inner join follower on user.user_id = follower.follower_user_id
                                                        where
                                                            username like '%${username}%')
                                                    AS T inner join user on T.following_user_id = user.user_id)
                                            AS U inner join tweet on U.user_id = tweet.user_id) 
                                            where
                                                tweet_id = '${tweetId}') 
                                        AS V inner join reply on V.tweet_id = reply.tweet_id)                                    
                                    AS W inner join like on W.tweet_id = like.tweet_id)
                                AS X natural join user
                                ;`;
      const tweetDetailsQueryArray = await db.all(tweetDetailsQuery);
      // console.log(tweetDetailsQueryArray.length);
      if (tweetDetailsQueryArray.length === 0) {
        response.status(401);
        response.send("Invalid Request");
      }
      // console.log(tweetDetailsQueryArray);
      let responseTweetDetailsQueryArray = [];
      const conversionToList = tweetDetailsQueryArray.map((eachResponse) => {
        const listObject = conversionOfDBObjectToResponseObjectForAPI8(
          eachResponse
        );
        responseTweetDetailsQueryArray.push(listObject);
      });
      // console.log(responseTweetDetailsQueryArray);
      response.send({ replies: [...responseTweetDetailsQueryArray] });
    }
  }
);

// API-9 Returns a list of all tweets of the user

app.get("/user/tweets/", authenticateUser, async (request, response) => {
  //   console.log(request.username);
  const username = request.username;
  //   const { tweetId } = request.params;
  //   console.log(username);
  //check if user follows the tweeted user
  const tweetDetailsQuery = `
                                SELECT 
                                    *, COUNT(DISTINCT like_id) AS likes, COUNT(DISTINCT reply_id) AS replies
                                FROM    
                                    ((tweet NATURAL JOIN user) 
                                    AS A
                                    LEFT JOIN 
                                        (SELECT 
                                                reply_id,tweet_id as tweet_id_from_tweet
                                            FROM
                                                reply) AS B
                                    ON A.tweet_id = B.tweet_id_from_tweet) AS C
                                    LEFT JOIN 
                                        (SELECT 
                                                like_id,tweet_id as tweet_id_from_like
                                            FROM
                                                like) AS D
                                    ON C.tweet_id = D.tweet_id_from_like
                                where
                                    user.username like '%${username}%'
                                GROUP BY
                                    tweet_id
                                ;`;
  const tweetDetailsQueryArray = await db.all(tweetDetailsQuery);
  //   console.log(tweetDetailsQueryArray.length);
  if (tweetDetailsQueryArray.length === 0) {
    response.status(401);
    response.send("Invalid Request");
  }
  console.log(tweetDetailsQueryArray);
  let responseTweetDetailsQueryArray = [];
  const conversionToList = tweetDetailsQueryArray.map((eachResponse) => {
    const listObject = conversionOfDBObjectToResponseObjectForAPI9(
      eachResponse
    );
    responseTweetDetailsQueryArray.push(listObject);
  });
  //   console.log(responseTweetDetailsQueryArray);
  response.send([...responseTweetDetailsQueryArray]);
});

// API-10 Create a tweet in the tweet table

app.post("/user/tweets/", authenticateUser, async (request, response) => {
  //   console.log(request.username);
  const username = request.username;
  const { tweet } = request.body;
  //   console.log(tweet);
  //   console.log(username);
  var currentDateTime = new Date();
  console.log(currentDateTime);
  var date =
    currentDateTime.getFullYear() +
    "-" +
    (currentDateTime.getMonth() + 1) +
    "-" +
    currentDateTime.getDate();

  var time =
    currentDateTime.getHours() +
    ":" +
    currentDateTime.getMinutes() +
    ":" +
    currentDateTime.getSeconds();
  var dateTime = date + " " + time;
  //   console.log(dateTime);
  //Getting user_id from username
  const userIdQuery = `
                            SELECT
                                *
                            FROM
                                user
                            where
                                username like '%${username}%'
                            ;`;
  const userIdFromDB = await db.get(userIdQuery);
  const { user_id } = userIdFromDB;
  //   console.log(user_id);
  const createTweetQuery = `
                              INSERT INTO tweet
                                (tweet,user_id,date_time)
                            values
                                ('${tweet}',${user_id},'${dateTime}')
                            ;`;
  let result = await db.run(createTweetQuery);
  response.send("Created a Tweet");
});

// API-11 Delete a tweet in the tweet table

app.delete("/tweets/:tweetId/", authenticateUser, async (request, response) => {
  const username = request.username;
  const { tweetId } = request.params;
  //   console.log(tweetId);
  //Get UserId
  const userIdOfLoggedInUserQuery = `
                            SELECT
                                user_id
                            FROM
                                user
                            where
                                username like '%${username}%'
                            ;`;
  const userIdOfLoggedInUser = await db.get(userIdOfLoggedInUserQuery);
  //   console.log(userIdOfLoggedInUser);

  const userIdOfTweetQuery = `
                            SELECT
                                user_id
                            FROM
                                tweet
                            where
                                tweet_id ='${tweetId}'
                            ;`;
  const userIdOfTweet = await db.get(userIdOfTweetQuery);
  //   console.log(userIdOfTweet);
  if (userIdOfTweet === undefined) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    // console.log(userIdOfLoggedInUser.user_id === userIdOfTweet.user_id);
    if (userIdOfLoggedInUser.user_id === userIdOfTweet.user_id) {
      const deleteTweetQuery = `
                            DELETE
                            FROM
                                tweet
                            where
                                tweet_id ='${tweetId}'
                            ;`;
      let result = await db.run(deleteTweetQuery);
      response.status(200);
      response.send("Tweet Removed");
    } else {
      // console.log("FALSE");
      response.status(401);
      response.send("Invalid Request");
    }
  }
});

module.exports = app;
