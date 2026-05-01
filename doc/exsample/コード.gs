// LINEボットからの応答メッセージを作成する関数
function createResponseMessage(json,groupFlg,userId,event) {
  let responseMessage = ""; // デフォルトの応答メッセージ
  let userMessage = '';

  //グループトークの場合はメンションされている場合だけ確認します
  if( event.message.type = 'text' && "text" in event.message ){
    try {
      //console.log("con req :" + event);
      userMessage = event.message.text; // ユーザーからのメッセージ

    } catch (e) {
      console.error('エラー e=' + e.fileName + '[' +e.lineNumber + ']: ' + e.message + ' e.stack: ' + e.stack);
      //responseMessage += " [Error] "+ e.message; // エラー文字列が不要な場合はこちらをコメントアウト
      throw e;
    }

  }else{
    responseMessage = " ごめんね。テキストだけのサポートだよ。画像やスタンプはわからないよ。"
  }
  //個別か、グループの場合は名前がメッセージに含まれている場合（メンションされている場合）のみ回答するよ
  if( !groupFlg || (groupFlg && userMessage.includes("@LE"))){

    // ユーザーからのメッセージに応じて適切な応答メッセージを作成
    if (userMessage.includes("こんにちは")) {
      responseMessage = "こんにちは！どうしましたか？";
    } else if (userMessage.includes("お疲れ様")) {
      responseMessage = "お疲れ様です！";
    // } else if (userMessage.includes("ありがとう")) {
    //   responseMessage = "どういたしまして！";
    } else {
      //ChatGPTで返信を考えてもらうよ
      responseMessage = determineAction(userMessage);
      
      if (userMessage.includes("LEとは")) {
        responseMessage = 'LEとは「リトルイーグルス」のつもりだよ。ちなみにChatGPTではこう回答きたよ。\n' + responseMessage;
      }
    }
    logToSheet(userId,userMessage,responseMessage);
  } else if (userMessage.startsWith("ログ")) {
    try{
      logToSheet(userId,"[ログ出力]"+userMessage,JSON.stringify( json ));
    } catch (e) {
      console.error('エラー e=' + e.fileName + '[' +e.lineNumber + ']: ' + e.message + ' e.stack: ' + e.stack);
      //responseMessage += " [Error] "+ e.message; // エラー文字列が不要な場合はこちらをコメントアウト
      throw e;
    }
  }else{
    responseMessage = ''
  }
  return responseMessage;
}

// LINE Messaging APIからのリクエストを処理する関数
function doPost(e) {
  const json = JSON.parse(e.postData.contents);
  const events = json.events;
  var userId =''
  var groupId = ''
  var groupFlg = false;
  var fetchFlg = false;
  try{
    try{
      userId=events[0].source.userId;
      userId=getUserName(userId);
    }catch(error){
      userId ="[Error]"+ error.message + '\n' + error.stack;
    }
    try{
      groupFlg=("group" == events[0].source.type);
      groupId=events[0].source.groupId;
    }catch(error){
      //なにもしない
    }
    // イベントごとに応答メッセージを作成
    const responses = events.map((event) => {
      var responseMessage =''
      try{
        responseMessage = createResponseMessage(json,groupFlg,userId, event);
      }catch(error){
        logToSheet(userId,'[Error]なにかエラー\n'+error.message+ '\n'+error.stack,JSON.stringify( json ));
        responseMessage="ごめん。なにかエラーです。[Error]"  + e.message;
      }
      if( '' != responseMessage){
        //応答メッセージがあれば返す
        fetchFlg = true;
        return {
          type: "text",
          text: responseMessage,
          replyToken: event.replyToken,
        };
      }
    });

    if(fetchFlg){
      // 応答メッセージをLINEに送信
      const headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      };
      const payload = {
        replyToken: events[0].replyToken,
        messages: responses,
      };
      const options = {
        method: "post",
        headers: headers,
        payload: JSON.stringify(payload),
      };
      UrlFetchApp.fetch(replyUrl, options);
    }
  }catch(error){
    logToSheet(userId,"[Error]"+error.message+ error.stack,JSON.stringify( json ));
  }
}
  const replyUrl = "https://api.line.me/v2/bot/message/reply";
  const accessToken = "JTY4W+MuHI3K7smHbhmLb5pD4pb+11rZvw7TgVxwSiP/xmf3iGWeSqjeiePFbOHmQsAKHxKv+RhBjeIMcTJJ0uy/0ahkOhcoey+6k/05ND1p0+nTSuottC5dx/t/crKBzNpTDbVT3fowcneM80jZ+gdB04t89/1O/w1cDnyilFU=";
function getACT(){
  return accessToken;
}
// doPostの呼び出し
function doPostTest() {

  let e = {
    "message": {
      "text": "外部アプリから送られたテキスト",
      "type": "text",
      "id": 12345678
    },
  };

  doPost(e);
}

