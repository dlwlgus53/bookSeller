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

var userID =-1
var ownerID;
var mine;


/* GET shelf page. */
router.get('/', function(req, res, next) {
  mine =0 ;
  if(!req.session.userID) res.redirect('user/login');
  else{
    ownerID =  req.param("sid");
    userID = req.session.userID;
    if(ownerID == userID || ownerID == -1){
    // 남서재, 내서재 구분
      mine=1;
      ownerID=userID;
    }  
    //console.log("session" + req.session.ownerID);
    console.log("shelf");
    //ownerID = req.session.ownerID;

  
    sql = 
    //[0]user info
      "SELECT * FROM User WHERE " + "'" + ownerID + "' = user_index;" + 
      //[1] follower count
     " SELECT COUNT (user_index) as count FROM Subscribe WHERE " + "'" + ownerID + "' = user_index;"+ 
     //[2]following count
     " SELECT COUNT (follower_id) as count FROM Subscribe WHERE " + "'" + ownerID + "' = follower_id;"+
    //[3]나의 post 정보 가져오기
      "SELECT *,t1.title AS c_title, Post.title AS p_title, Post.user_index FROM (SELECT * FROM Post_Category WHERE '" + ownerID + "' = user_index) t1\
      JOIN Post\
      ON t1.post_category_id=Post.post_category_id;"+
      //[4]내가 구독하는 사람의 post 가져오기
      "SELECT  Post.post_id, Post.title, User.nickName, User.user_index FROM Subscribe INNER JOIN User ON Subscribe.user_index = User.user_index INNER JOIN Post ON Subscribe.user_index = Post.user_index WHERE Subscribe.follower_id = "+"'" +  ownerID+"';"+
      //좋아요 수
      "SELECT COUNT (love_id) as count FROM Love WHERE type='book' AND '" + ownerID + "' = user_index AND  love_status = 1;"+
      //[6]읽은 책 수
      "SELECT COUNT (book_read_id) as count FROM Book_Read WHERE return_date is not NULL AND '" + ownerID + "' = user_index;"+
      //[7]인용문 수
      "SELECT COUNT (quotation_id) as count FROM Quotation WHERE '" + ownerID + "' = user_index;"+
      //[8]대여중인 도서
      "SELECT * FROM Book_Read INNER JOIN Book ON Book_Read.book_id = Book.book_id  WHERE return_date is NULL AND '" + ownerID + "' = user_index;"+
      //[9]카테고리 수
      "SELECT DISTINCT bookshelf_title FROM Bookshelf WHERE '" + ownerID + "' = user_index;"+
      //[10]카테고리 별 도서
      "SELECT * FROM Bookshelf INNER JOIN Book ON Bookshelf.book_id = Book.book_id WHERE '" + ownerID + "' = user_index;"+
      //[11]읽은 책
      "SELECT t2.title FROM (SELECT * FROM Book_Read WHERE '" + ownerID + "' = Book_Read.user_index) t1\
      LEFT JOIN (SELECT * FROM Book) t2\
      ON t1.book_id = t2.book_id;"+
      //[12]좋아요를 누른 책
      "SELECT t1.nickName, t3.title\
      FROM User AS t1\
      LEFT JOIN Love AS t2 ON t1.user_index=t2.user_index \
      LEFT JOIN Book AS t3 ON t2.book_id=t3.book_id \
      WHERE t1.user_index='" + ownerID + "' AND t2.type='book' AND t2.love_status=1;"+
      //[13]인용문을 사용한 책
      "SELECT t2.title FROM (SELECT * FROM Quotation WHERE '" + ownerID + "' = user_index) t1\
      LEFT JOIN (SELECT * FROM Book) t2\
      ON t1.book_id = t2.book_id;"+
      // //[14]내가 구독중인 사람들
      "SELECT nickName,Subscribe.user_index\
      FROM User\
      INNER JOIN Subscribe\
      ON User.user_index=Subscribe.user_index AND '" + ownerID + "' = Subscribe.follower_id;"+
      //[15]나를 구독하는 사람들
      "SELECT nickName, User.user_index\
      FROM User\
      INNER JOIN Subscribe\
      ON User.user_index=Subscribe.follower_id AND'" + ownerID + "' = Subscribe.user_index;"+
      //[16]서재 공지사항
      "SELECT * FROM class.Announcement WHERE is_deleted=0;";
    connection.query(sql,function(err, result, fields){
      if (err) throw err;
      else{
          obj = 
        { user: result[0],
          follower: result[1],
          following: result[2],
          myposts : result[3],
          followingPosts : result[4],
          love : result[5],
          read: result[6],
          quotation: result[7],
          borrowings : result[8],
          category : result[9],
          categorized : result[10],
          mine : {value : mine},
          reads : result[11],
          loves : result[12],
          quotes : result[13],
          following_n : result[14],
          follower_n :result[15],
          me : {user_index : userID},
          notices : result[16]
        };
        // console.log(obj);
        res.render('shelf',obj);
      }
    })
  }
});

/* GET shelf/post page. */
router.get('/post', function(req, res, next) {
  //ownerID = req.session.ownerID;
  var pid =  req.param("pid");
  var uid =  req.param("uid");
  sql = 
  "SELECT * FROM User WHERE " + "'" + uid+ "' = user_index;" + 
  "SELECT * FROM Post WHERE '" + pid + "' = post_id;"+
  //[2]댓글 읽기
  "SELECT t2.nickName, t1.content, t1.datetime\
  FROM (SELECT * FROM Comment WHERE post_id='"+pid+"') t1\
  LEFT JOIN (SELECT * FROM User) t2\
  ON t1.user_index=t2.user_index;"+
  //[3]관련 태그 보기
  "SELECT t2.title AS post_title, t1.content AS tag\
  FROM (SELECT * FROM Post_Tag WHERE post_id = '" +pid +"') t1\
  LEFT JOIN (SELECT * FROM Post) t2\
  ON t1.post_id = t2.post_id;";

  connection.query(sql, function(err, result, fields){
    if (err) throw err;
    else {
      console.log(result);
      obj = {
          writer : result[0],
          post : result[1],
          comments : result[2],
          tags : result[3]}
          console.log(result[3]);
      res.render('shelf/post',obj);
    }
  });

});

/* SET comment . */
router.post('/post', function(req, res, next) {
  if(!req.session.userID) res.redirect('user/login');
  else{
    var body = req.body;
    var userID = req.session.userID;//댓글 작성자
    var pid =  req.param("pid");//post 작성자

    sql = "INSERT INTO Comment (user_index, post_id, content, datetime)\
    VALUES ('"+userID+"','"+ pid +"','"+ body.comment + "', NOW());";
    

    console.log(sql)
    connection.query(sql, function(err, result, fields){
      if (err) throw err;
      else {
        console.log(result.affectedRows);
        res.redirect("back")
      }
    });

  }
  
});




/* GET shelf/post/delete page. */
router.get('/post/delete', function(req, res, next) {

  // = req.session.ownerID;
  var pid =  req.param("pid");
  var uid =  req.param("uid");
  sql = "DELETE FROM Post WHERE '" + pid + "' = post_id;"
  connection.query(sql, function(err, result, fields){
    if (err) throw err;
    else {
      res.redirect('/shelf?sid='+'-1');
    }
  });

});


/* GET shelf/post/delete page. */
router.get('/post/setpost', function(req, res, next) {
  ownerID = req.session.userID;;//post manage can be done by owner only
  var pid =  req.param("pid");

  if(pid==-1){
    sql = "SELECT * FROM Post_Category WHERE '" + ownerID + "' = user_index;"+
    "SELECT * FROM Category WHERE '" + 3+ "' = type;";

    connection.query(sql, function(err, result, fields){
      if (err) throw err;
      else {
    obj = { info : [{post_id : -1}],
          post_category : result[0],
          user_category : result[1]
        }
      
    res.render('shelf/setpost', obj);
      }
    })

  }else{
    sql = "SELECT *  FROM Post WHERE '" + pid + "' = post_id;"+
    "SELECT * FROM Post_Category WHERE '" + ownerID + "' = user_index;"+
    "SELECT * FROM Category WHERE '" + 3+ "' = type;";
    console.log(sql);
    connection.query(sql, function(err, result, fields){
      if (err) throw err;
      else {
     
        obj = {
          info : result[0],
          post_category : result[1],
          user_category : result[2]}
          
          console.log(obj);
          res.render('shelf/setpost', obj);
      }
    });

  }
});


router.post('/post/setpost', function(req, res, next) {
  var body = req.body;
 
  var pid =  req.param("pid");
  if(pid==-1){
  
    sql =  "INSERT INTO Post  (user_index, title,contents, post_category_id, interest_category_id)\
    VALUES('"+ownerID+"','"+ body.title+"','"+ body.contents+"','"+body.post_cate+"','"+body.user_cate+"');";
    connection.beginTransaction(function(err){
      if (err) {throw err;}
      connection.query(sql, function (err, result) {
      if(err){
        console.error(err);
        connection.rollback(function () {
           console.error('rollback error');
            throw err;
      })
    }else{
        sql = "SELECT MAX(Post_id) AS pid FROM Post WHERE '" + ownerID + "' = user_index;";
        connection.query(sql, function (err, result) {
          if(err){
            console.error(err);
            connection.rollback(function () {
               console.error('rollback error');
                throw err;
          })
        }else{
            console.log(result[0])
            pid =result[0].pid;
            console.log(pid);
            sql = "INSERT INTO Post_Tag (post_id, content)  VALUES ('"+pid+"','"+body.tag+"');";
            connection.query(sql, function (err, result) {
              if(err){
                console.error(err);
                connection.rollback(function () {
                   console.error('rollback error');
                    throw err;
              })
            }else{
                  console.log("update");
                  res.redirect('/shelf?sid='+'-1');
                }
              });
            }
          });
        };
      })
    })
    }else{
    var pid =  req.param("pid");
    sql = "UPDATE Post SET post_category_id = \
    '"+body.post_cate+"',title = '" + body.title+"'\
     ,contents = '"+ body.contents +"' ,interest_category_id = '" + body.user_cate + "' \
      WHERE '" + pid + "' = post_id;"+
      "UPDATE Post_Tag SET content = '"+body.tag+"' WHERE '" + pid + "' = post_id;";

    console.log(sql);
    connection.query(sql, function (err, result) {
      if (err) throw err;
      else{
        console.log(result.affectedRows + " record(s) updated");
        res.redirect('/shelf?sid='+'-1');
      }
      
    });
  }
  
});



/* GET shelf/libManage page. */
router.get('/libManage', function(req, res, next) {
  var category;
  var category_count;


  if(!req.session.userID) res.redirect('../user/login');
  else{
    sql = "SELECT COUNT(book_id) as count, bookshelf_title, bookshelf_id as id FROM Bookshelf WHERE '" + ownerID + "' = Bookshelf.user_index GROUP BY bookshelf_title;";
    connection.query(sql, function(err, result, fields){
      if (err) throw err;
      else {
            obj = {
              category_count : result
            }
            console.log(obj)
            res.render('shelf/library/libManage', obj);
          }

      });
  }

});

/* GET shelf/libManage page. */
router.get('/libManage/modify', function(req, res, next) {

  if(!req.session.userID) res.redirect('../user/login');
  else{
    sql = "SELECT COUNT(book_id) as count, bookshelf_title, bookshelf_id as id FROM Bookshelf WHERE '" + ownerID + "' = Bookshelf.user_index GROUP BY bookshelf_title;";
    connection.query(sql, function(err, result, fields){
      if (err) throw err;
      else {
            obj = {
              category_count : result
            }
            console.log(obj)
            res.render('shelf/library/libManage', obj);
          }

      });
  }

});

/* DELETE category shelf/libManage/delete page. */
router.get('/libManage/delete', function(req, res, next) {
  // = req.session.ownerID;
  var cname =  decodeURIComponent(req.param("cname"));

  sql = "DELETE FROM Bookshelf WHERE '" + ownerID + "' = Bookshelf.user_index'" + cname + "' = bookshelf_title;"
  connection.query(sql, function(err, result, fields){
    if (err) throw err;
    else {
      console.log("Affect : " + result.affectedRows);
      res.redirect('/shelf/libManage');
    }
  });
});

/* SET category shelf/libManage/delete page. */
router.get('/libManage/libSet', function(req, res, next) {
  // = req.session.ownerID;
  var cname =  decodeURIComponent(req.param("cname"));
  sql = "SELECT * FROM Bookshelf INNER JOIN Book ON Bookshelf.book_id = Book.book_id WHERE '" + cname + "' = bookshelf_title;"+
  "SELECT * FROM Book;";
      
  connection.query(sql, function(err, result, fields){
    if (err) throw err;
    else {
      obj ={
        my_books : result[0],
        books : result[1]
      };
      console.log(obj);
      res.render('shelf/library/libSet', obj);

      
    }
  });
});

/* SET category shelf/libManage/delete page. */
router.post('/libManage', function(req, res, next) {
  var ids = req.body.bookid;
  var new_name = req.body.bookshelf_title;
  var cname =  decodeURIComponent(req.param("cname"));

  console.log("ids" + ids);
  console.log("new_name" + new_name);


  

  sql = "DELETE FROM Bookshelf WHERE '" + ownerID + "' = user_index AND'" + cname + "' = bookshelf_title; ";
  ids.forEach(function(id) {
    sql += "INSERT INTO Bookshelf (user_index,book_id,bookshelf_title) VALUES ('"+ ownerID +"','"+ id + "','"+ new_name +"'); "
  });

  connection.query(sql, function(err, result, fields){
    if (err) throw err;
    else {
      res.redirect('/shelf/libManage');
    }
  

  });
});

/* SET category shelf/subscribe page. */
router.get('/subscribe', function(req, res, next) {
  if(!req.session.userID) res.redirect('user/login');
  else{
    userID = req.session.userID;
    sql = "INSERT INTO Subscribe (user_index,follower_id) VALUES ('"+ ownerID +"','"+ userID +"');";

    connection.query(sql, function(err, result, fields){
      if (err) throw err;
      else {
        console.log(sql)
        res.redirect("back")
      }
    });

  }
  
});

/* SET category shelf/unsubscribe page. */
router.get('/unsubscribe', function(req, res, next) {
  if(!req.session.userID) res.redirect('user/login');
  else{
    var userID = req.session.userID;
    sql = "DELETE FROM Subscribe WHERE '" + userID + "' = follower_id AND '" + ownerID +"' = user_index;";
    console.log(sql)
    connection.query(sql, function(err, result, fields){
      if (err) throw err;
      else {
        console.log(result.affectedRows);
        res.redirect("back")
      }
    });

  }
  
});




module.exports = router;
