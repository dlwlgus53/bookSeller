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
var userID = -1;


/* GET management page. */

router.get('/', function(req, res, next) {
  userID = req.session.userID;
  if(!userID) res.redirect('user/login');
  res.render('management');
});

/*관리->계정관리*/

router.get('/myinfo', function(req, res, next) {
  sql = "SELECT * FROM User WHERE " + "'" + userID + "' = user_index";
  connection.query(sql,function(err, result, fields){
    if (err) throw err;
    else{
      var string=JSON.stringify(result);
      var info =  JSON.parse(string);
      obj = {user : info}
      console.log(obj);
      res.render('management/myinfo', obj);  
    }
      
  });
});

/*관리->계정관리->이름 수정*/
router.get('/myinfo/set_name', function(req, res, next) {
  res.render('management/myinfo/set_name');
});

router.post('/myinfo/set_name', function(req, res, next) {
  var body = req.body;
  sql = "UPDATE User SET name = '"+ body.name +"' WHERE user_index = " + String(userID) ;
  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result.affectedRows + " record(s) updated");
  });
  res.redirect("/management/myinfo");
});


/*관리->계정관리->필명 수정*/
router.get('/myinfo/set_writer', function(req, res, next) {
  res.render('management/myinfo/set_writer');
});

router.post('/myinfo/set_writer', function(req, res, next) {
  var body = req.body;
  sql = "UPDATE User SET NickName = '"+ body.name +"' WHERE user_index = " + String(userID) ;
  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result.affectedRows + " record(s) updated");
  });
  res.redirect("/management/myinfo");
});


/*관리->계정관리->서재명 수정*/
router.get('/myinfo/set_shelf', function(req, res, next) {
  res.render('management/myinfo/set_shelf');
});

router.post('/myinfo/set_shelf', function(req, res, next) {
  var body = req.body;
  sql = "UPDATE User SET libraryName = '"+ body.name +"' WHERE user_index = " + String(userID) ;
  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result.affectedRows + " record(s) updated");
  });
  res.redirect("/management/myinfo");
});

/*관리->계정관리->서재설명 수정*/
router.get('/myinfo/set_description', function(req, res, next) {
  res.render('management/myinfo/set_description');
});

router.post('/myinfo/set_description', function(req, res, next) {
  var body = req.body;
  sql = "UPDATE User SET libraryDescription = '"+ body.description +"' WHERE user_index = " + String(userID) ;
  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result.affectedRows + " record(s) updated");
  });
  res.redirect("/management/myinfo");
});

/*관리->계정관리->핸드폰 번호 수정*/
router.get('/myinfo/set_phone', function(req, res, next) {
  res.render('management/myinfo/set_phone');
});

router.post('/myinfo/set_phone', function(req, res, next) {
  var body = req.body;
  sql = "UPDATE User SET phoneNumber = '"+ body.phone +"' WHERE user_index = " + String(userID) ;
  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result.affectedRows + " record(s) updated");
  });
  res.redirect("/management/myinfo");
});

/*관리->계정관리->이메일 수정*/
router.get('/myinfo/set_email', function(req, res, next) {
  res.render('management/myinfo/set_email');
});

router.post('/myinfo/set_email', function(req, res, next) {
  var body = req.body;
  sql = "UPDATE User SET email = '"+ body.email +"' WHERE user_index = " + String(userID) ;
  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result.affectedRows + " record(s) updated");
  });
  res.redirect("/management/myinfo");
});

/*관리->계정관리->비밀번호 수정*/
router.get('/myinfo/set_pw', function(req, res, next) {
  res.render('management/myinfo/set_pw');
});

router.post('/myinfo/set_pw', function(req, res, next) {
  var body = req.body;
  sql = "UPDATE User SET password = '"+ body.password +"' WHERE user_index = " + String(userID) ;
  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result.affectedRows + " record(s) updated");
  });
  res.redirect("/management/myinfo");
});

/*관리->구독관리*/
router.get('/subscribe', function(req, res, next) {
  res.render('management/subscribe');
});
// SELECT COUNT (*) as count FROM Buy;
/*관리->구독관리->구독내역 조회*/
router.get('/subscribe/history', function(req, res, next) {
  console.log(userID)
  sql = "SELECT date_format(from_date, '%Y-%m-%d') AS fromDate, date_format(to_date, '%Y-%m-%d') AS toDate, amount\
  FROM Buy WHERE user_index = " + userID + ";";
  connection.query(sql,function(err, result, fields){
    if(!result){
      res.render('alert', {message : 'no history'}); 
    }
  obj = 
  {print: result};
  console.log(result);
  res.render('management/subscribe/history', obj);               
  });
});

router.get('/hanna', function(req, res, next) {
  res.render('management/hanna');
});

/*관리->구독관리->구독취소*/
router.get('/subscribe/autopay', function(req, res, next) {
  console.log(req);
  sql = 
  "SELECT date_format(to_date, '%Y-%m-%d') AS date FROM Buy WHERE user_index = "+userID+" ORDER BY to_date DESC LIMIT 1;"
  + "SELECT auto FROM User WHERE user_index="+userID+";";
  connection.query(sql,function(err, result, fields){
    if (err) throw err;
    else{
      obj = {
        date : result[0],
        auto : result[1]
      };
      console.log(obj);
      res.render('management/subscribe/autopay', obj);  
    }
  });
});

router.post('/subscribe/autopay', function(req, res, next) {
  var body = req.body;
  sql = "UPDATE User SET auto = '"+ body.autopay +"' WHERE user_index = " + userID ;
  connection.query(sql, function (err, result) {
    if (err) throw err;
    console.log(result.affectedRows + " record(s) updated");
  });
  res.redirect("/management/subscribe/autopay");
});


router.get('/subscribe/alarm', function(req, res, next) {
  userID = req.session.userID;
  sql = "SELECT q.nickName, p.*, date_format(datetime, '%Y-%m-%d') AS pubDate FROM Alarm AS p LEFT JOIN User AS q ON p.user_index=q.user_index WHERE p.user_index=" + String(userID) +";" +
  "SELECT q.nickName, p.*, date_format(datetime, '%Y-%m-%d') AS pubDate FROM Alarm AS p LEFT JOIN User as q ON p.user_index=q.user_index;";
  connection.query(sql,function(err, result, fields){
    if(!result){
      res.render('alert', {message : 'no alarm'}); 
    }
    if(err){
      console.log(err);
    }
    obj = 
    {alarms: result[0],
    allAlarms: result[1]};
    res.render('management/subscribe/alarm', obj);               
  });
});
/*관리->구독관리->alarm 추가*/
router.post('/subscribe/addAlarm', function(req, res, next) {
  var uid = req.body.alarm_uid;
  var content = req.body.alarm_content;
  userID = req.session.userID;
  connection.query("INSERT INTO Alarm (user_index, content, datetime) VALUES (?, ?, NOW())", [
    uid, content
  ], function(err, result) {
    if (err) {
      console.log("alarm에 에러");
      console.log(err);
    }
    res.redirect("/management/subscribe/alarm");
  });
  
});
/*관리->구독관리->alarm 삭제*/
router.post('/subscribe/deleteAlarm', function(req, res, next) {
  var aid= req.body.del_alarm;
  connection.query("DELETE FROM Alarm WHERE alarm_id="+String(aid)+";",
  function(err, result) {
    if (err) {
      console.log("delete alarm에 에러");
      console.log(err);
    }
    console.log(result);
    res.redirect("/management/subscribe/alarm");
  });
});


router.post('/subscribe/addInterestCategory', function(req, res, next) {
  var content= req.body.add_cate;
  userID = req.session.userID;
  sql = "INSERT INTO User_Interest_Category (user_index, category_id)\
  VALUES(?,(SELECT category_id FROM class.Category WHERE content=? AND type = 3));";
  connection.query(sql,[userID,content],
  function(err, result) {
    if (err) {
      console.log("delete alarm에 에러");
      console.log(err);
    }
    console.log(result);
    res.redirect("/management/subscribe/interest_category");
  });
});

router.get('/subscribe/quote', function(req, res, next) {
  userID = req.session.userID;
  sql = "SELECT q.nickName, p.*, b.title FROM Quotation AS p \
    LEFT JOIN User AS q ON p.user_index=q.user_index\
    LEFT JOIN Book as b ON p.book_id=b.book_id \
    WHERE p.user_index=?;";
    connection.query(sql,[userID],function(err, result, fields){
    if(!result){
      console.log(result);
      res.render('alert', {message : '설정된 인용문이 없습니다.'}); 
    }
    if(err){
      console.log(err);
    }
    obj = 
    {quotes: result};
    res.render('management/subscribe/quote', obj);               
  });
});
/*관리->구독관리->인용문 추가*/
router.post('/subscribe/addQuote', function(req, res, next) {
  var bid = req.body.bookID;
  var content = req.body.quote_content;
  userID = req.session.userID;
  connection.query("INSERT INTO Quotation (user_index, book_id, content, datetime) VALUES (?,?,?, NOW());", [
    userID, bid,content], function(err, result) {
    if (err) {
      console.log("quote 추가에 에러");
      console.log(err);
    }
    res.redirect("/management/subscribe/quote");
  });
  
});
/*관리->구독관리->인용문 삭제*/
router.post('/subscribe/deleteQuote', function(req, res, next) {
  var qid= req.body.del_qid;
  connection.query("DELETE FROM Quotation WHERE quotation_id="+String(qid)+";",
  function(err, result) {
    if (err) {
      console.log("delete quote에 에러");
      console.log(err);
    }
    console.log(result);
    res.redirect("/management/subscribe/quote");
  });
});

/*관리->계정관리-> 인용문 수정*/
router.get('/subscribe/set_quote', function(req, res, next) {
  var qid = req.param("qid");
  sql = "SELECT * FROM Quotation WHERE quotation_id=?"
    connection.query(sql,[qid],function(err, result, fields){
    if(err){
      console.log(err);
    }
    obj = 
    {quotes: result};
    res.render('management/subscribe/set_quote', obj);               
  });
});
/*관리->구독관리->인용문 수정*/
router.post('/subscribe/set_quote', function(req, res, next) {
  var qid = req.body.qid;
  var content = req.body.content;
  console.log(qid);
  console.log(content);
  connection.query("UPDATE Quotation SET content = ? WHERE quotation_id = ?;", [
    content, qid], function(err, result) {
    if (err) {
      console.log("quote 수정에 에러");
      console.log(err);
    }
    res.redirect("/management/subscribe/quote");
  });
});

/*관리->공지사항*/
router.get('/notice', function(req, res, next) {
  sql = "SELECT * FROM Notice WHERE is_deleted=0"
    connection.query(sql,function(err, result, fields){
    if(err){
      console.log(err);
    }
    obj = 
    {notices: result};
    res.render('management/notice', obj);               
  });
});

/*관리->공지사항*/
router.get('/detailNotice', function(req, res, next) {
  var nid=req.param("nid");
  sql = "SELECT *, date_format(datetime, '%Y-%m-%d') AS pubDate FROM Notice WHERE is_deleted=0 AND notice_id=?";
    connection.query(sql,[nid],function(err, result, fields){
    if(err){
      console.log(err);
    }
    console.log(result);
    obj = 
    {notices: result};
    res.render('management/detailNotice', obj);               
  });
});

module.exports = router;
