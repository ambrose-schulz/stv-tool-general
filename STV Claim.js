// ==UserScript==
// @name         STV Claim (Optimized UTC+7)
// @namespace    http://tampermonkey.net/
// @version      2025-06-02.6
// @description  Tự động nhặt đồ, gộp chung Công Pháp (type 3) và Võ Kỹ (type 4) trong danh sách
// @author       Ambrose Schulz
// @match        *://sangtacviet.app/truyen/*/1/*/*/
// @match        *://*.sangtacviet.app/truyen/*/1/*/*/
// @match        *://sangtacviet.vip/truyen/*/1/*/*/
// @match        *://*.sangtacviet.vip/truyen/*/1/*/*/
// @match        *://sangtacviet.com/truyen/*/1/*/*/
// @match        *://*.sangtacviet.com/truyen/*/1/*/*/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sangtacviet.app
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function () {
    'use strict';

    /* =================== UTILITY FUNCTIONS =================== */

    const saveSetting = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    };

    const getSetting = (key) => {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
    };

    // [TỐI ƯU]: Lưu thêm tham số 'type' vào localStorage
    const saveItem = (name, type) => {
        const safeName = name ? String(name) : "Vật phẩm ẩn/Lỗi tên";
        const items = JSON.parse(localStorage.getItem("collectedItems")) || [];
        const timestamp = Date.now();
        const index = items.findIndex(item => item.name === safeName);

        if (index !== -1) {
            items[index].timestamp = timestamp;
            items[index].count = (items[index].count || 1) + 1;
            if (type) items[index].type = type; // Bổ sung type nếu trước đó chưa có
        } else {
            items.push({ name: safeName, timestamp, count: 1, type: type });
        }
        localStorage.setItem("collectedItems", JSON.stringify(items));
    };

    const showToast = (message) => {
        let toastContainer = document.getElementById('tm-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'tm-toast-container';
            Object.assign(toastContainer.style, { position: 'fixed', top: '20px', right: '20px', zIndex: 9999 });
            document.body.appendChild(toastContainer);
        }
        const toast = document.createElement('div');
        toast.innerText = message;
        Object.assign(toast.style, {
            background: '#28a745', color: '#fff', padding: '10px 15px', marginTop: '10px',
            borderRadius: '5px', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', opacity: '1',
            transition: 'opacity 0.5s ease'
        });
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    /* =================== UI BUTTONS =================== */

    const createSettingButton = () => {
        const currentSetting = getSetting("autoReload");
        const settingBtn = document.createElement("button");
        settingBtn.id = "settingBtn";
        settingBtn.innerText = "⚙️";

        Object.assign(settingBtn.style, {
            position: "fixed", bottom: "70px", left: "0px", padding: "10px",
            background: currentSetting ? "#28a745" : "#dc3545", color: "#fff",
            border: "none", cursor: "pointer", borderRadius: "5px"
        });

        settingBtn.onclick = toggleAutoReload;
        document.body.appendChild(settingBtn);
    };

    const toggleAutoReload = () => {
        const currentSetting = getSetting("autoReload") || false;
        const newSetting = !currentSetting;
        saveSetting("autoReload", newSetting);
        const settingBtn = document.getElementById('settingBtn');
        if (settingBtn) settingBtn.style.background = newSetting ? "#28a745" : "#dc3545";
        showToast("Chế độ tự động reload khi lỗi: " + (newSetting ? "BẬT" : "TẮT"));
    };

    const createShowButton = () => {
        const showBtn = document.createElement("button");
        showBtn.innerText = "🗃";
        Object.assign(showBtn.style, {
            position: "fixed", bottom: "20px", left: "0px", padding: "10px",
            background: "#007bff", color: "#fff", border: "none", cursor: "pointer", borderRadius: "5px"
        });
        showBtn.onclick = showItemList;
        document.body.appendChild(showBtn);
    };

    function showItemList() {
        const rawData = localStorage.getItem("collectedItems");
        const items = rawData ? JSON.parse(rawData) : [];
        if (items.length === 0) {
            alert("Không có vật phẩm nào!");
            return;
        }

        const grouped = items.reduce((acc, curr) => {
            let key = (curr && curr.name) ? String(curr.name) : "Vật phẩm ẩn/Lỗi tên";

            // [TỐI ƯU]: Gộp nhóm trực tiếp bằng type nếu có
            if (curr.type == 3) {
                key = "Công Pháp (Các loại)";
            } else if (curr.type == 4) {
                key = "Võ Kỹ (Các loại)";
            } else {
                // Xử lý fallback cho các đồ cũ lưu trước đó (hoặc đan dược/linh thạch)
                if (key.includes("Đan")) key = "Đan dược";
                else if (["Kiếm Pháp", "Chưởng", "vũ kỹ", "Thân pháp", "Cước", "Đao"].some(k => key.toLowerCase().includes(k.toLowerCase()))) key = "Võ Kỹ (Các loại)";
                else if (["Tàn quyển", "thần công", "bí kỹ", "bí pháp", "Luyện thể", "Quyết", "Điển", "Công Pháp", "Tâm Pháp"].some(k => key.toLowerCase().includes(k.toLowerCase()))) key = "Công Pháp (Các loại)";
                else if (key.includes("Linh Thạch")) key = "Linh Thạch";
                else if (key.includes("Pháp Tắc")) key = "Pháp Tắc";
            }

            if (!acc[key]) acc[key] = { count: 0, lastTimestamp: 0 };
            acc[key].count += (curr.count || 1);
            if (curr.timestamp > acc[key].lastTimestamp) acc[key].lastTimestamp = curr.timestamp;
            return acc;
        }, {});

        const sortedItems = Object.keys(grouped)
            .map(name => ({ name, count: grouped[name].count, lastTimestamp: grouped[name].lastTimestamp }))
            .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

        let listDiv = document.getElementById("itemList");
        if (listDiv) listDiv.remove();

        listDiv = document.createElement("div");
        listDiv.id = "itemList";
        Object.assign(listDiv.style, {
            position: "fixed", bottom: "60px", left: "20px", padding: "10px", background: "#fff",
            border: "1px solid #ddd", boxShadow: "0px 2px 6px rgba(0,0,0,0.2)", borderRadius: "5px",
            width: "400px", maxHeight: "700px", overflowY: "auto", zIndex: 10000
        });
        document.body.appendChild(listDiv);

        listDiv.innerHTML = "<strong>Danh sách vật phẩm:</strong>\r\n";
        sortedItems.forEach((item, index) => {
            const timeStr = new Date(item.lastTimestamp).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
            listDiv.innerHTML += `<p>${index + 1}. ${item.name} (x${item.count}) - Gần nhất: ${timeStr}</p>`;
        });

        const clearBtn = document.createElement("button");
        clearBtn.innerText = "🗑 Xóa danh sách";
        Object.assign(clearBtn.style, { marginTop: "10px", padding: "5px", background: "#dc3545", color: "#fff", border: "none", cursor: "pointer", borderRadius: "5px" });
        clearBtn.onclick = clearItemList;

        const closeBtn = document.createElement("button");
        closeBtn.innerText = "❌ Đóng";
        Object.assign(closeBtn.style, { marginTop: "10px", marginLeft: "5px", padding: "5px", background: "#6c757d", color: "#fff", border: "none", cursor: "pointer", borderRadius: "5px" });
        closeBtn.onclick = () => { listDiv.style.display = "none"; };

        listDiv.appendChild(clearBtn);
        listDiv.appendChild(closeBtn);
        listDiv.style.display = "block";
    }

    const clearItemList = () => {
        localStorage.removeItem("collectedItems");
        const listDiv = document.getElementById("itemList");
        if (listDiv) listDiv.remove();
        alert("Đã xóa danh sách vật phẩm!");
    };

    /* =================== NETWORK =================== */

    const sendFormData = (url, formData) => {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST", url: url, data: formData,
                onload: (response) => {
                    try { resolve(JSON.parse(response.responseText)); }
                    catch (e) { reject(e); }
                },
                onerror: (error) => { reject(error); }
            });
        });
    };

    /* =================== MAIN LOGIC =================== */

    const pollForItems = async () => {
        const checkData = new FormData();
        checkData.append("ngmar", "tcollect");
        checkData.append("ajax", "trycollect");
        checkData.append("iscollectable", "iscollectable");
        const targetUrl = window.location.origin + "/index.php?ngmar=iscollectable";

        try {
            const check = await sendFormData(targetUrl, checkData);
            if (check.code && check.code === 1) {
                const url = window.location.origin + "/index.php";
                const itemData = new FormData();
                itemData.append("ngmar", "collect");
                itemData.append("ajax", "collect");

                const item = await new Promise(resolve => setTimeout(() => {
                    sendFormData(url, itemData).then(resolve).catch(() => resolve(null));
                }, 1000));

                if (item && item.type) {
                    const claimData = new FormData();
                    const lastStr = window.location.href.replace(/\/$/, "").split("/").pop();
                    claimData.append("ajax", "fcollect");
                    claimData.append("c", lastStr);

                    let finalName = item.name ? item.name.replace(/<[^>]*>/g, '').trim() : '';
                    let finalInfo = item.info ? item.info.replace(/<[^>]*>/g, '').trim() : '';

                    if (item.type == 3 || item.type == 4) {
                        if (finalName.indexOf('Công Pháp') >= 0) {
                            finalName = 'Vĩnh Hằng Ma Thiên Lục';
                            finalInfo = `Ma thiên nhất lục trấn huyền tông,
                            Quán cổ thông kim khí tự long.
                            Huyết dẫn hoàng tuyền khai tuệ mạch,
                            Hồn quy thái cực luyện thần phong.
                            Tâm dung vạn tượng phi sinh diệt,
                            Thức phá thiên ma ngộ sắc không.
                            Bất diệt bất sinh hà vấn đạo,
                            Vĩnh Hằng nguyên tại ngã tâm trung.
                            ` + finalInfo;
                        }
                        else if (finalName.indexOf('Tàn quyển') >= 0) {
                            finalName = 'Vĩnh Hằng Chân Đồ';
                            finalInfo = `Cửu thiên rớt xuống nửa trang thư,
                            Nét chữ mờ phai, lửa tận hư.
                            Một góc xiêm y còn đọng khí,
                            Ba dòng tâm pháp đã tiêu từ.
                            Kẻ tu lạc lối tìm chân tướng,
                            Người ngộ thương cung lạc cõi bờ.
                            Nếu hỏi Vĩnh Hằng sao khuyết bóng,
                            Tàn chương vô tự mới là mơ.
                            ` + finalInfo;
                        }
                        else if (finalName.indexOf('Công kích vũ kỹ') >= 0) {
                            finalName = 'Phá Thiên Cửu Thức Thương';
                            finalInfo = `Nhất thương phá giới động càn khôn
                            Cửu thức liên hoàn diệt quỷ hồn
                            Thế tự lưu tinh xuyên vạn vật
                            Khí như lôi điện chấn thiên môn
                            Phong vân tụ hội thân như ảnh
                            Nhật nguyệt luân hồi huyết hóa tồn
                            Sát khí trùng thiên kinh vạn cổ
                            Đồ long diệt thánh lập uy tôn
                            ` + finalInfo;
                        }
                        else if (finalName.indexOf('Công kích bí kỹ') >= 0) {
                            finalName = 'Xạ Nhật Thần Cung';
                            finalInfo = `Thần cung huyết huyễn quán hằng tinh
                            Nhất tiễn xuyên phá cửu trùng minh
                            Vãn nguyệt vi dực xuyên thiên giới
                            Dẫn tâm vi diễm phần quỷ thành
                            Huyền nhất thanh thiên địa động
                            Trùng quang thiểm thước nhật hà kinh
                            Vô hình tiễn khí khu sinh tử
                            Duy lưu thiên nam đại bàng hình.
                            ` + finalInfo;
                        }
                        else if (finalName.indexOf('Thân pháp') >= 0) {
                            finalName = 'Huyễn Ảnh Thần Tung';
                            finalInfo = `Vạn lý trường đồ vạn lý trần
                            Thân như ảnh mạc huyễn nhân
                            Phong vân tùy ý thi triển diệu
                            Bá giả phiêu dao nhập khách trần.
                            ` + finalInfo;
                        }
                        else if (finalName.indexOf('Tinh thần bí pháp') >= 0) {
                            finalName = 'Nhiếp Hư Thần Niệm';
                            finalInfo = `Thần du thái hư phá mê tân
                            Tróc nguyệt vu thiên, cầm quỷ thần
                            Nhất niệm vô thanh tham cửu u
                            Thiên tâm hữu ảnh chiếu mê tâm
                            Hư không đạp lãng tầm chân ngã
                            Vũ trụ tuần hoàn định phách linh
                            Thùy vị thần niệm vô sát lực
                            Vị tằng tiếp xứ vô biên minh.
                            ` + finalInfo;
                        }
                        else if (finalName.indexOf('Luyện thể thần công') >= 0) {
                            finalName = 'Thần Tượng Kinh';
                            finalInfo = `Đại Tượng Vô Hình Tượng Thiên Tượng
                            Chân Tượng Vô Tâm Tượng Tượng Nguyên
                            ` + finalInfo;
                        }
                        else if (finalName.indexOf('Luyện thể công pháp') >= 0) {
                            finalName = 'Linh Cốt Luyện Thể Pháp';
                            finalInfo = `Thân thể dĩ Linh khí luyện hóa
                            Cốt cách dĩ Linh khí ma luyện
                            Toàn thân linh lực cuồn cuộn, 
                            Bách khiếu linh khí thông suốt, 
                            Tâm thần hằng định, 
                            Mệnh mạch trường tồn, 
                            Cửu khiếu linh thông, 
                            Bách mạch thông lưu, 
                            Bách mạch linh thông.
                            ` + finalInfo;
                        }
                        else if (finalName.indexOf('Phòng ngự vũ kỹ') >= 0) {
                            finalName = 'Thiên Cương Hộ Thể Thuẫn';
                            finalInfo = `Thiên Cương mười tám trận,
                            Hỗn Độn sáu mươi bốn thế. 
                            Dịch chuyển bốn phương là "Thiên "
                            Khí phách tung hoành là "Cương"
                            Nhất khí hóa tam thanh, tam thanh sinh vạn vật
                            Ngũ hành tương sinh, tương khắc
                            Kình lực tuần hoàn, vô cùng vô tận
                            Cương khí nương theo thân pháp, uy vũ vô song
                            ` + finalInfo;
                        }

                        claimData.append("newname", finalName);
                        claimData.append("newinfo", finalInfo);
                    }

                    if (!finalName) finalName = "Vật phẩm vô danh";

                    const fcollect = await new Promise(resolve => setTimeout(() => {
                        sendFormData(url + "?ngmar=fcl", claimData).then(resolve).catch(() => resolve(null));
                    }, 1000));

                    if (fcollect && fcollect.code && fcollect.code === 1) {
                        // [TỐI ƯU]: Gửi kèm item.type để lưu vào bộ nhớ
                        saveItem(finalName, item.type);
                        showToast("Bạn đã nhận được: " + finalName);
                    } else {
                        showToast("Lỗi nhặt vật phẩm!");
                        if (getSetting("autoReload")) setTimeout(() => location.reload(), 3000);
                    }
                } else {
                    showToast("Lỗi lấy thông tin vật phẩm!");
                    if (getSetting("autoReload")) setTimeout(() => location.reload(), 3000);
                }
            }
        } catch (e) { console.error(e); }

        const button = document.querySelector('.btn.btn-info');
        if (button && button.innerText === "Nhặt bảo") button.remove();
    };

    /* =================== INIT =================== */
    createShowButton();
    createSettingButton();
    setInterval(pollForItems, 30000);

})();
