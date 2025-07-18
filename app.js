const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbyLiqJO8WbeZOd3tjKvcVtvtQcU4QwS6UqYU8GDa1iBAQ_U14LIF1BUg4_uyvmZVQGpBA/exec";

$("#birthdate").datepicker({
  format: "dd/mm/yyyy",
  endDate: "0d",
  autoclose: true,
  todayHighlight: true,
  language: "vi",
});

// Viết hoa tự động các trường name, village, ethnicity
["name", "village", "ethnicity"].forEach((id) => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase();
    });
  }
});

// Tự động thêm dấu '/' cho ngày sinh
const birthdateInput = document.getElementById("birthdate");
birthdateInput.addEventListener("input", function () {
  let val = this.value.replace(/[^\d]/g, "");
  if (val.length > 2 && val.length <= 4) {
    val = val.slice(0, 2) + "/" + val.slice(2);
  } else if (val.length > 4) {
    val = val.slice(0, 2) + "/" + val.slice(2, 4) + "/" + val.slice(4, 8);
  }
  this.value = val;
});

document.getElementById("dataForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const messageEl = document.getElementById("message");
  const submitBtn = document.getElementById("submit-button");
  let valid = true;

  messageEl.style.display = "none";

  // Xóa lỗi cũ
  form.querySelectorAll(".error-msg").forEach((el) => (el.textContent = ""));
  form
    .querySelectorAll("input, select")
    .forEach((el) => el.classList.remove("error"));

  // Kiểm tra các trường bắt buộc
  const requiredFields = [
    "name",
    "date",
    "gender",
    "position",
    "village",
    "ethnicity",
    "phone",
  ];
  requiredFields.forEach((key) => {
    const input =
      key === "date"
        ? document.getElementById("birthdate")
        : document.getElementById(key);
    const errorDiv = input.closest(".field").querySelector(".error-msg");
    let value = formData.get(key);
    if (!value || !value.trim()) {
      valid = false;
      input.classList.add("error");
      errorDiv.textContent = "Trường này không được để trống.";
    }
  });

  // Kiểm tra số điện thoại
  const phoneInput = document.getElementById("phone");
  const phoneError = phoneInput.closest(".field").querySelector(".error-msg");
  const phoneVal = formData.get("phone");
  if (phoneVal && !/^[0-9]{10,11}$/.test(phoneVal)) {
    valid = false;
    phoneInput.classList.add("error");
    phoneError.textContent = "Số điện thoại phải từ 10 đến 11 chữ số.";
  }

  // Kiểm tra ngày sinh và tuổi >= 16
  const birthStr = formData.get("date");
  const birthInput = document.getElementById("birthdate");
  const birthError = birthInput.closest(".field").querySelector(".error-msg");
  if (birthStr && birthStr.trim()) {
    const parts = birthStr.split("/");
    if (parts.length !== 3) {
      valid = false;
      birthInput.classList.add("error");
      birthError.textContent = "Ngày sinh không đúng định dạng dd/mm/yyyy.";
    } else {
      const [d, m, y] = parts.map(Number);
      if (
        isNaN(d) ||
        isNaN(m) ||
        isNaN(y) ||
        d < 1 ||
        d > 31 ||
        m < 1 ||
        m > 12 ||
        y < 1900
      ) {
        valid = false;
        birthInput.classList.add("error");
        birthError.textContent = "Ngày sinh không hợp lệ.";
      } else {
        const birthDate = new Date(y, m - 1, d);
        if (
          birthDate.getDate() !== d ||
          birthDate.getMonth() !== m - 1 ||
          birthDate.getFullYear() !== y
        ) {
          valid = false;
          birthInput.classList.add("error");
          birthError.textContent = "Ngày sinh không hợp lệ.";
        } else {
          const today = new Date();
          let age = today.getFullYear() - y;
          if (
            today.getMonth() < m - 1 ||
            (today.getMonth() === m - 1 && today.getDate() < d)
          ) {
            age--;
          }
          if (age < 16) {
            valid = false;
            birthInput.classList.add("error");
            birthError.textContent = "Phải từ 16 tuổi trở lên.";
          }
        }
      }
    }
  }

  if (!valid) {
    messageEl.textContent =
      "❌ Vui lòng kiểm tra và điền đầy đủ thông tin hợp lệ.";
    messageEl.style.color = "red";
    messageEl.style.display = "block";
    return;
  }

  messageEl.textContent = "Đang gửi dữ liệu...";
  messageEl.style.color = "#333";
  messageEl.style.display = "block";
  submitBtn.disabled = true;

  // Chuẩn bị dữ liệu gửi lên Google Sheets
  const keyValuePairs = [];
  for (const [key, value] of formData.entries()) {
    let upperValue = typeof value === "string" ? value.toUpperCase() : value;
    if (key === "phone") upperValue = "'" + upperValue; // giữ số 0 đầu
    keyValuePairs.push(
      encodeURIComponent(key) + "=" + encodeURIComponent(upperValue)
    );
  }

  fetch(WEBAPP_URL, {
    method: "POST",
    body: keyValuePairs.join("&"),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        messageEl.textContent = "✅ Gửi thành công!";
        messageEl.style.color = "green";
        form.reset();
      } else {
        throw new Error(data.message || "Đã có lỗi xảy ra.");
      }
    })
    .catch((err) => {
      messageEl.textContent = "❌ Gửi thất bại: " + err.message;
      messageEl.style.color = "red";
    })
    .finally(() => {
      submitBtn.disabled = false;
      setTimeout(() => {
        messageEl.style.display = "none";
      }, 4000);
    });
});

let dataCache = [];

document.getElementById('viewListBtn').onclick = () => {
  document.getElementById('formSection').style.display = 'none';
  document.getElementById('tableSection').style.display = 'block';
  loadFromLocalStorage();
  fetchAndRender(); // <-- Hàm này lấy dữ liệu mới từ Google Sheets
};

document.getElementById("backBtn").onclick = () => {
  document.getElementById("tableSection").style.display = "none";
  document.getElementById("formSection").style.display = "block";
};

document.getElementById("searchInput").addEventListener("input", function () {
  const q = this.value.trim().toUpperCase();

  document.querySelectorAll("#tableBody tr").forEach((tr) => {
    const nameInput = tr.querySelector('input[data-field="name"]');
    const name = nameInput?.value?.toUpperCase() || "";

    if (name.includes(q)) {
      tr.style.display = "";
    } else {
      tr.style.display = "none";
    }
  });
});

const ROLE_OPTIONS = ["TỔ TRƯỞNG", "TỔ PHÓ", "THÀNH VIÊN"];

// Format ngày sinh về dd/mm/yyyy
function formatDate(d) {
  if (!d || typeof d !== "string") return "";
  const parts = d.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (
      !isNaN(day) &&
      !isNaN(month) &&
      !isNaN(year) &&
      day.length <= 2 &&
      month.length <= 2 &&
      year.length === 4
    ) {
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
  }
  return d; // nếu là định dạng khác, cứ trả về nguyên
}

// Render danh sách
function renderTable(data) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">Không có dữ liệu</td></tr>`;
    return;
  }

  data.forEach((item, index) => {
    const tr = document.createElement("tr");
    const date = formatDate(item.date);

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td><input data-index="${index}" data-field="name" value="${
      item.name
    }" /></td>
      <td><input data-index="${index}" data-field="date" value="${date}" /></td>
      <td>
        <select data-index="${index}" data-field="gender">
          <option value="Nam" ${
            item.gender === "Nam" ? "selected" : ""
          }>Nam</option>
          <option value="Nữ" ${
            item.gender === "Nữ" ? "selected" : ""
          }>Nữ</option>
        </select>
      </td>
      <td>
        <select data-index="${index}" data-field="position">
          ${ROLE_OPTIONS.map(
            (role) =>
              `<option value="${role}" ${
                item.position === role ? "selected" : ""
              }>${role}</option>`
          ).join("")}
        </select>
      </td>
      <td><input data-index="${index}" data-field="village" value="${
      item.village
    }" /></td>
      <td><input data-index="${index}" data-field="ethnicity" value="${
      item.ethnicity
    }" /></td>
      <td><input data-index="${index}" data-field="phone" value="${
      item.phone
    }" /></td>
      <td><button class="save-btn btn btn-success btn-sm" data-index="${index}">Lưu</button></td>
    `;
    tbody.appendChild(tr);
  });

  bindSaveButtons(data);
}

// Gắn sự kiện cho các nút "Lưu"
function bindSaveButtons(data) {
  document.querySelectorAll(".save-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.getAttribute("data-index"), 10);
      const row = document.querySelectorAll("#tableBody tr")[index];
      const inputs = row.querySelectorAll("input, select");

      const updatedData = {
        rowIndex: index + 2,
      };

      inputs.forEach((input) => {
        const field = input.getAttribute("data-field");
        updatedData[field] = input.value.toUpperCase();
      });

      fetch(WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(updatedData),
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.status === "success") {
            alert("✅ Lưu thành công!");
            // Cập nhật localStorage
            data[index] = updatedData;
            localStorage.setItem("dataCache", JSON.stringify(data));
          } else {
            alert("❌ Lỗi: " + json.message);
          }
        })
        .catch((err) => {
          alert("❌ Kết nối thất bại: " + err.message);
        });
    });
  });
}

// Tải dữ liệu từ localStorage
function loadFromLocalStorage() {
  try {
    const cache = localStorage.getItem("dataCache");
    if (cache) {
      const parsed = JSON.parse(cache);
      renderTable(parsed);
    }
  } catch (e) {
    console.warn("Không thể tải từ localStorage");
  }
}

// Tải dữ liệu từ Google Sheet
function fetchAndRender() {
  fetch(WEBAPP_URL + "?mode=read")
    .then((res) => res.json())
    .then((data) => {
      localStorage.setItem("dataCache", JSON.stringify(data));
      renderTable(data);
    })
    .catch((err) => {
      console.error("Không thể tải dữ liệu:", err.message);
    });
}

// Khởi động
loadFromLocalStorage();
