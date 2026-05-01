function myFunctionGpt() {
  console.info("start");

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 月は0から始まるため+1
  const day = today.getDate();
  const formattedDate = year + "-" + month + "-" + day;

  // "今日は" +  month + "月" + day +  "日です。日付を出力して、" +  month + "月" + day +  "日の記念日としているトピックを5つ教えて"
  // トピックはうそばっかりなので、タイムリーなものを聞くのは向かないですね。
  res = chatRoleForHisyo('今日も一日前向きに頑張れるような言葉をください。1から3のテーマのどれかをランダムで選んで回答ください。' + 
    '1.部下に元気がでるような朝の挨拶の声掛けのサンプルを3つください。' +
    '2.落ち込んだ時に元気がでるような気持ちの作り方のサンプルを3つください。' + 
    '3.野球または少年野球に関するランダムな雑学を3つください。' 
    );
  console.info("end : " + res);
}
function helthCheckMyPJ(){
  //このプロジェクトが生きてるか確認するトリガー
  res = chatRoleForHisyo('今日も一日前向きに頑張れるような言葉をください。1から3のテーマのどれかをランダムで選んで回答ください。\n' + 
    '1.部下に元気がでるような朝の挨拶と雑学の声掛けのサンプルを3つください。\n' +
    '2.落ち込んだ時に元気がでるような気持ちの作り方のサンプルを3つください。\n' + 
    '3.野球または少年野球に関するランダムな雑学を3つください。' 
    );
  doPushSyu(res);
}
function chatRoleForLE(message){
  return chatWithGPT('あなたは少年野球の少年や保護者の気軽な相談相手です。',message);
}
function chatRoleForHisyo(message){
  return chatWithGPT('あなたは秘書です。シンプルに回答できます。',message);
}
function chatWithGPT(role,message) {
    // スクリプトプロパティに設定したOpenAIのAPIキーを取得
    const apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
    
    // 文章生成AIのAPIのエンドポイントを設定
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    // 文章生成AIに投げるテキスト（プロンプト）を定義
    prompt = '最初の挨拶やかしこまりましたは不要。以下のメッセージに応答してください。' + '\n';
    
    prompt = prompt + message;
    // OpenAIのAPIリクエストに必要なヘッダー情報を設定
    const headers = {
        'Authorization': 'Bearer ' + apiKey,
        'Content-type': 'application/json',
        'X-Slack-No-Retry': 1
    };
    //var role = 'あなたは少年野球の少年や保護者の気軽な相談相手です。'
    //var role = 'You are a casual and approachable person for boys and their parents in a youth baseball league to consult with.'
    var model = 'gpt-4o-mini'
    if (message.includes("詳しく") || message.includes("具体")|| message.includes("詳細")) {
      model = 'gpt-4o'
    }
    // 文章生成で利用するモデルやトークン上限、プロンプトをオプションに設定
    const options = {
        'method': 'post',
        'headers': headers,
        'payload': JSON.stringify({
            //'model': 'gpt-3.5-turbo',
            'model': model,
            "messages": [
            { "role": "system",
              "content": role
            },
            { "role": "user",
              "content": prompt
            }
            ]
        })
    };
  try { // Try, Catchを使ってより安全に
    // OpenAIの文章生成（Completion）にAPIリクエストを送り、結果を変数に格納
    const response = JSON.parse(UrlFetchApp.fetch(apiUrl, options).getContentText())

    // OpenAIのAPIレスポンスをログ出力
    console.log(message + "\n" + response);
    var ret = response['choices'][0]['message']['content'].trim();

  } catch (e) {
    ret += "[Error] "+ e.message; // エラー文字列が不要な場合はこちらをコメントアウト
    console.log(ret);
  }
  return ret;
}

