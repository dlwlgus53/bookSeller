var express = require('express');
var router = express.Router();
var mysql = require("mysql");
var db_config = require('./db_config.json');

var connection = mysql.createConnection({
  connectionLimit: 100,
  host : db_config.host,
  port : 3306,
  user: db_config.user,
  password: db_config.password,
  database: db_config.database,
  multipleStatements: true,
});


var obj = {};

var userID = -1


/* login page */
router.get('/user/login', function(req, res, next) {
  res.render('user/login');
});


/*login 확인 과정*/
router.post('/user/login', function(req, res, next) {
  console.log("in");
  var body = req.body;//email, password
  connection.query("SELECT COUNT (user_index) as count FROM User WHERE ( email = '" + body.email + "' AND Password = '" + body.password +"' )",
  function(err, result, fields){
    if(err){
      console.log("쿼리문에 오류가 있습니다.");
      console.log(err);
    }
    else if(result && result[0].count ==1){
      console.log("유저 이메일" + body.email);
      
      sql = 
      "SELECT *  FROM User WHERE email = '" + body.email + "';"
      + "SELECT to_date FROM Buy\
        WHERE user_index = (SELECT user_index FROM User WHERE email='"+body.email+"')\
        ORDER BY to_date DESC LIMIT 1;";

      connection.query(sql, function(err, result, fields){
        if (err){
          console.log("쿼리문에 오류가 있습니다.");
          console.log(err);
        }
        else{
          var today = new Date();
          console.log(result[0][0]);
          // console.log(result[1][0].to_date);
          console.log(result[0][0].user_index);
          console.log(today);
          console.log(sql);
          
          userID = result[0][0].user_index;
          console.log("유저 인덱스 "+userID);
          req.session.userID = userID;
          if(req.session.userID)  console.log("success" + req.session.userID)
          // req.app.locals.userID = result[0].user_index;

          
          // console.log(result[1].to_date);
          //정기결제 설정 && 결제일 지났으면 결제 페이지로 이동
          if(result[1][0].to_date==null || result[1][0].to_date <= today){
            if(result[0][0].auto!=0){
              console.log("정기결제");
              sql = "INSERT INTO Buy (user_index, from_date, to_date) VALUES ("+userID+", NOW(), date_add(NOW(), INTERVAL 1 MONTH));";
                  // + "UPDATE User SET is_premium = 0 WHERE user_index="+userID;
              connection.query(sql, function(err, result, fields){
                if (err){
                  console.log("쿼리문에 오류가 있습니다.");
                  console.log(err);
                }
                else{
                  return res.render('alert', {message : '정기권이 자동 결제 되었습니다.'});
                }
              });
            }
            // 기한 지남 && 정기결제 설정 x -> is_premium 0으로 설정
            else{
              console.log("프리미엄 취소");
              sql = "UPDATE User SET is_premium = 0 WHERE user_index="+userID;
              connection.query(sql, function(err, result, fields){
                if (err){
                  console.log("쿼리문에 오류가 있습니다.");
                  console.log(err);
                }
                else{
                  return res.render('alert', {message : '결제가 되지 않아 책을 빌리실 수 없습니다. 관리-구독관리-자동결제 설정을 체크하고 재로그인 하면 결제 됩니다.'});
                }
              });
            }
            
          }

          //아니면 홈으로
          else {
            console.log("결제보류");
            return  res.redirect("/");
          }
        }
      }) 
    }
    else{
        return res.render('alert', {message : 'no such user'}); 
    }
  });
});


/* GET home page. */
router.get('/', function(req, res, next) {
  userID = req.session.userID;
  if(!userID) res.redirect('user/login');
  else {
  sql = 
    // [0] column 1 - 오늘의 책
    "SELECT Book.* FROM Book \
      NATURAL JOIN Book_Recommend \
      WHERE Book_Recommend.category='오늘의 책' AND Book_Recommend.book_id=Book.book_id;"
    // [1] column 2 - 오늘의 리딩북
    + "SELECT Book.* FROM Book \
        NATURAL JOIN Book_Recommend \
        WHERE Book_Recommend.category='오늘의 리딩북' AND Book_Recommend.book_id=Book.book_id;" 
    // [2] column 3 - 실시간 인용문
    + "SELECT t2.nickName, t1.content, t1.datetime, t3.title\
        FROM (SELECT * FROM Quotation ORDER BY datetime DESC LIMIT 5) t1\
        LEFT JOIN (SELECT * FROM User) t2\
        ON t1.user_index = t2.user_index\
        LEFT JOIN (SELECT * FROM Book) t3\
        ON t1.book_id = t3.book_id;"
    // [3] column 4 - 밀리 작가 특집
    + "SELECT * FROM Post \
        WHERE user_index='1' \
        ORDER BY datetime DESC LIMIT 3;"
    // [4] column 5 - 독서
    + "SELECT t1.num, t2.nickName \
        FROM (SELECT user_index, count(*) AS num \
          FROM Book_Read WHERE return_date IS NOT NULL \
          GROUP BY user_index ORDER BY count(*) DESC LIMIT 10) t1 \
        LEFT JOIN (SELECT * FROM User) t2 \
        ON t1.user_index = t2.user_index;"
    // [5] column 5 - 서평
    + "SELECT t1.num, t2.nickName \
        FROM (SELECT user_index, count(*) AS num \
        FROM Post WHERE user_index != '1' \
        GROUP BY user_index ORDER BY count(*) DESC LIMIT 10) t1 \
        LEFT JOIN (SELECT * FROM User) t2 \
        ON t1.user_index = t2.user_index;"
    // [6] column 6 - 월간 차트
    + "SELECT t1.num, t2.book_id, t2.title, t2.writer, t2.publisher \
        FROM ( \
          SELECT book_id, count(*) AS num \
            FROM Book_Read \
            WHERE DATE(borrow_date\
          ) \
        BETWEEN DATE_ADD(NOW(),INTERVAL -1 MONTH ) AND NOW() \
        GROUP BY book_id \
        ORDER BY count(*) DESC LIMIT 10) t1 \
        NATURAL JOIN (SELECT * FROM Book) t2 \
        WHERE t1.book_id = t2.book_id;"
    // [7] column 6 - 주간 차트
    + "SELECT t1.num, t2.book_id, t2.title, t2.writer, t2.publisher \
        FROM ( \
          SELECT book_id, count(*) AS num \
            FROM Book_Read \
            WHERE DATE(borrow_date\
          ) \
        BETWEEN DATE_ADD(NOW(),INTERVAL -1 WEEK ) AND NOW() \
        GROUP BY book_id \
        ORDER BY count(*) DESC LIMIT 10) t1 \
        NATURAL JOIN (SELECT * FROM Book) t2 \
        WHERE t1.book_id = t2.book_id;"
    // [8] column 6 - 누적 차트
    + "SELECT * FROM Book ORDER BY like_count DESC LIMIT 10;"
    // [9] column 7 -밀리 오리지널
    + "SELECT * FROM Book WHERE publisher = '밀리의서재';"
    // [10] column 8 - 태그 픽
    + "SELECT Book_Tag.content, count(*) AS num\
        FROM Book_Tag \
        GROUP BY content ORDER BY count(*) DESC LIMIT 5;"
    // [11] column 9 - 이벤트 목록
    + "SELECT * FROM class.Event WHERE to_date > NOW();"
    + "SELECT * FROM class.Event WHERE to_date < NOW();"
    ;

  connection.query(sql, function(err, query, fields){
    if (err){
      console.log("쿼리문에 오류가 있습니다.");
      console.log(err);
    }
    obj = 
    {
      book_today: query[0],
      readingbook_today: query[1],
      quotation: query[2],
      weekly_writer: query[3],
      user_read: query[4],
      user_post: query[5],
      book_month: query[6],
      book_week: query[7],
      book_year: query[8],
      mili_original: query[9],
      tag_pick: query[10],
      event_ing: query[11],
      event_end: query[12]
    };
    res.render('home',obj);
  });
}
});

router.post('/', function(req, res, next){
  connection.query(
  );
});

/* GET search page. */
router.get('/search', function(req, res, next) {
  var info =  req.param("info");
  var tag = req.param("tag");
  var post = req.param("post");
  var post_tag = req.param("post_tag");

  if (typeof info == "undefined" && typeof tag == "undefined" && typeof post == "undefined" && typeof post_tag == "undefined") {
    res.render('search');
  }
  else if(typeof info != "undefined"){
      sql = "SELECT * FROM Book WHERE (title LIKE '%" + info + "%') OR (writer LIKE '%" + info + "%') OR (publisher LIKE '%" + info + "%');";
      connection.query(sql, function (err, result, fields) {
        console.log(result);
        obj = {
          book_result: result
        };
        res.render('searchResult', obj);
      });
  }
  else if(typeof tag != "undefined"){
    sql = "SELECT * FROM Book RIGHT JOIN (SELECT book_id FROM Book_Tag WHERE is_deleted=0 AND content LIKE '%"+tag+"%')t2\
      ON Book.book_id = t2.book_id;";
      connection.query(sql, function (err, result, fields) {
        console.log(result);
        obj = {
          book_result: result
        };
        res.render('searchResult', obj);
      });
  }
  else if(typeof post != "undefined"){
    sql = "SELECT * FROM Post WHERE (title LIKE '%" + post + "%');";
      connection.query(sql, function (err, result, fields) {
        console.log(result);
        obj = {
          book_result: result
        };
        res.render('searchPostResult', obj);
      });
  }
  else if(typeof post_tag != "undefined"){
    sql = "SELECT * FROM Post RIGHT JOIN (SELECT post_id FROM Post_Tag WHERE content LIKE '%"+post_tag+"%')t2\
    ON Post.post_id = t2.post_id;";
      connection.query(sql, function (err, result, fields) {
        console.log(result);
        obj = {
          book_result: result
        };
        res.render('searchPostResult', obj);
      });
  }

});




/* 회원가입 */
router.get('/user/addUser', function(req, res, next) {
  res.render('user/addUser');
});

router.post('/user/addUser', function(req, res, next) {
  var body = req.body;
  var sql;
  sql =  "SELECT COUNT (user_index) as count FROM User WHERE email = '" + body.email + "'";
  // connection.beginTransaction(function(err) {
    // if (err) {throw err;}
    connection.query(sql,function(err, result, fields){
    if (err) throw err;
    else if(result && result[0].count ==1){
      res.render('alert', {message : 'same email'}); 
    }
    else{
      // connection.query("INSERT INTO User (email, Password, Name, Sns) VALUES (?, ?, ?, ?)", [
      //   body.email, body.password, body.name, body.sns
      // ])
      sql="INSERT INTO User  (email, Password, Name, Sns) \
      VALUES('"+ body.email +"','"+ body.password +"','"+body.name+"','"+body.sns+"');";

      connection.query(sql, function(err, result, fields){
        if(err){
          console.error(err);
          connection.rollback(function () {
             console.error('rollback error');
              throw err;
        })
      }else{
        
        connection.query("SELECT user_index FROM User WHERE " + "'" + body.email + "' = email",
        function(err, result, fields){
          if (err) throw err;
          else{
            userID = result[0].user_index;
            console.log(result)
            var libraryName = "유명한 여행가의 서재_" + String(userID);
            var nickName = "유명한 여행가_"+ String(userID);
            sql = "UPDATE User SET libraryName = '" + libraryName+"', NickName = '"+ nickName +"' WHERE user_index = " + String(userID)+";" +
            "INSERT INTO Buy (user_index, from_date, to_date) VALUES ("+userID+", NOW(), date_add(NOW(), INTERVAL 1 MONTH));";
            
            connection.query(sql, function (err, result) {
              if (err) throw err;
              else{
                console.log(result[0].affectedRows + " record(s) updated");

              }
            });
            console.log(userID);
            res.redirect("/");
          }
        });
      }
      });
    };
    });
  });
// });



router.get('/index', function(req, res, next) {
  connection.query("SELECT * FROM book;", function(err, books, fields){
    connection.query("SELECT * FROM book;", function(err, counts, fields){
      obj = 
      {print: books,
       counts : count};
      res.render('index', obj);     
    });       
  });

});

/*Get 책 목록 추가 page*/
router.get('/create', function(req, res, next) {
  res.render('create');
});

router.post('/create', function(req, res, next) {
  var body = req.body;
  console.log(body.name);
  console.log(body.author);
  connection.query("INSERT INTO book (name, author) VALUES (?, ?)", [
      body.name, body.author
    ], function(){
      
    res.redirect("/");
  });
});



/*GET event page*/
router.get('/event', function(req, res, next) {
  if(!req.session.userID) res.redirect('user/login');
  else{
   var uid = req.session.userID;
    var eid = req.param("eid");

    sql = 
    "SELECT * FROM Event WHERE '"+eid+"'=event_id;"
    + "SELECT t2.nickName, t1.*, date_format(datetime, '%Y-%m-%d') AS pubDate \
      FROM (SELECT * FROM Comment WHERE event_id ="+eid+" AND is_deleted=0) t1\
      LEFT JOIN (SELECT * FROM User) t2\
      ON t1.user_index = t2.user_index;"
    ;
    connection.query(sql, function(err, query, fields){
      if (err) {
        console.log("IN EVENT");
        console.log(err);
      }
      else{
        console.log(query);
        obj = {
          event: query[0],
          comment: query[1],
          uid: uid
        }
        res.render('event',obj);
      }
    });
  }
});
router.post('/event/addComment', function(req, res, next){
  userID = req.session.userID;
  var comment = req.body.comment;
  var eid = req.body.eid;
  sql = 
  "INSERT INTO Comment (user_index, event_id, datetime, content)\
  VALUES(?,?,NOW(),?);";
  connection.query(sql,[userID, eid, comment ], function(err, result){
    if (err){
      console.log("IN ADD EVENT");
      console.log(err);
    console.log(result.affectedRows + " record(s) updated");
    }
  });
  res.redirect("/event?eid="+eid);
});

router.post('/event/deleteComment', function(req, res, next){
  userID = req.session.userID;
  var eid = req.param("eid");
  var cid = req.body.del_cid;
  console.log(cid);
  sql = "UPDATE Comment SET is_deleted=1 WHERE comment_id= ? AND user_index=?;";
  connection.query(sql,[cid,userID], function(err, result){
    if (err){
      console.log("IN DELETE EVENT");
      console.log(err);
    }
  });
  res.redirect("/event?eid="+eid);
});

/* 회원가입 */
router.get('/user/addUser', function(req, res, next) {
  res.render('user/addUser');
});

router.post('/user/addUser', function(req, res, next) {
  var body = req.body;
  var sql;
  sql =  "SELECT COUNT (User_index) as count FROM User WHERE Email = '" + body.email + "'";
  connection.query(sql,function(err, result, fields){
    if (err) throw err;


    else if(result && result[0].count ==1){
      res.render('alert', {message : 'same email'}); 
    }
    else{
      connection.query("INSERT INTO User (Email, Password, Name, Sns) VALUES (?, ?, ?, ?)", [
        body.email, body.password, body.name, body.sns
      ]);
      connection.query("SELECT User_index FROM User WHERE " + "'" + body.email + "' = Email",
      function(err, result, fields){
        if (err) throw err;
        else{
          userID = result[0].User_index;
          var libraryName = "유명한 여행가의 서재_" + String(userID);
          var nickName = "유명한 여행가_"+ String(userID);
          sql = "UPDATE User SET LibraryName = '" + libraryName+"', NickName = '"+ nickName +"' WHERE User_index = " + String(userID) ;
          connection.query(sql, function (err, result) {
            if (err) throw err;
            console.log(result.affectedRows + " record(s) updated");
          });
          console.log(userID);
          res.redirect("/");
        }

      });

    };
  });
});






router.get('/management/hanna/interest_set', function(req, res, next) {
  console.log(req);

  sql = 
  "SELECT t1.UIC_id, t2.content, t2.category_id FROM \
  	(SELECT * FROM User_Interest_Category WHERE user_index = "+userID+") t1\
    LEFT JOIN (SELECT * FROM Category) t2\
    ON t1.category_id=t2.category_id;";
  connection.query(sql,function(err, result, fields){
    if (err) throw err;
    else{
      obj = {print : result};
      console.log(obj);
      res.render('management/hanna/interest_set', obj);  
    }
  });
});

router.post('/management/hanna/interest_set', function(req, res, next) {
  var body = req.body;
  sql = "INSERT INTO User_Interest_Category (user_index, category_id)\
    VALUES("+userID+",(SELECT category_id FROM Category WHERE content = '"+body.category+"' AND type=3))";
  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result.affectedRows + " record(s) updated");
  });
  res.redirect('/management/hanna/interest_set');
  });

router.get('/management/hanna/interest_delete', function(req, res, next) {
  var iid =  req.param("iid");
  sql = "DELETE FROM User_Interest_Category WHERE '" + iid + "' = UIC_id;"
  connection.query(sql, function(err, result, fields){
    if (err) throw err;
    else {
      res.redirect('interest_set');
    }
  });
});

router.get('/management/hanna/interest_bookpost', function(req, res, next){
  sql = 
  "SELECT t4.book_id, t4.writer, t4.publisher, t4.title\
	FROM (SELECT DISTINCT t2.book_category_id\
		FROM (SELECT * FROM User_Interest_Category WHERE user_index = "+userID+") t1\
		LEFT JOIN (SELECT * FROM Interest_Book) t2\
		ON t1.category_id = t2.interest_category_id) t3\
    LEFT JOIN (SELECT * FROM Book) t4\
    ON t3.book_category_id = t4.book_category_id\
    ORDER BY like_count DESC, year DESC LIMIT 5;"
  +"SELECT t3.post_id, t3.user_index, t3.title, t4.nickName, t3.datetime\
    FROM (SELECT * FROM (SELECT category_id FROM User_Interest_Category WHERE user_index = "+userID+") t1\
      LEFT JOIN (SELECT * FROM Post) t2\
      ON t1.category_id = t2.interest_category_id\
      ORDER BY datetime DESC LIMIT 5) t3\
    LEFT JOIN (SELECT * FROM User) t4\
    ON t3.user_index=t4.user_index;";
  connection.query(sql,function(err, result, fields){
    if (err) throw err;
    if (!result) res.render('alert', {message : 'no book and post. check your interest'});
    else{
      obj = {
        book : result[0],
        post : result[1]
      };
      console.log(obj);
      res.render('management/hanna/interest_bookpost', obj);  
    }
  });
});



module.exports = router;
