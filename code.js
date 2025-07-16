const DATA_ENTRY_SHEET_NAME = "Data";
const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_ENTRY_SHEET_NAME);

// Cấu hình ánh xạ key form <-> tiêu đề cột
const HEADERS = [
  { key: "name", value: "HỌ VÀ TÊN" },
  { key: "date", value: "NĂM SINH" },
  { key: "position", value: "CHỨC VỤ" },
  { key: "village", value: "THÔN" },
  { key: "ethnicity", value: "DÂN TỘC" },
  { key: "phone", value: "SỐ ĐIỆN THOẠI" },

];

/**
 * Xử lý POST request từ form HTML
 */
function doPost(request) {
  try {
    const contents = request.postData.contents;
    const data = parseFormData(contents); // dữ liệu dạng object { name: '...', date: '...' }
    appendToGoogleSheet(data);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Phân tích dữ liệu x-www-form-urlencoded
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
 * Ghi dữ liệu vào Google Sheet theo đúng cột
 */
function appendToGoogleSheet(data) {
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = {};
  
  // Map tiêu đề -> index cột
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
