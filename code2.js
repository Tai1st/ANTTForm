const DATA_ENTRY_SHEET_NAME = "Data";
const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_ENTRY_SHEET_NAME);

// Cấu hình ánh xạ key form <-> tiêu đề cột
const HEADERS = [
  { key: "name", value: "HỌ VÀ TÊN" },
  { key: "date", value: "NĂM SINH" },
  { key: "gender", value: "GIỚI TÍNH" },
  { key: "position", value: "CHỨC VỤ" },
  { key: "village", value: "THÔN" },
  { key: "ethnicity", value: "DÂN TỘC" },
  { key: "phone", value: "SỐ ĐIỆN THOẠI" },
];

/**
 * Xử lý POST request từ form HTML
 * - Thêm mới hoặc cập nhật tùy có rowIndex hay không
 */
function doPost(request) {
  try {
    const contents = request.postData.contents;
    const data = parseFormData(contents);

    if (data.rowIndex) {
      updateRowInGoogleSheet(data);
    } else {
      appendToGoogleSheet(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}

/**
 * Xử lý GET request
 * - mode=read: trả về toàn bộ dữ liệu JSON
 */
function doGet(e) {
  const mode = e.parameter.mode || "";
  if (mode === "read") {
    try {
      const data = getAllData();
      return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader("Access-Control-Allow-Origin", "*");
    } catch (error) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader("Access-Control-Allow-Origin", "*");
    }
  }
  return ContentService.createTextOutput("OK").setHeader("Access-Control-Allow-Origin", "*");
}

/**
 * Phân tích dữ liệu x-www-form-urlencoded thành object
 */
function parseFormData(postData) {
  const data = {};
  const parameters = postData.split("&");
  parameters.forEach(param => {
    const [key, value = ""] = param.split("=");
    data[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
  });
  return data;
}

/**
 * Thêm mới một dòng dữ liệu vào Sheet
 */
function appendToGoogleSheet(data) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = {};

  headerRow.forEach((title, index) => {
    headerMap[title.trim()] = index;
  });

  const rowData = new Array(headerRow.length).fill("");

  HEADERS.forEach(({ key, value }) => {
    if (headerMap[value] !== undefined) {
      rowData[headerMap[value]] = data[key] || "";
    }
  });

  sheet.appendRow(rowData);
}

/**
 * Cập nhật một dòng dữ liệu trong Sheet
 * rowIndex: số dòng trong sheet (>=2)
 */
function updateRowInGoogleSheet(data) {
  const rowIndex = parseInt(data.rowIndex, 10);
  if (isNaN(rowIndex) || rowIndex < 2) {
    throw new Error("rowIndex không hợp lệ");
  }

  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = {};

  headerRow.forEach((title, index) => {
    headerMap[title.trim()] = index;
  });

  const rowData = sheet.getRange(rowIndex, 1, 1, headerRow.length).getValues()[0];

  HEADERS.forEach(({ key, value }) => {
    if (headerMap[value] !== undefined && data[key] !== undefined) {
      rowData[headerMap[value]] = data[key];
    }
  });

  sheet.getRange(rowIndex, 1, 1, headerRow.length).setValues([rowData]);
}

/**
 * Lấy toàn bộ dữ liệu dưới dạng mảng object theo HEADERS
 */
function getAllData() {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dataRows = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  return dataRows.map(row => {
    const obj = {};
    HEADERS.forEach(({ key, value }) => {
      const colIndex = headerRow.indexOf(value);
      obj[key] = colIndex >= 0 ? row[colIndex] : "";
    });
    return obj;
  });
}
