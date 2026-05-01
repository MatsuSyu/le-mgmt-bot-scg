
function myFunction3() {
  getSaturday();
  getSunday();
}
function test001(){
  var res = determineAction("予定取得");
  console.log("res:"+res);
}

function determineAction(inputText) {
    var resVal ="";
    // 入力文字列に「予定取得」または「予定確認」が含まれているかチェック
    
    if (inputText.startsWith("予定取得") || inputText.startsWith("予定確認")|| inputText.startsWith("取得")|| inputText.startsWith("確認")) {
        console.log("予定取得アクションを実行します。");
        // 予定取得の処理
        var wDate0,wDate1,wDate2;
        var wDate0,wVal1,wVal2;
        var resVals = [];
        if(new Date().getDay()==0){ //今日が日曜なら先に日曜だけ出す
          resVals[0] = strRes(getSunday()) 
            + "------------"
            + "\n"
        }else{
          resVals[0] = "";
        }
        resVals[1] = strRes(getSaturday());
        resVals[2] = strRes(getNextSunday());
        resVal = "" 
         + resVals[0] 
         + resVals[1] 
         + "------------"
         + "\n"
         + resVals[2] 

        
    } else if (inputText.includes("予定登録")) {
        console.log("予定登録アクションを実行します。");
        // 予定登録の処理を追加
        resVal="予定登録 未実装"
    } else {
        resVal=chatRoleForLE(inputText);
        //console.log("入力が不明なアクションです。");
        //resVal="入力が不明なアクションです。"
    }

    return resVal;
}
function strRes(inDate){
  var wval,resVal="";
  wVal = readSheet(inDate);
  resVal = "" 
    + formatDateToCustomFormat(inDate) 
    + "\n"
    + wVal
    + "\n";
  return resVal;
}
function getSaturday() {
  return getSSday(6 ); // 6 (土曜) 
}
function getSunday() {
  return getSSday(0 ); // 0 (日曜) 
}
function getNextSunday() {
  return getSSday(0+7 ); // 0 (日曜) 
}
function getSSday(ss) {
    var today = new Date();
    var currentDayOfWeek = today.getDay(); // 0 (日曜) から 6 (土曜) までの数値

    // 今週の土曜日の日付を計算
    var daysUntilSaturday = ss - currentDayOfWeek;
    var thisSaturday = new Date(today.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);

    // 来週の土曜日の日付を計算
    var nextSaturday = new Date(thisSaturday.getTime() + 7 * 24 * 60 * 60 * 1000);

    //console.log("今週: " + formatDateToCustomFormat(thisSaturday) + " ["+ thisSaturday.toDateString()+"]");
    //console.log("来週: " + formatDateToCustomFormat(nextSaturday) + " ["+ nextSaturday.toDateString()+"]");
    
    return thisSaturday;
}
function formatDateToCustomFormat(date) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' };
    return date.toLocaleDateString('ja-JP', options);
}
function demSetInfo(inMsg){
  var wMsg = ""
  wMsg = inMsg
  var wDate
  var wSaturFlg,wSunFlg
  var wRegFlg, wJrFlg, wOhFlg
  var wRegMsg, wJrMsg, wOhMsg 
  wSaturFlg = wMsg.indexOf("土曜"); //含まれない場合は-1が返される
  wSunFlg = wMsg.indexOf("日曜");
  
}
