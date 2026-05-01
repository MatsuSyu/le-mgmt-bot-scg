function myFunction4() {
  logToSheetNoUser('メッセージ①','メッセージ②');
}
  // スプレッドシートのID
  const spseetURLlog = 'https://docs.google.com/spreadsheets/d/1wHWlQqzPFRiJK27TBSHULpUozvihm9i97tCQJqnYt4E/';
  const sheetNamelog = 'log'; // ログを記録するシート名

//ログ出力
function logToSheet(user,message1,message2) {
  
  try{
    // スプレッドシートを取得
    var sheet = SpreadsheetApp.openByUrl(spseetURLlog);
    if (!sheet) {
      throw new Error('シートが見つかりません'+spseetURLlog+'/'+sheetNamelog);
    }
  } catch (error) {
    return "openエラー: " + error;
  }
  // ログデータ
  var now = new Date();

  // 最終行にログを追加
  var lastRow = sheet.getLastRow();

  var logData = [now, user, message1, message2];
  var csvData = logData.join(",") + "\n";
  Logger.log(csvData);
  sheet.appendRow(logData);
}
//ログ出力
function logToSheetNoUser(message1,message2) {
  var user = Session.getActiveUser().getEmail(); // 現在のユーザーのメールアドレスを取得
  logToSheet(user,message1,message2);
}