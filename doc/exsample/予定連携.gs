function myFunction2(){
  result = readSheet(targetDate);
  console.log("Result: " + result);

  setDataSheet(targetDate, result+"\n A")
} 

function readSheet(inTargetDate) {
  var spreadshee=null;
  try {
    // スプレッドシートを取得
    spreadsheet = SpreadsheetApp.openByUrl(spseetURL);
  } catch (error) {
    return "openエラー: " + error;
  }
  try{
    // シートを取得
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      return "エラー: シートが見つかりません:"+sheetName;  
    }

    // 1列目の日付を検索する例（ここをカスタマイズしてください）
    const rowNumber = findRow(sheet, inTargetDate);
    if (rowNumber) {
      const valueInSecondColumn = sheet.getRange(rowNumber, 2).getValue();
      return  valueInSecondColumn;
    } else {
      return "";
    }
  } catch (error) {
    return "readエラー: " + error;
  } finally {
    //Closeメソッドがない。
  }
}

// 日付をキーに行番号を検索する関数
function findRow(sheet, targetDate) {
  var lastRow = sheet.getLastRow();
  //Logger.log("lastRow:"+lastRow);
  const values = sheet.getRange(1, 1, lastRow+1).getValues();
  for (let i = 0; i < values.length; i++) {
    const rowDate = values[i][0]; // 1列目の日付を仮定
    //Logger.log("Val : " + rowDate );
    if (rowDate instanceof Date && rowDate.toDateString() === targetDate.toDateString()) {
      //Logger.log("Date : " + rowDate.toDateString() );
      return i + 1; // 行番号は1から始まるため、+1する
    }
  }
  return null; // 該当する行がない場合はnullを返す
}


function setDataSheet(inTargetDate , inTargetVal) {
  var spreadshee=null;
  try {
    // スプレッドシートを取得
    spreadsheet = SpreadsheetApp.openByUrl(spseetURL);
  } catch (error) {
    return "openエラー: " + error;
  }
  try{
    // シートを取得
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      return "エラー: シートが見つかりません:"+sheetName;  
    }

    // 1列目の日付を検索する例（ここをカスタマイズしてください）
    const rowNumber = findRow(sheet, inTargetDate);
    if (rowNumber) {
      // Hitした場合は上書き
      console.log("すでにある bef:"+sheet.getRange(rowNumber, 2).getValue() + " aft:"+inTargetVal);
    }else{
      rowNumber = sheet.getLastRow()+1;
    }
    sheet.getRange(rowNumber, 2).setValue(inTargetVal);
    return rowNumber;
  } catch (error) {
    return "readエラー: " + error;
  } finally {
    //Closeメソッドがない。
  }
}

// Example usage:
 const spseetURL = "https://docs.google.com/spreadsheets/d/1h7s8SM40k6ZCTEe3dz9Lp3e4rYt42RkNoSzFJv3bCNA/edit";
 const sheetName = "LE"; // スプレッドシートのシート名
 const targetDate = new Date("2023-05-21"); // Replace with the desired date
// const result = getDataByDate(sheetName, targetDate);
// Logger.log("Result: " + result);

